import 'dotenv/config';
import dns from 'dns';
import express from 'express';
import cors from 'cors';
import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket.js';

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-queue';
const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || DEFAULT_ORIGINS.join(','))
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Some ISP DNS servers fail MongoDB Atlas SRV lookups; use public DNS as fallback.
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const app = express();
app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'clinic-queue-backend' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

registerSocketHandlers(io);

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    server.listen(PORT, () => {
      console.log(`Clinic queue server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
