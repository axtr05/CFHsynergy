import express from 'express';
import cors from 'cors';

// Create express app
const app = express();

// Debug middleware
app.use((req, res, next) => {
  console.log(`Health check endpoint requested: ${req.method} ${req.url}`);
  next();
});

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Health check endpoint
app.get('*', (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'not set',
    path: req.path,
    message: "Server is running"
  });
});

// Export the Express app for serverless usage
export default app; 