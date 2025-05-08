# Deploying CFH Synergy to Vercel

This guide will help you deploy your CFH Synergy application to Vercel.

## Prerequisites

- A [Vercel](https://vercel.com) account
- [Git](https://git-scm.com) installed on your system
- Your project pushed to a GitHub, GitLab, or Bitbucket repository

## Setup for Vercel Deployment

The project has been configured with the following files for Vercel deployment:

1. `vercel.json` - Configuration for both frontend and backend
2. Frontend package.json with `vercel-build` script
3. API configuration with proper baseURL for production

## Deployment Steps

### 1. Push to GitHub

Make sure your project is pushed to a GitHub, GitLab, or Bitbucket repository.

### 2. Import to Vercel

1. Login to your [Vercel dashboard](https://vercel.com/dashboard)
2. Click "Add New" and select "Project"
3. Import your repository from GitHub, GitLab, or Bitbucket
4. Select the repository containing your project

### 3. Configure Project

Once you've imported your project, you'll need to configure it:

1. **Framework Preset**: Select "Other" (since we're using a custom configuration)
2. **Root Directory**: Keep the default (the root of your repository)
3. **Build Command**: Use the default (Vercel will use the configuration in vercel.json)
4. **Output Directory**: Use the default (Vercel will use the configuration in vercel.json)

### 4. Set Environment Variables

Add all necessary environment variables by clicking on "Environment Variables". Add the following:

```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://axtroffi:axtrkj05@cfhsynergy.vfo4amg.mongodb.net/
JWT_SECRET=09357a78e131f2895bf034c8cc894bbe292c65130c0b709419d9cf31b5a6435a
CLIENT_URL=https://[your-vercel-domain].vercel.app
CLOUDINARY_CLOUD_NAME=dgnl5m1lo
CLOUDINARY_API_KEY=248251314587779
CLOUDINARY_API_SECRET=wFQWx0kcmEFhTAGugLM9l1hou7k
```

Replace `[your-vercel-domain]` with your actual Vercel domain (e.g., `cfh-synergy.vercel.app`).

### 5. Deploy

Click "Deploy" and Vercel will start the deployment process:

1. Vercel will clone your repository
2. It will install dependencies for both frontend and backend
3. It will build your frontend using Vite
4. It will deploy both your frontend and API

### 6. Configure Custom Domain (Optional)

If you have a custom domain you want to use:

1. In your project on Vercel, go to "Settings" > "Domains"
2. Add your custom domain
3. Follow the instructions to configure DNS settings

## Troubleshooting

If you encounter issues with the deployment:

1. **Check Logs**: In your Vercel dashboard, click on your project and select "Deployments". Click on the most recent deployment to view build logs.

2. **API Issues**: If your frontend builds but the API doesn't work correctly, check:
   - Verify MongoDB connection string is correct
   - Ensure all environment variables are set properly
   - Check CORS settings in your server.js

3. **Build Failures**: If the build fails, check:
   - Verify all dependencies are correctly installed
   - Check for any syntax errors in your code
   - Make sure your Node.js version is compatible (we've specified >=18.0.0)

## Next Steps After Deployment

1. Update your `.env.production` file locally with the final Vercel URL
2. Test all features thoroughly in the deployed application
3. Monitor the application logs in Vercel for any issues

Your CFH Synergy application should now be successfully deployed to Vercel!