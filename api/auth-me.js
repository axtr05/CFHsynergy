import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { connectDB } from '../backend/lib/db.js';
import { getCurrentUser } from '../backend/controllers/auth.controller.js';
import { protectRoute } from '../backend/middleware/auth.middleware.js';

// Load environment variables
dotenv.config();

// Track connection state
let dbConnected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 2;

// Connect to database
connectDB()
  .then(() => {
    console.log('Connected to database in auth-me handler');
    dbConnected = true;
    connectionAttempts = 0;
  })
  .catch(err => {
    console.error('Database connection error in auth-me handler:', err.message);
    connectionAttempts++;
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

// MongoDB connection check middleware with fallback authentication
app.use(async (req, res, next) => {
  // Skip options requests
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // Try to reconnect to MongoDB if not connected
  if (!dbConnected && connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
    try {
      console.log('Attempting to reconnect to MongoDB...');
      await connectDB();
      dbConnected = true;
      connectionAttempts = 0;
      console.log('Successfully reconnected to MongoDB');
    } catch (error) {
      console.error('Failed to reconnect to MongoDB:', error.message);
      connectionAttempts++;
      
      // Fallback: If this is a GET request and we can verify the token without DB
      if (req.method === 'GET' && (req.cookies.jwt || req.cookies['jwt-cfh-synergy'] || 
          (req.headers.authorization && req.headers.authorization.startsWith('Bearer')))) {
        
        // We'll proceed and let the JWT token be verified without DB validation
        console.log('Using token-only authentication fallback (no DB validation)');
        req.useDblessAuth = true;
        return next();
      }
      
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: 'Could not connect to database. Please try again later.',
        retryAfter: 5
      });
    }
  } else if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    // If we've tried too many times, attempt fallback auth without DB
    if (req.method === 'GET' && (req.cookies.jwt || req.cookies['jwt-cfh-synergy'] || 
        (req.headers.authorization && req.headers.authorization.startsWith('Bearer')))) {
      
      console.log('Max DB connection attempts reached, using token-only authentication');
      req.useDblessAuth = true;
      return next();
    }
    
    return res.status(503).json({ 
      message: 'Database temporarily unavailable',
      error: 'Service experiencing high load. Please try again later.',
      retryAfter: 30
    });
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

// Custom cookie middleware to copy jwt-cfh-synergy to jwt for auth middleware compatibility
app.use((req, res, next) => {
  if (req.cookies['jwt-cfh-synergy'] && !req.cookies.jwt) {
    console.log('Copying jwt-cfh-synergy cookie to jwt for compatibility');
    // Add the cookie to both the request cookies and the raw cookie header
    req.cookies.jwt = req.cookies['jwt-cfh-synergy'];
  }
  next();
});

// Fallback authentication middleware for when DB is unreachable
const dblessAuth = async (req, res, next) => {
  try {
    // Get token from different possible sources
    const token = req.cookies.jwt || 
                  req.cookies['jwt-cfh-synergy'] || 
                  (req.headers.authorization && req.headers.authorization.startsWith("Bearer") 
                    ? req.headers.authorization.split(" ")[1] 
                    : null);
    
    if (!token) {
      console.log("No token provided in cookies or headers");
      return res.status(401).json({ message: "Not authenticated. Please log in." });
    }
    
    // Verify token without DB check
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.userId) {
      console.log("Token verification failed");
      return res.status(401).json({ message: "Invalid token" });
    }
    
    // Since we can't fetch user from DB, just provide minimal user info
    req.user = { 
      _id: decoded.userId,
      // Add minimal required data for frontend to function
      fromTokenOnly: true,
      tokenExp: decoded.exp,
      iat: decoded.iat
    };
    
    console.log("User authenticated via token only (no DB validation)");
    next();
  } catch (error) {
    console.error("Token auth error:", error.message);
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired. Please log in again." });
    }
    
    res.status(401).json({ message: "Authentication failed" });
  }
};

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
app.get('*', (req, res, next) => {
  // Choose which auth method to use based on DB availability
  if (req.useDblessAuth) {
    dblessAuth(req, res, next);
  } else {
    protectRoute(req, res, next);
  }
}, handleAuthErrors, (req, res) => {
  console.log('Auth/me handler activated for:', req.path);
  
  // If we used dbless auth, return minimal user info
  if (req.user && req.user.fromTokenOnly) {
    return res.json({
      _id: req.user._id,
      tokenAuthenticated: true,
      message: "Limited authentication successful - database connection unavailable"
    });
  }
  
  // Otherwise use the normal controller
  getCurrentUser(req, res);
});

// Testing endpoint that doesn't require auth
app.get('/test', (req, res) => {
  res.status(200).json({ 
    message: 'Auth-me endpoint is working',
    dbConnected: dbConnected,
    connectionAttempts
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Auth-me error:', err.message);
  if (res.headersSent) {
    return next(err);
  }
  
  if (err.name === 'MongoError' || err.name === 'MongooseError' || err.name === 'MongoServerError') {
    console.error('MongoDB connection error in auth handler');
    return res.status(503).json({ 
      message: 'Database connection error', 
      error: 'Service temporarily unavailable',
      retryAfter: 10
    });
  }
  
  res.status(500).json({ 
    message: 'Auth handler error', 
    error: err.message 
  });
});

export default app; 