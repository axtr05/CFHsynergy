// Debug endpoint to help diagnose API issues
export default function handler(req, res) {
  try {
    // Get environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      CLIENT_URL: process.env.CLIENT_URL,
      PORT: process.env.PORT,
      // Don't include sensitive info like MONGO_URI or JWT_SECRET
      DB_CONNECTED: !!process.env.MONGO_URI,
      JWT_CONFIGURED: !!process.env.JWT_SECRET,
      CLOUDINARY_CONFIGURED: !!process.env.CLOUDINARY_CLOUD_NAME
    };

    // Return info
    return res.status(200).json({
      message: "Debug info",
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method,
      headers: req.headers,
      cookies: req.cookies,
      envVars,
      vercel: true
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
} 