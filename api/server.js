const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const apiRoutes = require('../backend/routes/api');
const { initDb } = require('../backend/database/db');

dotenv.config();

const app = express();

// Initialize DB
initDb();

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());
app.use(cors());

// Strip /api prefix so routes match correctly
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    req.url = req.url.replace(/^\/api/, '');
  }
  next();
});

// Mount all API routes
app.use('/', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'VIGIL AI Virtual Safety Companion',
    team: 'BUG BUSTERS',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

module.exports = app;
