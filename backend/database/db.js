const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Use /tmp in serverless environments (like Vercel or AWS Lambda) where project root is read-only
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_FILE = isServerless
  ? path.join('/tmp', 'vigil_db.json')
  : path.join(__dirname, 'vigil_db.json');

let memoryDbCache = null;

// Helper to hash password
function hashPassword(password, salt = 'vigil_salt_2026') {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Default initial state
const defaultData = {
  users: [
    {
      id: 'usr_default',
      name: 'Alex Rivera',
      username: 'alexrivera',
      email: 'alex.rivera@example.com',
      phone: '+1 (555) 234-5678',
      password_hash: hashPassword('password123'),
      emergency_contact: 'Hari Kiran (Primary Guardian)',
      emergency_phone: '+917659834470',
      blood_type: 'O+',
      medical_notes: 'Asthma, No severe drug allergies',
      preferences: {
        theme: 'auto',
        safety_timeout_mins: 10
      },
      created_at: new Date().toISOString()
    }
  ],
  trusted_contacts: [
    {
      id: 'tc_1',
      user_id: 'usr_default',
      name: 'Hari Kiran',
      phone: '+917659834470',
      email: 'harikiran@example.com',
      relationship: 'Primary Guardian',
      priority: 1,
      enabled: true,
      is_primary: true
    },
    {
      id: 'tc_2',
      user_id: 'usr_default',
      name: 'David Chen',
      phone: '+1 (555) 456-7890',
      email: 'david.chen@example.com',
      relationship: 'Friend',
      priority: 2,
      enabled: true,
      is_primary: false
    }
  ],
  journeys: [
    {
      id: 'jrn_demo_past',
      user_id: 'usr_default',
      name: 'Evening Commute Home',
      start_location: { name: 'Tech Hub Office', lat: 12.9716, lng: 77.5946 },
      destination: { name: 'Greenwood Residences', lat: 12.9352, lng: 77.6245 },
      status: 'completed',
      mode: 'safety',
      start_time: new Date(Date.now() - 86400000).toISOString(),
      end_time: new Date(Date.now() - 82800000).toISOString(),
      distance_km: 6.4,
      duration_mins: 28,
      risk_score: 15,
      risk_level: 'GREEN',
      max_risk_score: 25,
      alerts_count: 0
    }
  ],
  location_updates: [],
  risk_events: [],
  safety_checks: [],
  alerts: []
};

// Initialize DB if file does not exist
function initDb() {
  if (memoryDbCache) return;
  try {
    if (!fs.existsSync(DB_FILE)) {
      const bundledPath = path.join(__dirname, 'vigil_db.json');
      if (isServerless && fs.existsSync(bundledPath)) {
        fs.copyFileSync(bundledPath, DB_FILE);
      } else {
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
      }
    }
  } catch (err) {
    console.warn('Filesystem init warning (using in-memory fallback):', err.message);
    memoryDbCache = JSON.parse(JSON.stringify(defaultData));
  }
}

function readDb() {
  if (memoryDbCache) return memoryDbCache;
  initDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading database file, using in-memory default:', err.message);
    if (!memoryDbCache) {
      memoryDbCache = JSON.parse(JSON.stringify(defaultData));
    }
    return memoryDbCache;
  }
}

function writeDb(data) {
  memoryDbCache = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.warn('Filesystem write warning (preserved in memory):', err.message);
    return true;
  }
}

module.exports = {
  readDb,
  writeDb,
  initDb,
  hashPassword
};
