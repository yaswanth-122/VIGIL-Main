const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const apiRoutes = require('./routes/api');
const { initDb } = require('./database/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize persistent DB engine
initDb();

// Comprehensive Universal CORS Middleware for local, network IP, Tailscale, and tunnel access
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, bypass-tunnel-reminder');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Path Normalizer & API flag for Express wildcard fallback
  if (req.url.startsWith('/api/') || req.url === '/api') {
    req.isApiCall = true;
    req.url = req.url.replace(/^\/api/, '') || '/';
  }

  next();
});

app.use(cors());
app.use(express.json());

// API Routes
app.use('/', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'VIGIL AI Virtual Safety Companion',
    team: 'BUG BUSTERS',
    timestamp: new Date().toISOString()
  });
});

// Serve compiled static React Vite frontend assets for single-service deployment
const fs = require('fs');

// Try multiple possible dist locations (handles both local dev and Render/cloud deployments)
const possibleDistPaths = [
  path.join(__dirname, '../frontend/dist'),         // normal: backend/ -> ../frontend/dist
  path.join(process.cwd(), 'frontend/dist'),        // Render: project root -> frontend/dist
  path.join(process.cwd(), 'dist'),                 // fallback: root dist
  path.join(__dirname, 'dist'),                     // fallback: same dir dist
];

const distPath = possibleDistPaths.find(p => {
  const exists = fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'));
  console.log(`Checking dist path: ${p} => ${exists ? '✅ FOUND' : '❌ not found'}`);
  return exists;
});

if (distPath) {
  console.log(`✅ Serving static frontend from: ${distPath}`);
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.isApiCall || req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.warn('⚠️  frontend/dist not found. Frontend will not be served. Run build first.');
  app.get('*', (req, res, next) => {
    if (req.isApiCall || req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.status(503).send('<h2>VIGIL frontend build not found. Please run: npm run build</h2>');
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🛡️ VIGIL Backend Server Running on Port ${PORT}`);
    console.log(`Team: BUG BUSTERS`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
    console.log(`API Base: http://localhost:${PORT}/api`);
    console.log(`====================================================`);
  });
}

module.exports = app;
