const router = require('express').Router();
const Driver = require('../models/driver.model');
const Bus = require('../models/bus.model');
// GET all drivers
router.get('/', async (req, res) => {
  try {
    // Use .populate() to also fetch the details of the assigned bus
    const drivers = await Driver.find().populate({
      path: 'assignedBus',
      select: 'busNumber source destination' // Select the fields you need from the Bus model
    }).sort({ createdAt: -1 });
    res.json(drivers);
  } catch (err) {
    console.error('Error fetching drivers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST a new driver
router.post('/', async (req, res) => {
  try {
    const newDriver = new Driver(req.body);
    const savedDriver = await newDriver.save();
    res.status(201).json(savedDriver);
  } catch (err) {
    console.error('Error creating driver:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A driver with this license number already exists.' });
    }
    res.status(400).json({ error: err.message });
  }
});

// PUT to update a driver by ID
router.put('/:id', async (req, res) => {
  try {
   const driverId = req.params.id;
    const updateData = req.body;
    const newBusId = updateData.assignedBus || null;
 const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    const oldBusId = driver.assignedBus;

    // If the bus assignment has changed, update the corresponding Bus documents
    if (String(oldBusId) !== String(newBusId)) {
      // 1. Un-assign the driver from their old bus, if they had one
      if (oldBusId) {
        await Bus.findByIdAndUpdate(oldBusId, { assignedDriver: null });
      }
      // 2. Assign the driver to the new bus, if one is provided
      if (newBusId) {
        // As a safeguard, check if the new bus is already taken
        const targetBus = await Bus.findById(newBusId);
        if (targetBus && targetBus.assignedDriver) {
          return res.status(409).json({ error: `Bus ${targetBus.busNumber} is already assigned to another driver.` });
        }
        await Bus.findByIdAndUpdate(newBusId, { assignedDriver: driverId });
      }
    }

    // Finally, update the driver document itself
    const updatedDriver = await Driver.findByIdAndUpdate(driverId, updateData, { new: true, runValidators: true }).populate('assignedBus');
    
    res.json(updatedDriver);
  } catch (err) {
    console.error('Error updating driver:', err);
    res.status(400).json({ error: err.message || 'Failed to update driver' });
  }
});

// DELETE a driver by ID
router.delete('/:id', async (req, res) => {
  try {
    const driverId = req.params.id;
    
    // Find the driver to see if they are assigned to a bus
    const driver = await Driver.findById(driverId);
    if (driver && driver.assignedBus) {
      // If so, update the bus to have no driver
      await Bus.findByIdAndUpdate(driver.assignedBus, { assignedDriver: null });
    }

    // Now, delete the driver
    const deletedDriver = await Driver.findByIdAndDelete(driverId);
    if (!deletedDriver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.status(200).json({ message: 'Driver deleted successfully' });
  } catch (err) {
    console.error('Error deleting driver:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;