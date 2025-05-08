import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from '../backend/lib/db.js';
import { login, register } from '../backend/controllers/auth.controller.js';

// Load environment variables
dotenv.config();

// Connect to database
let dbConnected = false;
connectDB()
  .then(() => {
    console.log('Connected to database in auth-main handler');
    dbConnected = true;
  })
  .catch(err => {
    console.error('Database connection error in auth-main handler:', err.message);
    // Don't crash the server - we'll retry on subsequent requests
  });

// Create express app
const app = express();

// Debug middleware
app.use((req, res, next) => {
  console.log(`Auth-main endpoint requested: ${req.method} ${req.url}`);
  
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
const allowedOrigins = [
  clientUrl,
  "https://cfhsynergy.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

console.log(`Auth-main handler allowing origins: ${allowedOrigins.join(", ")}`);
console.log(`Environment: ${process.env.NODE_ENV}`);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS in auth-main handler`);
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

// Auth routes
app.post('/api/v1/auth/login', login);
app.post('/api/auth/login', login);
app.post('/auth/login', login);

app.post('/api/v1/auth/signup', register);
app.post('/api/v1/auth/register', register);
app.post('/api/auth/signup', register);
app.post('/api/auth/register', register);
app.post('/auth/signup', register);
app.post('/auth/register', register);

// Catch-all route for other auth endpoints
app.all('*', (req, res) => {
  console.log(`Received request to unmapped auth endpoint: ${req.method} ${req.path}`);
  res.status(404).json({ 
    message: 'Auth endpoint not found', 
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Auth-main error:', err.message);
  if (res.headersSent) {
    return next(err);
  }
  
  if (err.name === 'MongoError' || err.name === 'MongooseError' || err.name === 'MongoServerError') {
    console.error('MongoDB connection error in auth-main handler');
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