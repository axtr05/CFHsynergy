import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';

import userRoutes from "../backend/routes/user.route.js";
import postRoutes from "../backend/routes/post.route.js";
import notificationRoutes from "../backend/routes/notification.route.js";
import connectionRoutes from "../backend/routes/connection.route.js";
import projectRoutes from "../backend/routes/project.route.js";

import { connectDB } from "../backend/lib/db.js";

dotenv.config();

// Initialize DB connection - but don't crash if it fails
let dbConnected = false;
connectDB()
  .then(() => {
    console.log('Connected to database');
    dbConnected = true;
  })
  .catch(err => {
    console.error('Database connection error:', err.message);
    // Don't crash the server - we'll retry on subsequent requests
  });

// Create Express app
const app = express();

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`API Request: ${req.method} ${req.url}`);
  console.log('Original URL:', req.originalUrl);
  console.log('Path:', req.path);
  
  // Remove any path query parameter as it's causing issues
  if (req.query.path) {
    console.log(`Removing unnecessary path parameter: ${req.query.path}`);
    delete req.query.path;
  }
  
  next();
});

// MongoDB connection check middleware
app.use(async (req, res, next) => {
  // Skip health check endpoints
  if (req.path === '/health' || req.path === '/v1/health') {
    return next();
  }
  
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

// Middleware
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

// CORS settings - use the CLIENT_URL from env or default to Vercel URL
const isDevelopment = process.env.NODE_ENV !== "production";
const clientUrl = process.env.CLIENT_URL || (isDevelopment ? "http://localhost:5173" : "https://cfhsynergy.vercel.app");
// Ensure allowedOrigins is always an array even if CLIENT_URL is undefined
const allowedOrigins = [
  clientUrl,
  "https://cfhsynergy.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
].filter(Boolean); // Remove any falsy values

console.log(`Setting CORS to allow origins: ${allowedOrigins.join(", ")}`);
console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`Origin ${origin} not allowed by CORS`);
        // Allow all origins in production for now to debug
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["set-cookie"]
  })
);

// Options pre-flight request handler for CORS
app.options('*', cors());

// Route handler factory function that extracts the real path
const createRouteHandler = (router) => {
  return (req, res, next) => {
    console.log('Route handler processing request path:', req.path);
    console.log('Original URL:', req.originalUrl);
    
    // Extract the path part after the handler path (api/v1/xyz)
    let actualPath = req.originalUrl.split('/');
    let startIndex = -1;
    
    for (let i = 0; i < actualPath.length; i++) {
      if (actualPath[i] === 'v1' && i < actualPath.length - 1) {
        startIndex = i + 1;
        break;
      }
    }
    
    if (startIndex === -1) {
      console.log('Could not find v1 in path, using full path');
      router(req, res, next);
      return;
    }
    
    // Modify the URL and base path for proper routing
    const resourceType = actualPath[startIndex];
    console.log('Extracted resource type:', resourceType);
    
    // Update req.url to be just the part after the resource type
    if (startIndex + 1 < actualPath.length) {
      req.url = '/' + actualPath.slice(startIndex + 1).join('/');
    } else {
      req.url = '/';
    }
    
    console.log('Modified request URL to:', req.url);
    router(req, res, next);
  };
};

// API routes with path extraction handler
app.use('/api/v1/users', createRouteHandler(userRoutes));
app.use('/api/v1/posts', createRouteHandler(postRoutes));
app.use('/api/v1/notifications', createRouteHandler(notificationRoutes));
app.use('/api/v1/connections', createRouteHandler(connectionRoutes));
app.use('/api/v1/projects', createRouteHandler(projectRoutes));

// For direct api/v1/users paths
app.use('/v1/users', createRouteHandler(userRoutes));
app.use('/v1/posts', createRouteHandler(postRoutes));
app.use('/v1/notifications', createRouteHandler(notificationRoutes));
app.use('/v1/connections', createRouteHandler(connectionRoutes));
app.use('/v1/projects', createRouteHandler(projectRoutes));

// Also mount at root level for fallback
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/notifications', notificationRoutes);
app.use('/connections', connectionRoutes);
app.use('/projects', projectRoutes);

// Health check endpoint
app.get("/v1/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'not set',
    clientUrl: clientUrl || 'not set',
    database: dbConnected ? "connected" : "disconnected"
  });
});

// Root health check for direct testing
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    database: dbConnected ? "connected" : "disconnected"
  });
});

// Debugging endpoint to help diagnose route issues
app.get('/api/debug', (req, res) => {
  res.status(200).json({
    message: 'API Debug Information',
    originalUrl: req.originalUrl,
    path: req.path,
    baseUrl: req.baseUrl,
    hostname: req.hostname,
    ip: req.ip,
    method: req.method,
    protocol: req.protocol,
    query: req.query,
    headers: req.headers,
    cookies: req.cookies,
    timestamp: new Date().toISOString()
  });
});

// Catch-all route for debugging unmatched routes
app.all('*', (req, res) => {
  console.log(`Unmatched API route: ${req.method} ${req.originalUrl}`);
  console.log('Path:', req.path);
  console.log('Base URL:', req.baseUrl);
  
  res.status(404).json({
    message: 'API endpoint not found',
    originalUrl: req.originalUrl,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      '/api/v1/users',
      '/api/v1/posts',
      '/api/v1/notifications',
      '/api/v1/connections',
      '/api/v1/projects',
      '/api/v1/health'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("API error:", err.message);
  
  if (res.headersSent) {
    return next(err);
  }
  
  // Handle MongoDB errors specifically
  if (err.name === 'MongoError' || err.name === 'MongooseError' || err.name === 'MongoServerError') {
    return res.status(503).json({
      message: "Database error. Please try again later.",
      error: "Service temporarily unavailable"
    });
  }
  
  res.status(500).json({ message: "Something went wrong, please try again later" });
});

// Export the Express app for serverless usage
export default app; 