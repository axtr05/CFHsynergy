import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Define global MongoDB connection options
const mongooseOptions = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	serverSelectionTimeoutMS: 30000, // Increased timeout to 30 seconds
	socketTimeoutMS: 60000, // Close sockets after 60 seconds of inactivity
	family: 4, // Use IPv4, skip trying IPv6
	maxPoolSize: 5, // Reduced to 5 for serverless environments
	retryWrites: true, // Retry failed writes
	connectTimeoutMS: 30000, // Increased connection timeout
	// Add options to help with Vercel's serverless functions
	autoIndex: false, // Don't build indexes in production
	minPoolSize: 0, // Allow the pool to shrink to 0 during idle
	// Buffering allows requests to be queued while connecting
	bufferCommands: true,
	// Critical for serverless environments - fixes "buffering timed out" errors
	bufferTimeoutMS: 30000 // Increase from default 10000ms to 30000ms
};

// Connection retries configuration
const MAX_RETRIES = 3;
const RETRY_INTERVAL = 2000; // 2 seconds

// Initialize connection state
let retryCount = 0;
let isConnected = false;

// Create a cached connection variable
let cachedConnection = null;

/**
 * Connect to MongoDB with retries
 */
export const connectDB = async () => {
	// If we have a cached connection, use it
	if (cachedConnection) {
		console.log("Using cached MongoDB connection");
		return cachedConnection;
	}

	// If already connected through mongoose, use that
	if (isConnected && mongoose.connection.readyState === 1) {
		console.log("Using existing MongoDB connection");
		return mongoose.connection;
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
		
		// In serverless environments, we need to handle connecting when already connecting
		if (mongoose.connection.readyState === 2) {
			console.log("Connection already in progress, waiting...");
			// Wait for the connection to be established
			await new Promise((resolve) => {
				mongoose.connection.once('connected', resolve);
				mongoose.connection.once('error', resolve);
			});
			
			// Check if connected successfully
			if (mongoose.connection.readyState === 1) {
				console.log("Existing connection attempt succeeded");
				isConnected = true;
				cachedConnection = mongoose.connection;
				return mongoose.connection;
			}
			
			// If not connected, disconnect and try again
			console.log("Existing connection attempt failed, trying again");
			if (mongoose.connection.readyState !== 0) {
				await mongoose.disconnect();
			}
		}
		
		// Connect with our options
		const conn = await mongoose.connect(finalUri, mongooseOptions);
		
		// Cache the connection
		cachedConnection = conn;
		
		// Reset retry counter on successful connection
		retryCount = 0;
		isConnected = true;
		
		console.log(`MongoDB connected: ${conn.connection.host}`);
		
		// Add listeners for connection status
		mongoose.connection.on('disconnected', () => {
			console.log('MongoDB disconnected');
			isConnected = false;
			cachedConnection = null;
		});
		
		mongoose.connection.on('error', (err) => {
			console.error('MongoDB connection error:', err);
			isConnected = false;
			cachedConnection = null;
		});
		
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
		
		// Clear cached connection
		cachedConnection = null;
		isConnected = false;
		
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
		cachedConnection = null;
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
	