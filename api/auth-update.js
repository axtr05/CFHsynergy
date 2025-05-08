import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { updateUserRole } from '../backend/controllers/auth.controller.js';
import { protectRoute } from '../backend/middleware/auth.middleware.js';
import { connectDB } from '../backend/lib/db.js';

// Load environment variables
dotenv.config();

// Track database connection
let dbConnected = false;

// Connect to database
connectDB()
  .then(() => {
    console.log('Connected to database in auth-update handler');
    dbConnected = true;
  })
  .catch(err => {
    console.error('Database connection error in auth-update handler:', err.message);
    // Don't crash the server - we'll retry on subsequent requests
  });

// Create express app
const app = express();

// Debug middleware
app.use((req, res, next) => {
  console.log(`Auth-update endpoint requested: ${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  
  // Remove any path query parameter as it's causing issues
  if (req.query.path) {
    console.log(`Removing unnecessary path parameter: ${req.query.path}`);
    delete req.query.path;
  }
  
  next();
});

// Middleware
app.use(express.json());
app.use(cookieParser());

// MongoDB connection check middleware
app.use(async (req, res, next) => {
  // Skip options requests
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // If we're not connected to MongoDB, try to connect again
  if (!dbConnected) {
    try {
      console.log('Attempting to reconnect to MongoDB...');
      await connectDB();
      dbConnected = true;
      console.log('Successfully reconnected to MongoDB');
    } catch (error) {
      console.error('Failed to reconnect to MongoDB:', error.message);
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: 'Could not connect to database. Please try again later.'
      });
    }
  }
  
  next();
});

// CORS
const isDevelopment = process.env.NODE_ENV !== "production";
const clientUrl = process.env.CLIENT_URL || (isDevelopment ? "http://localhost:5173" : "https://cfhsynergy.vercel.app");
// Ensure allowedOrigins is always an array even if CLIENT_URL is undefined
const allowedOrigins = [
  clientUrl,
  "https://cfhsynergy.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
].filter(Boolean); // Remove any falsy values (like undefined)

console.log(`Auth-update handler allowing origins: ${allowedOrigins.join(", ")}`);
console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS in auth-update handler`);
      // Allow all origins in production for now to debug
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

// Handle preflight requests
app.options('*', cors());

// Custom cookie middleware to copy jwt-cfh-synergy to jwt for auth middleware compatibility
app.use((req, res, next) => {
  if (req.cookies['jwt-cfh-synergy'] && !req.cookies.jwt) {
    console.log('Copying jwt-cfh-synergy cookie to jwt for compatibility');
    // Add the cookie to both the request cookies and the raw cookie header
    req.cookies.jwt = req.cookies['jwt-cfh-synergy'];
  }
  next();
});

// Update user role endpoints - handle various HTTP methods and paths
app.post('*', protectRoute, (req, res) => {
  console.log('Update role endpoint activated (POST):', req.originalUrl);
  updateUserRole(req, res);
});

app.put('*', protectRoute, (req, res) => {
  console.log('Update role endpoint activated (PUT):', req.originalUrl);
  updateUserRole(req, res);
});

app.patch('*', protectRoute, (req, res) => {
  console.log('Update role endpoint activated (PATCH):', req.originalUrl);
  updateUserRole(req, res);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Auth-update error:', err.message);
  if (res.headersSent) {
    return next(err);
  }
  
  if (err.name === 'MongoError' || err.name === 'MongooseError' || err.name === 'MongoServerError') {
    console.error('MongoDB connection error in auth-update handler');
    return res.status(503).json({ 
      message: 'Database connection error', 
      error: 'Service temporarily unavailable'
    });
  }
  
  res.status(500).json({ 
    message: 'Update user role error', 
    error: err.message 
  });
});

export default app; 