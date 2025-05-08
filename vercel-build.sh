#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

echo "Running custom Vercel build script"
# Install root dependencies
npm install

# Move frontend directory for build
cd frontend
echo "Installing frontend dependencies..."
npm install --omit=dev

echo "Checking if vite is available in node_modules..."
if [ -f "./node_modules/.bin/vite" ]; then
  echo "Vite found at ./node_modules/.bin/vite"
else
  echo "Vite not found in node_modules. Installing vite specifically..."
  npm install --save-dev vite@6.3.5
fi

echo "Building frontend with explicit path to vite..."
NODE_ENV=production ./node_modules/.bin/vite build

# Return to project root
cd ..

# Verify the output directory exists
if [ -d "frontend/dist" ]; then
  echo "Build completed successfully - dist directory exists"
  ls -la frontend/dist
else
  echo "ERROR: frontend/dist directory not found after build!"
  exit 1
fi 