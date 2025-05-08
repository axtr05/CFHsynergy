#!/bin/bash

echo "Running custom Vercel build script"
npm install
cd frontend
npm install
npm run build
cd ..
echo "Build completed successfully" 