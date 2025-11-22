require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./models');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Crucial for Twilio Webhooks

// Make IO accessible in routes
app.set('io', io);

// Routes
app.use('/api', apiRoutes);

// Socket Connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('join_room', (userId) => {
    socket.join(userId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Database Sync & Start
db.sequelize.sync().then(() => {
  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

module.exports = app;