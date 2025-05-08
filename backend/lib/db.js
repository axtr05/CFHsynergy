import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Define global MongoDB connection options
const mongooseOptions = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	serverSelectionTimeoutMS: 15000, // Increased timeout to 15 seconds
	socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
	family: 4, // Use IPv4, skip trying IPv6
	maxPoolSize: 10, // Maintain up to 10 socket connections
	retryWrites: true, // Retry failed writes
	connectTimeoutMS: 15000, // Increased connection timeout
	// Add options to help with Vercel's serverless functions
	autoIndex: false, // Don't build indexes in production
	minPoolSize: 0 // Allow the pool to shrink to 0 during idle
};

// Connection retries configuration
const MAX_RETRIES = 3;
const RETRY_INTERVAL = 2000; // 2 seconds

// Initialize connection state
let retryCount = 0;
let isConnected = false;

/**
 * Connect to MongoDB with retries
 */
export const connectDB = async () => {
	// If already connected, return
	if (isConnected) {
		console.log("Using existing MongoDB connection");
		return;
	}
	
	// Get MongoDB URI from environment - try both possible env var names
	const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
	
	if (!MONGODB_URI) {
		console.error("MONGODB_URI or MONGO_URI is not defined in environment variables");
		throw new Error("Database connection string is not defined in environment variables");
	}
	
	try {
		// Attempt connection
		console.log(`Connecting to MongoDB (attempt ${retryCount + 1} of ${MAX_RETRIES + 1})...`);
		
		// Add retryWrites and w=majority parameters if they're not already in the URI
		let finalUri = MONGODB_URI;
		if (!finalUri.includes('retryWrites=')) {
			finalUri += finalUri.includes('?') ? '&retryWrites=true' : '?retryWrites=true';
		}
		if (!finalUri.includes('w=majority')) {
			finalUri += '&w=majority';
		}
		
		const conn = await mongoose.connect(finalUri, mongooseOptions);
		
		// Reset retry counter on successful connection
		retryCount = 0;
		isConnected = true;
		
		console.log(`MongoDB connected: ${conn.connection.host}`);
		return conn;
	} catch (error) {
		// Increment retry counter
		retryCount++;
		
		// Handle different types of errors
		if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
			console.error(`MongoDB connection error (Network/ServerSelection): ${error.message}`);
			
			if (retryCount <= MAX_RETRIES) {
				console.log(`Retrying connection in ${RETRY_INTERVAL/1000} seconds...`);
				await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
				return connectDB(); // Recursive retry
			}
		}
		
		// More detailed error message for debugging
		let errorDetails = {
			name: error.name,
			message: error.message,
			stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
		};
		
		console.error("MongoDB connection failed:", errorDetails);
		
		// Throw a more user-friendly error
		throw new Error(`Error connecting to MongoDB: ${error.message}`);
	}
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDB = async () => {
	if (mongoose.connection.readyState !== 0) {
		await mongoose.disconnect();
		isConnected = false;
		console.log("Disconnected from MongoDB");
	}
};

// Handle process termination
process.on('SIGINT', async () => {
	await disconnectDB();
	process.exit(0);
});

// Export the mongoose connection for external use
export const db = mongoose.connection;
	