# Deployment Guide for CFH Synergy

This guide will help you deploy your CFH Synergy application to a production environment.

## Prerequisites

- Node.js (v18+ recommended)
- MongoDB database (you can use MongoDB Atlas)
- Cloudinary account for image storage

## Build Process

Your application is already set up with the necessary build scripts. To create a production build:

```bash
# Install dependencies and build frontend
npm run build
```

This will:
1. Install backend dependencies
2. Install frontend dependencies
3. Build the frontend React application

## Environment Variables

Make sure to set up your environment variables properly in production:

1. Use the `.env.production` file or set environment variables directly in your hosting provider:

```
NODE_ENV=production
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=your_production_url
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

2. Make sure to update `CLIENT_URL` to your actual production domain.

## Deployment Options

### Option 1: Deploy to Heroku

1. Create a Heroku account and install Heroku CLI
2. Login to Heroku: `heroku login`
3. Create a new Heroku app: `heroku create your-app-name`
4. Set environment variables in Heroku dashboard or via CLI:
   ```
   heroku config:set NODE_ENV=production
   heroku config:set MONGO_URI=your_mongodb_connection_string
   heroku config:set JWT_SECRET=your_jwt_secret
   heroku config:set CLIENT_URL=https://your-app-name.herokuapp.com
   heroku config:set CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   heroku config:set CLOUDINARY_API_KEY=your_cloudinary_api_key
   heroku config:set CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```
5. Push to Heroku: `git push heroku main`

### Option 2: Deploy to Render

1. Create a Render account
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure:
   - Build Command: `npm run build`
   - Start Command: `npm start`
5. Set environment variables in the Render dashboard

### Option 3: Deploy to Digital Ocean App Platform

1. Create a Digital Ocean account
2. Create a new App
3. Connect your GitHub repository
4. Configure:
   - Build Command: `npm run build`
   - Run Command: `npm start`
5. Set environment variables in the Digital Ocean dashboard

## Running in Production

Once deployed, your application will run using:

```bash
npm start
```

This starts your Node.js server in production mode which will serve both the API endpoints and the built frontend files.

## Post-Deployment

1. Test all functionalities
2. Monitor server logs for any errors
3. Set up proper SSL certificates (most platforms handle this automatically)
4. Consider setting up a CI/CD pipeline for automated deployments 