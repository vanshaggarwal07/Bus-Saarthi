// server/config/database.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.ATLAS_URI);
        console.log("✅ MongoDB database connection established successfully");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;