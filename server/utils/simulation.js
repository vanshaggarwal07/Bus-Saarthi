const axios = require('axios');
const Bus = require('../models/bus.model'); // Make sure your model has routeProfile
const turf = require('@turf/turf');

// --- Configuration ---
const STOP_DURATION_MINUTES = 2; // 30-second wait at each stop

// --- Helper Functions ---

function timeToMinutes(timeStr) {
    if (typeof timeStr !== 'string' || !timeStr.includes(':')) {
        return 0;
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Fetches a route from Mapbox and pre-calculates the distance along the route
 * for each stop. This is crucial for efficient simulation.
 */
async function getAndProfileRoute(bus) {
    const allStopsCoords = [
        [bus.source.coords[1], bus.source.coords[0]],
        ...bus.stops.map(stop => [stop.coords[1], stop.coords[0]]),
        [bus.destination.coords[1], bus.destination.coords[0]]
    ];
    const waypoints = allStopsCoords.join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${process.env.MAPBOX_ACCESS_TOKEN}`;

    try {
        const response = await axios.get(url);
        const route = response.data.routes[0];
        const routeLine = turf.lineString(route.geometry.coordinates);
        const totalDistance = turf.length(routeLine); // in km

        const stopDistances = allStopsCoords.map(coords => {
            const stopPoint = turf.point(coords);
            const snapped = turf.nearestPointOnLine(routeLine, stopPoint);
            return snapped.properties.location;
        });

        return {
            coordinates: route.geometry.coordinates,
            totalDistance, // in km
            mapboxDuration: route.duration / 60, // in minutes
            stopDistances, // array of distances along the route for each stop
        };
    } catch (error) {
        console.error(`Error fetching route for ${bus.busNumber}:`, error.message);
        return null;
    }
}

// --- Main Simulation Logic ---

function simulateBusPosition(bus) {
    const routeLine = turf.lineString(bus.routeGeometry.coordinates);
    const { totalDistance, mapboxDuration, stopDistances } = bus.routeProfile;
    const allStops = [bus.source, ...bus.stops, bus.destination];

    // Total trip time is the driving time from Mapbox + time spent at each intermediate stop
    const totalTripTime = mapboxDuration + (bus.stops.length * STOP_DURATION_MINUTES);

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const departureTime = timeToMinutes(bus.departureTime);

    // Calculate how long it's been since the trip started, looping continuously
    let timeElapsed = currentTime - departureTime;
    if (timeElapsed < 0) timeElapsed += 24 * 60; // Handle overnight trips
    const timeIntoCurrentLoop = timeElapsed % totalTripTime;

    let traveledDistance = 0;
    let timeAccountedFor = 0;
    let currentStopIndex = -1; // Index of the last stop visited or currently at
    let isAtStop = false;
    let nextStopName = 'Calculating...';
    let eta = 'Calculating...';

    // Find the bus's current segment (between two stops)
    for (let i = 0; i < stopDistances.length - 1; i++) {
        const segmentStartDist = stopDistances[i];
        const segmentEndDist = stopDistances[i+1];
        const segmentDistance = segmentEndDist - segmentStartDist;
        const segmentTravelTime = (segmentDistance / totalDistance) * mapboxDuration;

        // Check if the bus is in the travel time for this segment
        if (timeIntoCurrentLoop >= timeAccountedFor && timeIntoCurrentLoop < timeAccountedFor + segmentTravelTime) {
            const timeIntoSegment = timeIntoCurrentLoop - timeAccountedFor;
            const progressAlongSegment = timeIntoSegment / segmentTravelTime;
            traveledDistance = segmentStartDist + (segmentDistance * progressAlongSegment);
            currentStopIndex = i;
            isAtStop = false;
            
            // ETA calculation
            const remainingTimeInSegment = segmentTravelTime - timeIntoSegment;
            let remainingStopTime = 0;
            for (let j = i + 1; j < allStops.length - 1; j++) {
                remainingStopTime += STOP_DURATION_MINUTES;
            }
            const remainingRoute = turf.lineSliceAlong(routeLine, traveledDistance, totalDistance);
            const remainingDrivingTime = (turf.length(remainingRoute) / totalDistance) * mapboxDuration;
            eta = `${Math.ceil(remainingDrivingTime + remainingStopTime)} min`;
            nextStopName = allStops[i + 1].name;
            break;
        }
        timeAccountedFor += segmentTravelTime;

        // Check if the bus is waiting at the next stop (but not the final destination)
        if (i < allStops.length - 1 && timeIntoCurrentLoop >= timeAccountedFor && timeIntoCurrentLoop < timeAccountedFor + STOP_DURATION_MINUTES) {
            traveledDistance = segmentEndDist;
            currentStopIndex = i + 1;
            isAtStop = true;
            nextStopName = (i + 2 < allStops.length) ? allStops[i + 2].name : 'Destination';
            eta = 'At Stop';
            break;
        }
        // Only add stop duration for intermediate stops
        if (i < allStops.length - 2) {
            timeAccountedFor += STOP_DURATION_MINUTES;
        }
    }
    
    // If loop finishes, bus is on its final approach or has arrived
    if (currentStopIndex === -1) {
        traveledDistance = totalDistance;
        currentStopIndex = allStops.length - 1;
        isAtStop = true;
        eta = 'Arrived';
        nextStopName = 'Arrived';
    }


    const currentPoint = turf.along(routeLine, traveledDistance);
    const coordinates = currentPoint.geometry.coordinates;

    // Calculate heading by looking slightly ahead on the route
    let heading = 0;
    if (traveledDistance < totalDistance) {
        const nextPoint = turf.along(routeLine, traveledDistance + 0.1); // Look 100m ahead
        heading = turf.bearing(currentPoint, nextPoint);
    }

    return {
        coordinates,
        heading,
        eta,
        nextStop: nextStopName,
        isActive: true,
        isAtStop,
        currentStopIndex,
    };
}
let _simRunning = false;
async function runSimulation() {
    if(_simRunning) return;
    _simRunning = true;
    try {
        const buses = await Bus.find({ isLiveTracked: { $ne: true } });
        for (const bus of buses) {
            let updatePayload = {};
            let busForSim = bus;

            // Fetch and profile the route for the bus if it doesn't exist
            if (!bus.routeProfile || bus.routeProfile.stopDistances.length === 0) {
                console.log(`Profiling route for bus ${bus.busNumber}...`);
                const routeInfo = await getAndProfileRoute(bus);
                if (routeInfo) {
                    const { coordinates, ...profile } = routeInfo;
                    updatePayload = {
                        'routeGeometry.coordinates': coordinates,
                        'routeProfile': profile
                    };
                    // Update the bus object in memory for the current simulation tick
                    busForSim = { ...bus.toObject(), routeGeometry: { coordinates }, routeProfile: profile };
                } else {
                    console.log(`Could not fetch route for ${bus.busNumber}. Skipping.`);
                    continue;
                }
            }
            
            // Ensure we have a valid route to simulate on
            if (!busForSim.routeGeometry?.coordinates || busForSim.routeGeometry.coordinates.length === 0) {
                 continue;
            }

            const simState = simulateBusPosition(busForSim);

            updatePayload = { ...updatePayload, ...simState };

            // Simulate passenger changes only when at a stop
            if (simState.isAtStop) {
                const [currentPassengers, maxPassengers] = bus.passengers.split('/').map(Number);
                const passengerChange = Math.floor(Math.random() * 10) - 5; // -5 to +5
                const newPassengerCount = Math.max(0, Math.min(maxPassengers, currentPassengers + passengerChange));
                updatePayload.passengers = `${newPassengerCount}/${maxPassengers}`;
                updatePayload.status = 'At Stop';
                updatePayload.speed = 0;
            } else {
                updatePayload.status = 'On Time'; // Could be enhanced to 'Delayed', etc.
                updatePayload.speed = Math.floor(Math.random() * 20) + 40; // Random speed 40-60
            }

            await Bus.updateOne({ _id: bus._id }, { $set: updatePayload });
        }
    } catch (err) {
        console.error("Error during simulation update:", err);
    }
    finally {
    _simRunning = false;
  }
}

module.exports = { runSimulation };