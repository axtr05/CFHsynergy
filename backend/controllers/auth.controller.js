import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const signup = async (req, res) => {
	try {
		const { name, username, email, password, userRole } = req.body;

		if (!name || !username || !email || !password) {
			return res.status(400).json({ message: "All fields are required" });
		}
		const existingEmail = await User.findOne({ email });
		if (existingEmail) {
			return res.status(400).json({ message: "Email already exists" });
		}

		const existingUsername = await User.findOne({ username });
		if (existingUsername) {
			return res.status(400).json({ message: "Username already exists" });
		}

		if (password.length < 6) {
			return res.status(400).json({ message: "Password must be at least 6 characters" });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		// Set user role if provided, otherwise defaults to "founder"
		const userData = {
			name,
			email,
			password: hashedPassword,
			username,
		};
		
		if (userRole && ["founder", "investor", "jobseeker"].includes(userRole)) {
			userData.userRole = userRole;
		}

		const user = new User(userData);
		await user.save();

		const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

		// Updated cookie settings
		res.cookie("jwt-cfh-synergy", token, {
			httpOnly: true,
			maxAge: 3 * 24 * 60 * 60 * 1000,
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Changed from strict to lax/none
			secure: process.env.NODE_ENV === "production",
			path: "/",
		});

		// Return user data that matches the format in getCurrentUser
		res.status(201).json({ 
			_id: user._id,
			name: user.name,
			username: user.username,
			email: user.email,
			userRole: user.userRole || null,
			onboardingCompleted: false,
			profilePicture: user.profilePicture,
			createdAt: user.createdAt
		});
	} catch (error) {
		console.log("Error in signup: ", error.message);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const updateUserOnboarding = async (req, res) => {
	try {
		const userId = req.user._id;
		const { 
			birthDate, 
			about, 
			skills, 
			education, 
			experience,
			investmentRange,
			investmentInterests,
			phone,
			linkedin
		} = req.body;

		// Find user and update onboarding fields
		const user = await User.findById(userId);
		
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Update common fields if provided
		if (birthDate) user.birthDate = new Date(birthDate);
		if (about) user.about = about;
		if (phone) user.phone = phone;
		if (linkedin) user.linkedin = linkedin;
		
		// Role-specific updates
		if (user.userRole === "founder" || user.userRole === "jobseeker") {
			if (skills) user.skills = skills;
			if (education) user.education = education;
			if (experience) user.experience = experience;
		}
		
		if (user.userRole === "investor") {
			if (investmentRange) user.investmentRange = investmentRange;
			if (investmentInterests) user.investmentInterests = investmentInterests;
		}
		
		// Mark onboarding as completed
		user.onboardingCompleted = true;
		
		await user.save();
		
		res.status(200).json({ 
			message: "User onboarding completed successfully",
			user: {
				_id: user._id,
				name: user.name,
				username: user.username,
				userRole: user.userRole,
				onboardingCompleted: user.onboardingCompleted
			}
		});
	} catch (error) {
		console.error("Error in updateUserOnboarding:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const login = async (req, res) => {
	try {
		const { username, password } = req.body;

		// Check if user exists
		const user = await User.findOne({ username });
		if (!user) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

		// Check password
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

		// Create and send token
		const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });
		
		// Updated cookie settings to match signup
		res.cookie("jwt-cfh-synergy", token, {
			httpOnly: true,
			maxAge: 3 * 24 * 60 * 60 * 1000,
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
			secure: process.env.NODE_ENV === "production",
			path: "/",
		});

		// Return user data in the same format as getCurrentUser
		res.json({
			_id: user._id,
			name: user.name,
			username: user.username,
			email: user.email,
			userRole: user.userRole,
			onboardingCompleted: user.onboardingCompleted,
			profilePicture: user.profilePicture,
			createdAt: user.createdAt
		});
	} catch (error) {
		console.error("Error in login controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const logout = (req, res) => {
	res.clearCookie("jwt-cfh-synergy");
	res.json({ message: "Logged out successfully" });
};

export const getCurrentUser = async (req, res) => {
	try {
		res.json(req.user);
	} catch (error) {
		console.error("Error in getCurrentUser controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const updateUserRole = async (req, res) => {
	try {
		const userId = req.user._id;
		const { userRole } = req.body;

		if (!userRole || !["founder", "investor", "jobseeker"].includes(userRole)) {
			return res.status(400).json({ message: "Valid user role is required" });
		}

		// Add logging
		console.log(`Updating role for user ${userId} to ${userRole}`);

		// Update with findById first to get full user data
		const user = await User.findById(userId);
		
		if (!user) {
			console.log(`User ${userId} not found`);
			return res.status(404).json({ message: "User not found" });
		}
		
		// Update the role
		user.userRole = userRole;
		await user.save();
		
		console.log(`User ${userId} role updated successfully to ${userRole}`);

		// Return user data in the same format as getCurrentUser for consistency
		res.status(200).json({
			message: "User role updated successfully",
			userRole: user.userRole,
			_id: user._id,
			name: user.name,
			username: user.username,
			email: user.email,
			onboardingCompleted: user.onboardingCompleted || false,
			profilePicture: user.profilePicture,
			createdAt: user.createdAt
		});
	} catch (error) {
		console.error("Error in updateUserRole:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

// This file should export functions for login and signup/register
// The register function might be named signup instead
