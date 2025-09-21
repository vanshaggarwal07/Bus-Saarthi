const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StopSchema = new Schema({
  name: { type: String, required: true },
  distanceFromStart: { type: Number, default: 0 },
  estimatedTimeFromStart: { type: String, default: '' },
  lat: { type: Number },
  lng: { type: Number }
}, { _id: false });

const RouteSchema = new Schema({
  name: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  distance: { type: Number, default: 0 },
  estimatedTime: { type: String, default: '' },
  status: { type: String, enum: ['active','inactive'], default: 'active' },
  stops: { type: [StopSchema], default: [] },
  // store as ObjectId refs so we can populate actual bus documents
  assignedBuses: [{ type: Schema.Types.ObjectId, ref: 'Bus' }],
  activeBuses: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Route', RouteSchema);