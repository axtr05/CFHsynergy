import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';

import authRoutes from "../backend/routes/auth.route.js";
import userRoutes from "../backend/routes/user.route.js";
import postRoutes from "../backend/routes/post.route.js";
import notificationRoutes from "../backend/routes/notification.route.js";
import connectionRoutes from "../backend/routes/connection.route.js";
import projectRoutes from "../backend/routes/project.route.js";

import { connectDB } from "../backend/lib/db.js";

dotenv.config();

// Initialize DB connection
connectDB()
  .then(() => console.log('Connected to database'))
  .catch(err => {
    console.error('Database connection error:', err.message);
  });

// Create Express app
const app = express();

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`API Request: ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

// CORS settings - use the CLIENT_URL from env or default to Vercel URL
const isDevelopment = process.env.NODE_ENV !== "production";
const clientUrl = process.env.CLIENT_URL || (isDevelopment ? "http://localhost:5173" : "https://cfhsynergy.vercel.app");
const allowedOrigins = [
  clientUrl,
  "https://cfhsynergy.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

console.log(`Setting CORS to allow origins: ${allowedOrigins.join(", ")}`);
console.log(`Environment: ${process.env.NODE_ENV}`);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`Origin ${origin} not allowed by CORS`);
        callback(null, false);
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

// API routes - ensure they're mounted correctly
// We need these at /v1 routes for the frontend
app.use("/v1/auth", authRoutes);
app.use("/v1/users", userRoutes);
app.use("/v1/posts", postRoutes);
app.use("/v1/notifications", notificationRoutes);
app.use("/v1/connections", connectionRoutes);
app.use("/v1/projects", projectRoutes);

// Also mount at root level for direct API requests
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);
app.use("/notifications", notificationRoutes);
app.use("/connections", connectionRoutes);
app.use("/projects", projectRoutes);

// Health check endpoint
app.get("/v1/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    clientUrl: clientUrl
  });
});

// Root health check for direct testing
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("API error:", err.message);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ message: "Something went wrong, please try again later" });
});

// Export the Express app for serverless usage
export default app; 