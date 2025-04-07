import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
	try {
		const token = req.cookies["jwt-cfh-synergy"];
		
		// Debug logging
		console.log("Auth Middleware - Cookies:", req.cookies);
		console.log("Auth Middleware - JWT Token:", token ? "Token exists" : "No token");

		if (!token) {
			return res.status(401).json({ message: "Unauthorized - No Token Provided" });
		}

		// Try-catch specifically for token verification to handle JWT errors better
		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			
			const user = await User.findById(decoded.userId).select("-password");

			if (!user) {
				return res.status(401).json({ message: "User not found" });
			}

			// Debug logging
			console.log("Auth Middleware - User authenticated:", user.username);
			
			req.user = user;
			next();
		} catch (jwtError) {
			// Debug logging
			console.log("Auth Middleware - JWT Error:", jwtError.name, jwtError.message);
			
			// Handle specific JWT errors
			if (jwtError.name === 'TokenExpiredError') {
				return res.status(401).json({ message: "Token expired, please log in again" });
			} else if (jwtError.name === 'JsonWebTokenError') {
				return res.status(401).json({ message: "Invalid token format" });
			} else {
				console.log("JWT Error:", jwtError.message);
				return res.status(401).json({ message: "Invalid authentication" });
			}
		}
	} catch (error) {
		// Debug logging
		console.log("Auth Middleware - General Error:", error.message);
		
		// Check if it's a network-related error
		if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
			console.log("Connection error in protectRoute middleware:", error.message);
			return res.status(503).json({ message: "Service temporarily unavailable, please try again" });
		}

		console.log("Error in protectRoute middleware:", error.message);
		res.status(500).json({ message: "Internal server error" });
	}
};
