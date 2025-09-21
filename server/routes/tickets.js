const router = require('express').Router();
const Ticket = require('../models/ticket.model');

// POST /tickets -> create ticket
router.post('/', async (req, res) => {
  try {
    const { busNumber, source, destination, fare, currency, passengerName, passengerPhone, seats, status } = req.body || {};
    if (!busNumber || !source || !destination || typeof fare !== 'number') {
      return res.status(400).json({ error: 'busNumber, source, destination and numeric fare are required' });
    }

    const ticket = new Ticket({
      busNumber,
      source,
      destination,
      fare,
      currency: currency || 'INR',
      passengerName: passengerName || '',
      passengerPhone: passengerPhone || '',
      seats: Math.max(1, Number(seats) || 1),
      status: status || 'paid'
    });

    const saved = await ticket.save();
    res.status(201).json({ ticket: saved });
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

module.exports = router;
