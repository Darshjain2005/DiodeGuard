import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import apiRoutes from './routes/api.js';
import cveRoutes from './routes/cve.js';
import policyRoutes from './routes/policy.js';
import authRoutes from './routes/auth.js';

// Services (Empty - Email Agent controlled via API now)

// ✅ Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load BOTH env files (root + backend)
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const httpServer = createServer(app);

// ✅ Setup Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', cveRoutes);
app.use('/api', policyRoutes);
app.use('/api/auth', authRoutes);

// ✅ Pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api', apiRoutes);

// ✅ Socket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Port
const PORT = process.env.PORT || 5000;

// ✅ Start server
httpServer.listen(PORT, () => {
  console.log(`[+] Server running on port ${PORT}`);

  // ✅ Keep-alive pings every 14 minutes to prevent Render free tier spin-down
  const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  const PYTHON_API_URL = process.env.PYTHON_API_URL || '';

  setInterval(async () => {
    try {
      const res = await fetch(`${SELF_URL}/api/health`);
      console.log(`[keep-alive] Node self-ping: ${res.status}`);
    } catch (err) {
      console.log(`[keep-alive] Node self-ping failed: ${err.message}`);
    }

    if (PYTHON_API_URL) {
      try {
        const res = await fetch(`${PYTHON_API_URL}/ping`);
        console.log(`[keep-alive] Python API ping: ${res.status}`);
      } catch (err) {
        console.log(`[keep-alive] Python API ping failed: ${err.message}`);
      }
    }
  }, PING_INTERVAL);
});