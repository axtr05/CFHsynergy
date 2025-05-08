import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from '../backend/lib/db.js';
import { getCurrentUser } from '../backend/controllers/auth.controller.js';
import { protectRoute } from '../backend/middleware/auth.middleware.js';

// Load environment variables
dotenv.config();

// Track connection state
let dbConnected = false;

// Connect to database
connectDB()
  .then(() => {
    console.log('Connected to database in auth-me handler');
    dbConnected = true;
  })
  .catch(err => {
    console.error('Database connection error in auth-me handler:', err.message);
    // Don't crash the server - we'll retry on subsequent requests
  });

// Create express app
const app = express();

// Debug middleware
app.use((req, res, next) => {
  console.log(`Auth-me endpoint requested: ${req.method} ${req.url}`);
  // Log cookies and headers for debugging
  console.log('Cookies:', req.headers.cookie || 'none');
  console.log('Auth header:', req.headers.authorization || 'none');
  
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

console.log(`Auth-me handler allowing origins: ${allowedOrigins.join(", ")}`);
console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS in auth-me handler`);
      // Allow all origins in production for now to debug
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

// Handle preflight requests
app.options('*', cors());

// Custom error handler for protectRoute to send proper 401 responses
const handleAuthErrors = (err, req, res, next) => {
  if (err.message === 'No token provided' || err.message === 'Invalid token') {
    return res.status(401).json({ 
      message: 'Unauthorized - not logged in',
      error: err.message
    });
  }
  next(err);
};

// Special handler for any auth/me endpoint regardless of path
app.get('*', protectRoute, handleAuthErrors, (req, res) => {
  console.log('Special auth/me handler activated for:', req.path);
  getCurrentUser(req, res);
});

// Testing endpoint that doesn't require auth
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'Auth-me endpoint is working' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Auth-me error:', err.message);
  if (res.headersSent) {
    return next(err);
  }
  
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    console.error('MongoDB connection error in auth handler');
    return res.status(503).json({ 
      message: 'Database connection error', 
      error: 'Service temporarily unavailable'
    });
  }
  
  res.status(500).json({ 
    message: 'Auth handler error', 
    error: err.message 
  });
});

export default app; 