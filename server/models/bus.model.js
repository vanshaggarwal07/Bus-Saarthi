const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// A sub-schema for any location point (source, destination, or stop)
const LocationSchema = new Schema({
  name: { type: String, required: true },
  coords: { type: [Number], required: true } // [latitude, longitude]
}, { _id: false });

const busSchema = new Schema({
  busNumber: { type: String, required: true, unique: true },
  source: { type: LocationSchema,  },
  destination: { type: LocationSchema, required: false },
  departureTime: { type: String, required: false },
  arrivalTime: { type: String, required: false },
    assignedDriver: { 
    type: Schema.Types.ObjectId, 
    ref: 'Driver', 
    default: null 
  },
  stops: [LocationSchema], // An array of stops using the LocationSchema

  // --- Dynamic fields for live tracking ---
  coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
  heading: { type: Number, default: 0 },
  speed: { type: Number, default: 0 },
  status: { type: String, default: 'On Time' },
  passengers: { type: String, default: '0/40' },
  nextStop: { type: String, default: 'N/A' },
  eta: { type: String, default: 'N/A' },
  isActive: { type: Boolean, default: false },
  isAtStop: { type: Boolean, default: false },
  currentStopIndex: { type: Number, default: -1 },

  // Field to store the full, multi-stop road route from Mapbox
  routeGeometry: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: {
      type: [[Number]], // Array of [longitude, latitude] pairs
      default: []
    }
  }, 
  routeProfile: {
    totalDistance: { type: Number, default: 0 },
    mapboxDuration: { type: Number, default: 0 },
    stopDistances: { type: [Number], default: [] }
  } ,
   lastLocation: {
    coordinates: [Number],
    ts: Date
  },
  recentLocations: [{
    coordinates: [Number],
    ts: Date
  }]
});

const Bus = mongoose.model('Bus', busSchema);

module.exports = Bus;