const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ticketSchema = new Schema({
  busNumber: { type: String, required: true },
  source: { type: String, required: true },
  destination: { type: String, required: true },
  fare: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  passengerName: { type: String, default: '' },
  passengerPhone: { type: String, default: '' },
  seats: { type: Number, default: 1, min: 1 },
  status: { type: String, default: 'paid', enum: ['pending', 'paid', 'cancelled'] },
  createdAt: { type: Date, default: Date.now }
});

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
