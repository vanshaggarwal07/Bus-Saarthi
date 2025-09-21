const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const driverSchema = new Schema({
   name: { type: String, required: true, trim: true },
  licenseNumber: { type: String, required: true, unique: true, trim: true },
  contact: { type: String, required: true },
  // Add the new email field
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    // This makes the field optional, but unique if a value is provided
    sparse: true, 
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  status: {
    type: String,
    required: true,
     enum: ['on_duty', 'on_break', 'off_duty'],
    default: 'off_duty'
  },
  // This links a driver to a specific bus document
  assignedBus: {
    type: Schema.Types.ObjectId,
    ref: 'Bus',
    default: null
  },
}, { timestamps: true }); // timestamps adds createdAt and updatedAt

const Driver = mongoose.model('Driver', driverSchema);
module.exports = Driver;