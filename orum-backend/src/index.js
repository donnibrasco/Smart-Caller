require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://aistudiocdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://aistudiocdn.com", "wss:", "ws:"],
    }
  }
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for SignalWire/Twilio webhook parsing

// Make IO accessible in routes
app.set('io', io);

// Routes
app.use('/api', apiRoutes);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket Connection
const VoiceCallService = require('./services/voiceCallService');
const voiceCallService = new VoiceCallService(io);

io.on('connection', (socket) => {
  console.log('[Socket] New client connected:', socket.id);
  
  socket.on('join_room', (userId) => {
    socket.join(userId);
    console.log('[Socket] User joined room:', userId);
  });

  // Voice call events
  socket.on('voice:dial', async (data) => {
    try {
      const { phoneNumber, userId } = data;
      console.log('[Socket] Dial request from user:', userId, 'to:', phoneNumber);
      
      await voiceCallService.makeCall(userId, phoneNumber, socket.id);
    } catch (error) {
      console.error('[Socket] Dial error:', error);
      socket.emit('call:error', { error: error.message });
    }
  });

  socket.on('voice:hangup', async (data) => {
    try {
      const { userId } = data;
      console.log('[Socket] Hangup request from user:', userId);
      
      await voiceCallService.hangup(userId);
    } catch (error) {
      console.error('[Socket] Hangup error:', error);
      socket.emit('call:error', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
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