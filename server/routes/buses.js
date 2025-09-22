const router = require('express').Router();
const Bus = require('../models/bus.model');
const crypto = require('crypto');

// --- In-Memory Cache for the main GET / route ---
let cache = { etag: null, payload: null, ts: 0 };
const CACHE_TTL = 1000; // 1 second cache

// Helper function to safely escape regex characters
function escapeRegex(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper to calculate ETAs for stops
async function calculateStopETAs(bus) {
  if (!bus.stops || !bus.stops.length) return [];
  
  const etas = [0]; // Starting point has 0 ETA
  let totalDuration = 0;
  
  // Calculate ETA for each stop based on distance and average speed (60 km/h)
  for (let i = 1; i < bus.stops.length; i++) {
    const prevStop = bus.stops[i-1];
    const currStop = bus.stops[i];
    
    if (prevStop.coords && currStop.coords) {
      const distance = haversineKm(
        [prevStop.coords[1], prevStop.coords[0]],
        [currStop.coords[1], currStop.coords[0]]
      );
      
      // Assume average speed of 60 km/h (1 km/min)
      const duration = Math.round(distance * 1.2); // Add 20% buffer
      totalDuration += duration;
      etas.push(totalDuration);
    } else {
      // If no coordinates, estimate based on equal distribution
      const avgDuration = Math.round(bus.routeProfile?.mapboxDuration / (bus.stops.length - 1));
      totalDuration += avgDuration || 15; // Default to 15 minutes if no duration available
      etas.push(totalDuration);
    }
  }
  
  return etas;
}


// --- API ROUTES ---

// GET all locations
router.get('/locations/all', async (req, res) => {
  try {
    const buses = await Bus.find({}).select('source.name destination.name stops.name').lean();
    const locations = new Set();
    
    buses.forEach(bus => {
      if (bus.source?.name) locations.add(bus.source.name);
      if (bus.destination?.name) locations.add(bus.destination.name);
      bus.stops?.forEach(stop => {
        if (stop.name) locations.add(stop.name);
      });
    });
    
    res.json({ locations: Array.from(locations).sort() });
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Search buses by route
router.get('/search/route', async (req, res) => {
  try {
    const { source, destination } = req.query;
    if (!source || !destination) {
      return res.status(400).json({ error: 'Source and destination are required' });
    }

    // Find buses that go from source to destination (direct or with stops)
    const buses = await Bus.find({
      $or: [
        { 'source.name': new RegExp(escapeRegex(source), 'i') },
        { 'stops.name': new RegExp(escapeRegex(source), 'i') }
      ]
    }).lean();

    // Filter buses that go to the destination (direct or with stops)
    const filteredBuses = buses.filter(bus => {
      // Check if bus goes to destination
      const goesToDestination = 
        (bus.destination?.name && new RegExp(escapeRegex(destination), 'i').test(bus.destination.name)) ||
        (bus.stops?.some(stop => new RegExp(escapeRegex(destination), 'i').test(stop.name)));
      
      // Check if source comes before destination
      const allStops = [
        { ...bus.source, isSource: true },
        ...(bus.stops || []).map(s => ({ ...s, isStop: true })),
        { ...bus.destination, isDestination: true }
      ].filter(Boolean);

      const sourceIndex = allStops.findIndex(s => 
        s.name && new RegExp(escapeRegex(source), 'i').test(s.name)
      );
      
      const destIndex = allStops.findIndex(s => 
        s.name && new RegExp(escapeRegex(destination), 'i').test(s.name)
      );

      return goesToDestination && sourceIndex >= 0 && destIndex > sourceIndex;
    });

    // Process each bus to add ETAs and status
    const processedBuses = await Promise.all(filteredBuses.map(async (bus) => {
      // Calculate current stop index based on last known location
      const currentStopIndex = bus.currentStopIndex ?? -1;
      
      // Calculate ETAs for each stop
      const stopETAs = await calculateStopETAs(bus);
      
      // Determine next stop info
      let nextStopInfo = null;
      if (currentStopIndex < (bus.stops?.length || 0) - 1) {
        const nextStop = bus.stops[currentStopIndex + 1];
        if (nextStop) {
          nextStopInfo = {
            name: nextStop.name,
            eta: stopETAs[currentStopIndex + 1] - (stopETAs[currentStopIndex] || 0),
            distance: bus.routeProfile?.stopDistances?.[currentStopIndex + 1] || 0
          };
        }
      }

      // Update stops with status
      const stops = [
        { ...bus.source, scheduledTime: bus.departureTime },
        ...(bus.stops || []),
        { ...bus.destination, scheduledTime: bus.arrivalTime }
      ].filter(Boolean).map((stop, index) => ({
        name: stop.name,
        coords: stop.coords,
        scheduledTime: stop.scheduledTime,
        status: index < currentStopIndex ? 'completed' : 
                index === currentStopIndex ? 'current' : 'upcoming',
        delayMinutes: index === currentStopIndex ? (bus.delayMinutes || 0) : 0,
        eta: stopETAs[index] || 0
      }));

      return {
        ...bus,
        stops,
        currentStopIndex,
        nextStopInfo,
        routeProfile: {
          ...bus.routeProfile,
          stopETAs
        },
        status: bus.status || 'on_time',
        delayMinutes: bus.delayMinutes || 0
      };
    }));

    res.json({ buses: processedBuses });
  } catch (err) {
    console.error('Error searching buses:', err);
    res.status(500).json({ error: 'Failed to search buses' });
  }
});

// GET all buses (with caching)
router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (cache.payload && (now - cache.ts) < CACHE_TTL) {
      const ifNone = req.get('If-None-Match');
      if (ifNone && ifNone === cache.etag) return res.status(304).end();
      res.set('ETag', cache.etag);
      return res.json(cache.payload);
    }

    const buses = await Bus.find({}, { routeGeometry: 0, routeProfile: 0 }).lean();
     if (buses.length > 500) {
      const payload = { buses, total: buses.length };
      // do not cache large payloads to avoid memory growth
      const ifNone = req.get('If-None-Match');
      res.json(payload);
      return;
    }
    const payload = { buses, total: buses.length };
    const etag = crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex');
    cache = { etag, payload, ts: now };

    const ifNone = req.get('If-None-Match');
    if (ifNone && ifNone === etag) return res.status(304).end();
    res.set('ETag', etag);
    res.json(payload);
  } catch (err) {
    console.error('Error fetching all buses:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});


// GET a single bus by its bus number (case-insensitive)
router.get("/search/bus/:busNumber", async (req, res) => {
  try {
    const busNumber = (req.params.busNumber || '').trim();
    if (!busNumber) {
        return res.status(400).json({ error: 'busNumber parameter is required' });
    }

    const bus = await Bus.findOne(
        { busNumber: { $regex: new RegExp(`^${escapeRegex(busNumber)}$`, 'i') } },
        { routeGeometry: 0, routeProfile: 0 } // Exclude heavy fields for performance
    ).lean();

    if (!bus) {
        return res.status(404).json({ message: "Bus not found" });
    }
    // CORRECTED: Wrap the response in a 'bus' object as the frontend expects
    res.json({ bus });

  } catch (err) {
    console.error('Error searching by bus number:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

router.post('/update-location', async (req, res) => {
  try {
    const { busNumber, coordinates } = req.body;
    if (!busNumber || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ error: 'busNumber and coordinates [lng,lat] required' });
    }

    const now = new Date();
    const update = {
      $set: {
        coordinates,
        lastLocation: { coordinates, ts: now },
        lastUpdated: now,
        isActive: true
      },
      // keep recentLocations array limited to last 20 updates
      $push: {
        recentLocations: {
          $each: [{ coordinates, ts: now }],
          $slice: -50
        }
      }
    };

    const bus = await Bus.findOneAndUpdate(
      { busNumber: { $regex: new RegExp(`^${escapeRegex(busNumber)}$`, 'i') } },
      update,
      { new: true, upsert: false }
    ).lean();

    if (!bus) return res.status(404).json({ error: 'Bus not found' });

    // Emit socket update for real-time viewers
    const io = req.app.get('io');
    if (io) io.emit('bus-location-update', { busNumber: bus.busNumber, coordinates, ts: now.toISOString() });

    return res.json({ success: true, bus });
  } catch (err) {
    console.error('Error in /update-location:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// GET all buses that match a specific route, including intermediate stops
router.get("/search/route", async (req, res) => {
  const source = (req.query.source || '').trim();
  const destination = (req.query.destination || '').trim();

  if (!source || !destination) {
    return res.status(400).json({ error: 'Source and destination query parameters are required' });
  }

  try {
    const sReg = new RegExp(escapeRegex(source), 'i');
    const dReg = new RegExp(escapeRegex(destination), 'i');

    const buses = await Bus.aggregate([
      {
        $match: {
          $and: [
            { $or: [{ 'source.name': sReg }, { 'stops.name': sReg }, { 'destination.name': sReg }] },
            { $or: [{ 'source.name': dReg }, { 'stops.name': dReg }, { 'destination.name': dReg }] }
          ]
        }
      },
      {
        $addFields: {
          fullRouteNames: { $concatArrays: [ ["$source.name"], "$stops.name", ["$destination.name"] ] }
        }
      },
      {
        $addFields: {
          sourceIndex: { $indexOfArray: [ "$fullRouteNames", { $arrayElemAt: [ { $filter: { input: "$fullRouteNames", as: "item", cond: { $regexMatch: { input: "$$item", regex: sReg } } } }, 0 ] } ] },
          destinationIndex: { $indexOfArray: [ "$fullRouteNames", { $arrayElemAt: [ { $filter: { input: "$fullRouteNames", as: "item", cond: { $regexMatch: { input: "$$item", regex: dReg } } } }, 0 ] } ] }
        }
      },
      {
        $match: {
          sourceIndex: { $gte: 0 },
          destinationIndex: { $gte: 0 },
          $expr: { $lt: ["$sourceIndex", "$destinationIndex"] }
        }
      },
      {
        $project: {
          fullRouteNames: 0, sourceIndex: 0, destinationIndex: 0,
          routeGeometry: 0, routeProfile: 0
        }
      }
    ]);

    return res.json({ buses, total: buses.length });

  } catch (err) {
    console.error('Error searching route:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
});

router.post('/update-status', async (req, res) => {
  try {
    const { busNumber, isActive, status } = req.body;
    if (!busNumber || typeof isActive !== 'boolean' || !status) {
      return res.status(400).json({ error: 'busNumber, isActive (boolean), and status are required' });
    }

    const update = {
      $set: {
        isActive,
        status,
        isLiveTracked: isActive, // Link live tracking to the active state from the driver portal
        lastUpdated: new Date(),
      }
    };

    const bus = await Bus.findOneAndUpdate(
      { busNumber: { $regex: new RegExp(`^${escapeRegex(busNumber)}$`, 'i') } },
      update,
      { new: true, upsert: false }
    ).lean();

    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    // Emit a socket event so the map UI updates instantly
    const io = req.app.get('io');
    if (io) {
      io.emit('bus-status-update', {
        busNumber: bus.busNumber,
        isActive: bus.isActive,
        status: bus.status
      });
    }

    return res.json({ success: true, bus });
  } catch (err) {
    console.error('Error in /update-status:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
});

router.post('/', async (req, res) => {
  try {
    // Note: The frontend sends 'number' but the model expects 'busNumber'
    const busData = {
      ...req.body,
      busNumber: req.body.number || req.body.busNumber,
    };
    delete busData.number; // Clean up the redundant field

    const newBus = new Bus(busData);
    const savedBus = await newBus.save();
    
    // Invalidate cache so the new bus appears on the next fetch
    cache = { etag: null, payload: null, ts: 0 };

    res.status(201).json(savedBus);
  } catch (err) {
    console.error('Error creating bus:', err);
    // Handle potential duplicate key error for busNumber
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A bus with this number already exists.' });
    }
    res.status(400).json({ error: err.message || 'Failed to create bus' });
  }
});

// PUT to update a bus by its ID (Update)
router.put('/:id', async (req, res) => {
  try {
    const busId = req.params.id;
    const updateData = { ...req.body };
    
    // Again, handle the 'number' vs 'busNumber' difference
    if (updateData.number) {
      updateData.busNumber = updateData.number;
      delete updateData.number;
    }

    const updatedBus = await Bus.findByIdAndUpdate(busId, updateData, { new: true, runValidators: true }).lean();

    if (!updatedBus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    
    // Invalidate cache
    cache = { etag: null, payload: null, ts: 0 };

    res.json(updatedBus);
  } catch (err) {
    console.error('Error updating bus:', err);
    res.status(400).json({ error: err.message || 'Failed to update bus' });
  }
});

// DELETE a bus by its ID (Delete)
router.delete('/:id', async (req, res) => {
  try {
    const busId = req.params.id;
    const deletedBus = await Bus.findByIdAndDelete(busId);

    if (!deletedBus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    
    // Invalidate cache
    cache = { etag: null, payload: null, ts: 0 };

    res.status(200).json({ message: 'Bus deleted successfully' });
  } catch (err) {
    console.error('Error deleting bus:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// --- Additional endpoints for ticketing ---

// GET distinct location names (sources, stops, destinations)
router.get('/locations/all', async (req, res) => {
  try {
    const names = await Bus.aggregate([
      {
        $project: {
          names: {
            $setUnion: [
              ["$source.name"],
              "$stops.name",
              ["$destination.name"]
            ]
          }
        }
      },
      { $unwind: "$names" },
      { $group: { _id: { $toLower: "$names" }, name: { $first: "$names" } } },
      { $replaceRoot: { newRoot: { name: "$name" } } },
      { $sort: { name: 1 } }
    ]);
    res.json({ locations: names.map(n => n.name) });
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// Utility: haversine distance in km between [lat, lon]
function haversineKm(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad((b[0] || 0) - (a[0] || 0));
  const dLon = toRad((b[1] || 0) - (a[1] || 0));
  const lat1 = toRad(a[0] || 0);
  const lat2 = toRad(b[0] || 0);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

// GET fare for a bus between source and destination
// /buses/fare?busNumber=PB01AB1234&source=Amritsar&destination=Ludhiana
router.get('/fare', async (req, res) => {
  try {
    const busNumber = (req.query.busNumber || '').trim();
    const source = (req.query.source || '').trim();
    const destination = (req.query.destination || '').trim();
    if (!busNumber || !source || !destination) {
      return res.status(400).json({ error: 'busNumber, source and destination are required' });
    }

    const sReg = new RegExp(escapeRegex(source), 'i');
    const dReg = new RegExp(escapeRegex(destination), 'i');

    const bus = await Bus.findOne(
      { busNumber: { $regex: new RegExp(`^${escapeRegex(busNumber)}$`, 'i') } },
      { routeGeometry: 0 }
    ).lean();
    if (!bus) return res.status(404).json({ error: 'Bus not found' });

    const seq = [bus.source, ...(bus.stops || []), bus.destination].filter(Boolean);
    const names = seq.map(s => s.name || '');
    const findIndex = (rg) => names.findIndex(n => rg.test(n));
    const sIdx = findIndex(sReg);
    const dIdx = findIndex(dReg);
    if (sIdx === -1 || dIdx === -1 || sIdx >= dIdx) {
      return res.status(400).json({ error: 'Invalid segment for this bus' });
    }

    // Sum distances along the segment
    let distanceKm = 0;
    for (let i = sIdx; i < dIdx; i++) {
      const a = seq[i]?.coords || [0,0];
      const b = seq[i+1]?.coords || [0,0];
      distanceKm += haversineKm(a, b);
    }
    distanceKm = Math.max(1, Math.round(distanceKm * 10) / 10); // at least 1km, 0.1 precision

    // Simple fare rule: base 5 INR + 1.5 INR per km
    const base = 5;
    const perKm = 1.5;
    const fare = Math.round((base + perKm * distanceKm) * 100) / 100;

    res.json({
      busNumber: bus.busNumber,
      source: names[sIdx],
      destination: names[dIdx],
      distanceKm,
      fare,
      currency: 'INR'
    });
  } catch (err) {
    console.error('Error computing fare:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

module.exports = router;