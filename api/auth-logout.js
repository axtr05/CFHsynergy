import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { logout } from '../backend/controllers/auth.controller.js';

// Load environment variables
dotenv.config();

// Create express app
const app = express();

// Debug middleware
app.use((req, res, next) => {
  console.log(`Auth-logout endpoint requested: ${req.method} ${req.url}`);
  
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

console.log(`Auth-logout handler allowing origins: ${allowedOrigins.join(", ")}`);
console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS in auth-logout handler`);
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

// Register all possible variations of the logout endpoint path
app.post('*', (req, res) => {
  console.log('Logout endpoint activated');
  logout(req, res);
});

// Handle fallbacks for GET requests (should be POST but handle both)
app.get('*', (req, res) => {
  console.log('GET request to logout endpoint - should be POST');
  logout(req, res);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Auth-logout error:', err.message);
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({ 
    message: 'Logout error', 
    error: err.message 
  });
});

export default app; 