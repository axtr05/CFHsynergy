#!/bin/bash

echo "Running custom Vercel build script"
# Install root dependencies
npm install

# Build frontend
cd frontend
echo "Installing frontend dependencies with --no-optional..."
npm install --no-optional

echo "Building frontend with npm run vercel-build..."
npm run vercel-build

cd ..

# Verify the output directory exists
if [ -d "frontend/dist" ]; then
  echo "Build completed successfully - dist directory exists"
  ls -la frontend/dist
else
  echo "ERROR: frontend/dist directory not found after build!"
  exit 1
fi 