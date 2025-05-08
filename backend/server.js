import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import http from "http";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import notificationRoutes from "./routes/notification.route.js";
import connectionRoutes from "./routes/connection.route.js";
import projectRoutes from "./routes/project.route.js";

import { connectDB } from "./lib/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

// Increase timeout for all requests to prevent ECONNRESET errors
const serverConfig = {
	headersTimeout: 60000, // 60 seconds
	keepAliveTimeout: 30000, // 30 seconds
};

if (process.env.NODE_ENV !== "production") {
	app.use(
		cors({
			origin: "http://localhost:5173",
			credentials: true,
			methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
			allowedHeaders: ["Content-Type", "Authorization"],
			exposedHeaders: ["set-cookie"]
		})
	);
} else {
	// Production CORS config (will work with Vercel)
	const corsOptions = {
		origin: process.env.CLIENT_URL || true, // Allow requests from the specified domain or all domains if not set
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
		allowedHeaders: ["Content-Type", "Authorization"],
		exposedHeaders: ["set-cookie"]
	};
	
	app.use(cors(corsOptions));
}

// Add some debug logging for requests
app.use((req, res, next) => {
	console.log(`${req.method} ${req.url}`);
	next();
});

// Increase payload size limit and add proper error handling
app.use(express.json({ 
	limit: "15mb",
	verify: (req, res, buf, encoding) => {
		try {
			JSON.parse(buf);
		} catch (e) {
			res.status(400).json({ message: "Invalid JSON payload" });
			throw new Error("Invalid JSON");
		}
	}
}));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

// Add global error handler for uncaught errors
app.use((err, req, res, next) => {
	console.error("Global error handler caught:", err.message);
	if (res.headersSent) {
		return next(err);
	}
	res.status(500).json({ message: "Something went wrong, please try again later" });
});

// Add request timeout handling
app.use((req, res, next) => {
	req.setTimeout(30000, () => {
		console.log('Request timeout');
		if (!res.headersSent) {
			res.status(408).json({ message: "Request timeout, please try again" });
		}
	});
	next();
});

// Add a health check endpoint for monitoring
app.get("/api/v1/health", (req, res) => {
	res.status(200).json({ 
		status: "ok", 
		timestamp: new Date().toISOString(),
		uptime: process.uptime()
	});
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/connections", connectionRoutes);
app.use("/api/v1/projects", projectRoutes);

if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "/frontend/dist")));

	app.get("*", (req, res) => {
		res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
	});
}

// Create HTTP server with our Express app
const server = http.createServer(serverConfig, app);

// Proper server error handling
server.on('error', (err) => {
	if (err.code === 'EADDRINUSE') {
		console.log(`Port ${PORT} is busy, trying ${PORT + 1}...`);
		server.listen(PORT + 1);
	} else {
		console.error('Server error:', err);
		process.exit(1);
	}
});

// Properly handle connections
server.on('connection', socket => {
	// Set socket timeout to prevent hanging connections
	socket.setTimeout(30000);
	socket.on('error', (err) => {
		console.log('Socket error:', err.message);
	});
});

// Start the server
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	// Connect to database
	connectDB()
		.then(() => console.log('Connected to database'))
		.catch(err => {
			console.error('Database connection error:', err.message);
			// Don't crash the server if DB connection fails
			// We'll retry connection on subsequent requests
		});
});
