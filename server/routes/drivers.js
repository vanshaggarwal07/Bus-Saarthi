// ...existing code...
const router = require('express').Router();
const Bus = require('../models/bus.model');

/**
 * GET /drivers
 * Build driver list from Bus documents. Use driverName / driverLicense / driverContact / driverStatus
 * if present on bus, otherwise fall back to assignedDriver or sensible defaults.
 */
router.get('/', async (req, res) => {
  try {
    const buses = await Bus.find().lean();

    const driversMap = new Map();

    for (const bus of buses) {
      const assigned = bus.assignedDriver;
      const name = (bus.driverName || (assigned && (typeof assigned === 'object' ? assigned.name : String(assigned))) || 'Unknown').trim();
      const key = name || `unknown-${String(bus._id)}`;

      if (!driversMap.has(key)) {
        driversMap.set(key, {
          _id: key,
          name,
          licenseNumber: bus.driverLicense || bus.driverLicenseNumber || (assigned && assigned.licenseNumber) || null,
          contact: bus.driverContact || bus.driverPhone || (assigned && assigned.contact) || null,
          status: bus.driverStatus || (assigned && assigned.status) || (bus.status === 'active' ? 'on_duty' : 'inactive'),
          createdAt: (assigned && assigned.createdAt) || null,
          updatedAt: null,
          assignedBuses: []
        });
      }

      const drv = driversMap.get(key);

      drv.assignedBuses.push({
        _id: bus._id,
        busNumber: bus.busNumber || null,
        route: bus.route?.name || bus.routeName || bus.route || null,
        passengers: bus.passengers || null,
        status: bus.status || null,
        updatedAt: bus.updatedAt || bus.updatedAt || null
      });

      // keep latest updatedAt for driver
      const busUpdated = bus.updatedAt ? new Date(bus.updatedAt) : null;
      if (busUpdated && (!drv.updatedAt || new Date(drv.updatedAt) < busUpdated)) {
        drv.updatedAt = bus.updatedAt;
      }
    }

    return res.json(Array.from(driversMap.values()));
  } catch (err) {
    console.error('GET /drivers error', err);
    return res.status(500).json({ error: 'failed to fetch drivers' });
  }
});

module.exports = router;