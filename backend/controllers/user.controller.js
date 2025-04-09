import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import Post from "../models/post.model.js";
import ConnectionRequest from "../models/connectionRequest.model.js";
import Notification from "../models/notification.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getSuggestedConnections = async (req, res) => {
	try {
		const currentUser = await User.findById(req.user._id).select("connections userRole");
		const { role = "default", limit = 6 } = req.query;

		// Base query to find users who are not already connected
		let query = {
			_id: {
				$ne: req.user._id,
				$nin: currentUser.connections,
			},
		};
		
		// Role-specific filtering
		if (role === "founder" && currentUser.userRole === "founder") {
			// Founders see investors
			query.userRole = "investor";
		} else if (role === "investor" && currentUser.userRole === "investor") {
			// Investors see founders
			query.userRole = "founder";
		} else if (role === "job_seeker" && currentUser.userRole === "job_seeker") {
			// Job seekers see founders
			query.userRole = "founder";
		}
		
		// Adding second-degree connection recommendations
		let secondDegreeConnections = [];
		
		// Only do this calculation if we have at least one connection
		if (currentUser.connections && currentUser.connections.length > 0) {
			// Find all connections of current user's connections
			const userConnections = await User.find({
				_id: { $in: currentUser.connections }
			}).select("connections");
			
			// Extract all second-degree connections
			const allSecondDegreeIds = userConnections.flatMap(u => u.connections || []);
			
			// Filter out current user and direct connections
			const filteredSecondDegreeIds = allSecondDegreeIds.filter(id => 
				id.toString() !== req.user._id.toString() && 
				!currentUser.connections.includes(id)
			);
			
			// Get unique IDs only
			const uniqueSecondDegreeIds = [...new Set(filteredSecondDegreeIds.map(id => id.toString()))];
			
			// Find user documents for these second-degree connections
			if (uniqueSecondDegreeIds.length > 0) {
				// Apply role filtering to second-degree connections too
				let secondDegreeQuery = {
					_id: { $in: uniqueSecondDegreeIds }
				};
				
				if (query.userRole) {
					secondDegreeQuery.userRole = query.userRole;
				}
				
				secondDegreeConnections = await User.find(secondDegreeQuery)
					.select("name username profilePicture headline userRole")
					.limit(Math.min(Number(limit), 6)); // Cap at requested limit or 6
			}
		}
		
		// Find regular suggestions based on roles
		const roleSuggestions = await User.find(query)
			.select("name username profilePicture headline userRole")
			.sort({ createdAt: -1 }) // Sort by newest users first
			.limit(Math.min(Number(limit), 6)); // Cap at requested limit or 6
		
		// Combine and deduplicate based on user ID
		const allSuggestions = [...secondDegreeConnections, ...roleSuggestions];
		const uniqueSuggestions = Array.from(
			new Map(allSuggestions.map(user => [user._id.toString(), user])).values()
		);
		
		// Return only the requested number of suggestions
		const finalSuggestions = uniqueSuggestions.slice(0, Math.min(Number(limit), 6));
		
		res.json(finalSuggestions);
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
		const updatedData = {};
		console.log("Updating profile with data:", req.body);
		
		// Set fields that are present in the request body
		if (req.body.name) updatedData.name = req.body.name;
		if (req.body.headline) updatedData.headline = req.body.headline;
		if (req.body.location) updatedData.location = req.body.location;
		if (req.body.about) updatedData.about = req.body.about;
		if (req.body.organization) updatedData.organization = req.body.organization;
		if (req.body.club) updatedData.club = req.body.club;
		if (req.body.skills) updatedData.skills = req.body.skills;
		if (req.body.linkedin !== undefined) updatedData.linkedin = req.body.linkedin;
		if (req.body.phone !== undefined) updatedData.phone = req.body.phone;
		if (req.body.email) updatedData.email = req.body.email;

		// Get current user info for cloudinary IDs
		const currentUser = await User.findById(req.user._id);

		// Process profile picture if provided
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

		// Process banner image if provided
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
		
		// Process organization logo if provided
		if (req.body.orgLogo) {
			// Upload to Cloudinary if it's a data URL
			if (req.body.orgLogo.startsWith('data:')) {
				const uploadResult = await cloudinary.uploader.upload(req.body.orgLogo, {
					folder: "cfh-synergy/org-logos",
				});
				updatedData.orgLogo = uploadResult.secure_url;
				updatedData.orgLogoId = uploadResult.public_id;
				
				// Delete old logo if exists
				if (currentUser.orgLogoId) {
					try {
						await cloudinary.uploader.destroy(currentUser.orgLogoId);
					} catch (error) {
						console.error("Error deleting old organization logo:", error);
					}
				}
			}
		}

		// Process experience array and upload logos
		if (req.body.experience) {
			const processedExperience = await Promise.all(
				req.body.experience.map(async (exp) => {
					// Skip processing if no logo or if logo is already a URL (not a base64 image)
					if (!exp.logo || exp.logo.startsWith('http')) {
						return exp;
					}

					// Process and upload the logo
					const uploadResult = await cloudinary.uploader.upload(exp.logo, {
						folder: "cfh-synergy/exp-logos",
					});

					// Delete old logo if it exists
					if (exp.logoId) {
						try {
							await cloudinary.uploader.destroy(exp.logoId);
						} catch (error) {
							console.error("Error deleting old experience logo:", error);
						}
					}

					// Return experience with updated logo
					return {
						...exp,
						logo: uploadResult.secure_url,
						logoId: uploadResult.public_id
					};
				})
			);

			updatedData.experience = processedExperience;
		}

		// Process education array and upload logos
		if (req.body.education) {
			const processedEducation = await Promise.all(
				req.body.education.map(async (edu) => {
					// Skip processing if no logo or if logo is already a URL (not a base64 image)
					if (!edu.logo || edu.logo.startsWith('http')) {
						return edu;
					}

					// Process and upload the logo
					const uploadResult = await cloudinary.uploader.upload(edu.logo, {
						folder: "cfh-synergy/edu-logos",
					});

					// Delete old logo if it exists
					if (edu.logoId) {
						try {
							await cloudinary.uploader.destroy(edu.logoId);
						} catch (error) {
							console.error("Error deleting old education logo:", error);
						}
					}

					// Return education with updated logo
					return {
						...edu,
						logo: uploadResult.secure_url,
						logoId: uploadResult.public_id
					};
				})
			);

			updatedData.education = processedEducation;
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
		
		// Delete organization logo if it exists
		if (user.orgLogoId) {
			try {
				await cloudinary.uploader.destroy(user.orgLogoId);
			} catch (error) {
				console.error("Error deleting organization logo:", error);
			}
		}

		// Delete experience logos from Cloudinary
		if (user.experience && user.experience.length > 0) {
			for (const exp of user.experience) {
				if (exp.logoId) {
					try {
						await cloudinary.uploader.destroy(exp.logoId);
					} catch (error) {
						console.error("Error deleting experience logo:", error);
					}
				}
			}
		}

		// Delete education logos from Cloudinary
		if (user.education && user.education.length > 0) {
			for (const edu of user.education) {
				if (edu.logoId) {
					try {
						await cloudinary.uploader.destroy(edu.logoId);
					} catch (error) {
						console.error("Error deleting education logo:", error);
					}
				}
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

export const toggleVerification = async (req, res) => {
	try {
		const { userId } = req.params;
		
		// In a real application, this would check for admin privileges
		// For now, we'll allow any authenticated user to toggle verification
		// In production, add middleware to check for admin role
		
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		
		// Toggle the verification status
		user.isVerified = !user.isVerified;
		await user.save();
		
		res.json({ message: "User verification status updated", isVerified: user.isVerified });
	} catch (error) {
		console.error("Error in toggleVerification controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};
