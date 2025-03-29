import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import Post from "../models/post.model.js";
import ConnectionRequest from "../models/connectionRequest.model.js";
import Notification from "../models/notification.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getSuggestedConnections = async (req, res) => {
	try {
		const currentUser = await User.findById(req.user._id).select("connections");

		// find users who are not already connected, and also do not recommend our own profile
		const suggestedUsers = await User.find({
			_id: {
				$ne: req.user._id,
				$nin: currentUser.connections,
			},
		})
			.select("name username profilePicture headline")
			.sort({ createdAt: -1 }); // Sort by newest users first

		res.json(suggestedUsers);
	} catch (error) {
		console.error("Error in getSuggestedConnections controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const getPublicProfile = async (req, res) => {
	try {
		const user = await User.findOne({ username: req.params.username }).select("-password");

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.json(user);
	} catch (error) {
		console.error("Error in getPublicProfile controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const updateProfile = async (req, res) => {
	try {
		const allowedFields = [
			"name",
			"username",
			"headline",
			"about",
			"location",
			"profilePicture",
			"bannerImg",
			"skills",
			"experience",
			"education",
		];

		const updatedData = {};

		for (const field of allowedFields) {
			if (req.body[field] && field !== "profilePicture" && field !== "bannerImg") {
				updatedData[field] = req.body[field];
			}
		}

		// Get current user info for cloudinary IDs
		const currentUser = await User.findById(req.user._id);

		if (req.body.profilePicture) {
			// Upload to Cloudinary
			const uploadResult = await cloudinary.uploader.upload(req.body.profilePicture, {
				folder: "cfh-synergy/profiles",
			});
			updatedData.profilePicture = uploadResult.secure_url;
			updatedData.profilePictureId = uploadResult.public_id;
			
			// Delete old profile picture if exists
			if (currentUser.profilePictureId) {
				await cloudinary.uploader.destroy(currentUser.profilePictureId);
			}
		}

		if (req.body.bannerImg) {
			// Upload to Cloudinary
			const uploadResult = await cloudinary.uploader.upload(req.body.bannerImg, {
				folder: "cfh-synergy/banners",
			});
			updatedData.bannerImg = uploadResult.secure_url;
			updatedData.bannerImgId = uploadResult.public_id;
			
			// Delete old banner image if exists
			if (currentUser.bannerImgId) {
				await cloudinary.uploader.destroy(currentUser.bannerImgId);
			}
		}

		const user = await User.findByIdAndUpdate(
			req.user._id, 
			{ $set: updatedData }, 
			{ new: true }
		).select("-password");

		res.json(user);
	} catch (error) {
		console.error("Error in updateProfile controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const deleteUser = async (req, res) => {
	try {
		const { username } = req.params;
		const { password } = req.body;

		// Verify user is deleting their own profile
		if (req.user.username !== username) {
			return res.status(403).json({ message: "Not authorized to delete this profile" });
		}

		// Verify password
		const user = await User.findById(req.user._id);
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(400).json({ message: "Invalid password" });
		}

		// Delete user's posts
		await Post.deleteMany({ author: user._id });

		// Delete user's connection requests
		await ConnectionRequest.deleteMany({
			$or: [{ sender: user._id }, { recipient: user._id }]
		});

		// Delete user's notifications
		await Notification.deleteMany({
			$or: [{ recipient: user._id }, { relatedUser: user._id }]
		});

		// Remove user from others' connections
		await User.updateMany(
			{ connections: user._id },
			{ $pull: { connections: user._id } }
		);

		// Delete profile pictures from Cloudinary if they exist
		if (user.profilePictureId) {
			try {
				await cloudinary.uploader.destroy(user.profilePictureId);
			} catch (error) {
				console.error("Error deleting profile picture:", error);
			}
		}
		if (user.bannerImgId) {
			try {
				await cloudinary.uploader.destroy(user.bannerImgId);
			} catch (error) {
				console.error("Error deleting banner image:", error);
			}
		}

		// Finally delete the user
		await User.findByIdAndDelete(user._id);

		// Clear the auth cookie
		res.clearCookie("jwt-cfh-synergy");
		
		res.json({ message: "Profile deleted successfully" });
	} catch (error) {
		console.error("Error in deleteUser controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const searchUsers = async (req, res) => {
	try {
		const { query } = req.query;
		
		if (!query) {
			return res.status(400).json({ message: "Search query is required" });
		}
		
		// Search for users whose username or name contains the query string
		const users = await User.find({
			$or: [
				{ username: { $regex: query, $options: "i" } },
				{ name: { $regex: query, $options: "i" } }
			]
		})
		.limit(5) // Limit to 5 results for suggestions
		.select("name username profilePicture headline");
		
		res.json(users);
	} catch (error) {
		console.error("Error in searchUsers controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};
