import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
	try {
		// Get token from cookie or header
		const token = req.cookies.jwt || (req.headers.authorization && req.headers.authorization.startsWith("Bearer") 
			? req.headers.authorization.split(" ")[1] 
			: null);

		console.log("Auth Middleware - JWT Token:", token ? "Token found" : "No token");
		
		// Check if token exists
		if (!token) {
			console.log("No token provided in cookies or headers");
			const error = new Error("No token provided");
			error.statusCode = 401;
			throw error;
		}

		// Verify token
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		if (!decoded || !decoded.userId) {
			console.log("Token verification failed");
			throw new Error("Invalid token");
		}

		// Get user from database
		const user = await User.findById(decoded.userId).select("-password");
		if (!user) {
			console.log("User not found for token:", decoded.userId);
			throw new Error("User not found");
		}

		// Add user to request
		req.user = user;
		next();
	} catch (error) {
		console.error("Auth middleware error:", error.message);
		
		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ message: "Invalid token" });
		}
		
		if (error.name === "TokenExpiredError") {
			return res.status(401).json({ message: "Token expired. Please log in again." });
		}
		
		if (error.message === "No token provided") {
			return res.status(401).json({ message: "Not authenticated. Please log in." });
		}
		
		// For database connection errors, don't reveal details
		if (error.name === "MongoError" || error.name === "MongooseError") {
			return res.status(503).json({ message: "Service temporarily unavailable. Please try again later." });
		}
		
		// Pass to next error handler for other errors
		next(error);
	}
};
