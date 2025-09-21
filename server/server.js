const express = require('express');
const cors = require('cors');
const compression = require('compression');
const http = require('http');
const mongoose = require('mongoose');
const { runSimulation } = require('./utils/simulation');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

// --- SOCKET.IO ---
const { Server } = require("socket.io");

const io = new Server(server, {
    cors: {
        origin: "http://localhost:8080", // Your frontend's address
        methods: ["GET", "POST"],
        credentials: true
    }
});
app.set('io', io);

// --- MIDDLEWARE ---
app.use(cors({ origin: 'http://localhost:8080' }));
app.use(compression());
app.use(express.json({limit :'1mb'}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));



// --- MEMORY MONITORING ---
const intervalId = setInterval(() => {
  const used = process.memoryUsage();
  console.log(`Memory usage: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
}, 30000);

process.on('SIGTERM', () => {
  clearInterval(intervalId);
  server.close();
});

// --- DATABASE CONNECTION ---
const uri = process.env.ATLAS_URI;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("✅ MongoDB database connection established successfully");
  // Run the simulation every 1 second for smooth, big movements
  setInterval(runSimulation, 1000);

  const SIM_INTERVAL_MS = Number(process.env.SIM_INTERVAL_MS || 5000);
  const simulationInterval = setInterval(() => {
    try {
      runSimulation();
    } catch (e) {
      console.error('Simulation error', e);
    }
  }, SIM_INTERVAL_MS);
  // expose interval id so tests / shutdown logic can clear it if needed
  app.set('simulationInterval', simulationInterval);
});

// --- SOCKET.IO CONNECTION LOGGING (optional) ---
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

// --- graceful shutdown / safety handlers ---
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  const simulationInterval = app.get('simulationInterval');
  if (simulationInterval) clearInterval(simulationInterval);
  server.close(() => process.exit(0));
});
process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason);

});

// --- API ROUTES ---
const busesRouter = require('./routes/buses');
app.use('/buses', busesRouter);

// Add these lines for the new driver routes
const driversRouter = require('./routes/drivers');
app.use('/drivers', driversRouter);


const routesRouter = require('./routes/routes');
app.use('/routes', routesRouter);


server.listen(port, () => {
    console.log(`🚀 Server is running on port: ${port}`);
});