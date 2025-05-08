import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from '../backend/lib/db.js';
import { getCurrentUser } from '../backend/controllers/auth.controller.js';
import { protectRoute } from '../backend/middleware/auth.middleware.js';

// Load environment variables
dotenv.config();

// Connect to database
connectDB()
  .then(() => console.log('Connected to database in auth-me handler'))
  .catch(err => console.error('Database connection error in auth-me handler:', err.message));

// Create express app
const app = express();

// Debug middleware
app.use((req, res, next) => {
  console.log(`Auth-me endpoint requested: ${req.method} ${req.url}`);
  // Log cookies and headers for debugging
  console.log('Cookies:', req.headers.cookie);
  console.log('Auth header:', req.headers.authorization);
  next();
});

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS
const isDevelopment = process.env.NODE_ENV !== "production";
const clientUrl = process.env.CLIENT_URL || (isDevelopment ? "http://localhost:5173" : "https://cfhsynergy.vercel.app");
const allowedOrigins = [
  clientUrl,
  "https://cfhsynergy.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

console.log(`Auth-me handler allowing origins: ${allowedOrigins.join(", ")}`);
console.log(`Environment: ${process.env.NODE_ENV}`);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS in auth-me handler`);
      callback(null, false);
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
app.get('/api/v1/auth/me', protectRoute, getCurrentUser);
app.get('/api/auth/me', protectRoute, getCurrentUser);

// Direct access
app.get('/auth/me', protectRoute, getCurrentUser);

// Testing endpoint
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'Auth-me endpoint is working' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Auth-me error:', err.message);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ message: 'Auth handler error', error: err.message });
});

export default app; 