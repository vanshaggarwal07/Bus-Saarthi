const router = require('express').Router();
const Route = require('../models/route.model');
const Bus = require('../models/bus.model');

// GET / -> list all routes (populate assigned buses)
router.get('/', async (req, res) => {
  try {
    const routes = await Route.find().populate('assignedBuses');
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id).populate('assignedBuses');
    if (!route) return res.status(404).json({ error: 'Route not found' });
    res.json(route);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST / -> create
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const route = new Route({
      name: body.name,
      from: body.from,
      to: body.to,
      distance: body.distance || 0,
      estimatedTime: body.estimatedTime || '',
      status: body.status || 'active',
      stops: body.stops || [],
      assignedBuses: body.assignedBuses || []
    });
    await route.save();
    const populated = await Route.findById(route._id).populate('assignedBuses');
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT /:id -> update
router.put('/:id', async (req, res) => {
  try {
    const body = req.body;
    const updated = await Route.findByIdAndUpdate(
      req.params.id,
      { $set: {
          name: body.name,
          from: body.from,
          to: body.to,
          distance: body.distance || 0,
          estimatedTime: body.estimatedTime || '',
          status: body.status || 'active',
          stops: body.stops || [],
          assignedBuses: body.assignedBuses || []
        }
      },
      { new: true, runValidators: true }
    ).populate('assignedBuses');
    if (!updated) return res.status(404).json({ error: 'Route not found' });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    const del = await Route.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ error: 'Route not found' });
    res.json({ message: 'Route deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;