// Development server launcher
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.development if it exists
const envDevPath = path.resolve(process.cwd(), '.env.development');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envDevPath)) {
  console.log('Loading environment from .env.development');
  dotenv.config({ path: envDevPath });
} else if (fs.existsSync(envPath)) {
  console.log('Loading environment from .env');
  dotenv.config();
} else {
  console.warn('No .env or .env.development file found');
}

// Override NODE_ENV to development
process.env.NODE_ENV = 'development';
console.log(`Setting NODE_ENV to: ${process.env.NODE_ENV}`);
console.log(`Using CLIENT_URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);

// Start the server with nodemon
const server = spawn('npx', ['nodemon', 'backend/server.js'], {
  env: process.env,
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
});

console.log('Development server started. Press Ctrl+C to stop.'); 