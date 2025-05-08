<h1 align="center">CFH Synergy</h1>

### Run this app locally

```bash
npm run dev
```

### Start the app in production mode

```bash
npm start
```

## Deployment to Vercel

This project is configured for deployment on Vercel. Follow these steps to deploy:

1. Push your code to GitHub
2. Create a new project on [Vercel](https://vercel.com)
3. Import your GitHub repository
4. Configure the following environment variables in Vercel:
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Secret for JWT token generation
   - `JWT_EXPIRES_IN` - JWT expiration time (e.g., 7d)
   - `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
   - `CLOUDINARY_API_KEY` - Your Cloudinary API key
   - `CLOUDINARY_API_SECRET` - Your Cloudinary API secret

5. Deploy your application

The project is configured to automatically build and deploy both the frontend and backend.

