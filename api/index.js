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

// Middleware
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

// CORS settings
app.use(
  cors({
    origin: ["https://cfhsynergy.vercel.app", "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["set-cookie"]
  })
);

// API routes - adding the /v1 path to match the expected URLs
app.use("/v1/auth", authRoutes);
app.use("/v1/users", userRoutes);
app.use("/v1/posts", postRoutes);
app.use("/v1/notifications", notificationRoutes);
app.use("/v1/connections", connectionRoutes);
app.use("/v1/projects", projectRoutes);

// Health check endpoint
app.get("/v1/health", (req, res) => {
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