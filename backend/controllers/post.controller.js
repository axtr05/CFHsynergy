import cloudinary from "../lib/cloudinary.js";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import { sendCommentNotificationEmail } from "../emails/emailHandlers.js";

export const getFeedPosts = async (req, res) => {
	try {
		const posts = await Post.find({ author: { $in: [...req.user.connections, req.user._id] } })
			.populate("author", "name username profilePicture headline")
			.populate("comments.user", "name profilePicture")
			.sort({ createdAt: -1 });

		res.status(200).json(posts);
	} catch (error) {
		console.error("Error in getFeedPosts controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const createPost = async (req, res) => {
	try {
		const { content, images, aspectRatio } = req.body;
		let newPost = {
			author: req.user._id,
			content,
			images: []
		};

		// Handle multiple images
		if (images && images.length > 0) {
			try {
				// Process each image
				for (const imageData of images) {
					// Upload to Cloudinary with transformation to maintain aspect ratio
					let uploadOptions = { folder: "cfh-synergy/posts" };
					
					// Add transformation options based on aspect ratio
					if (aspectRatio) {
						switch (aspectRatio) {
							case "1:1": // Square
								uploadOptions.transformation = [
									{ width: 1080, height: 1080, crop: "fit" }
								];
								break;
							case "1.91:1": // Landscape
								uploadOptions.transformation = [
									{ width: 1080, height: 566, crop: "fit" }
								];
								break;
							case "4:5": // Portrait
								uploadOptions.transformation = [
									{ width: 1080, height: 1350, crop: "fit" }
								];
								break;
						}
					}
					
					const uploadResult = await cloudinary.uploader.upload(imageData, uploadOptions);
					
					// Add to images array
					newPost.images.push({
						url: uploadResult.secure_url,
						cloudinaryId: uploadResult.public_id,
						aspectRatio: aspectRatio || "1:1"
					});
				}
			} catch (uploadError) {
				console.error("Error uploading images:", uploadError);
				return res.status(500).json({ 
					message: "Error uploading images",
					error: uploadError.message 
				});
			}
		} 
		// Handle single image for backward compatibility
		else if (req.body.image) {
			try {
				// Upload to Cloudinary
				const uploadOptions = { folder: "cfh-synergy/posts" };
				
				// Add transformation options based on aspect ratio
				if (aspectRatio) {
					switch (aspectRatio) {
						case "1:1": // Square
							uploadOptions.transformation = [
								{ width: 1080, height: 1080, crop: "fit" }
							];
							break;
						case "1.91:1": // Landscape
							uploadOptions.transformation = [
								{ width: 1080, height: 566, crop: "fit" }
							];
							break;
						case "4:5": // Portrait
							uploadOptions.transformation = [
								{ width: 1080, height: 1350, crop: "fit" }
							];
							break;
					}
				}
				
				const uploadResult = await cloudinary.uploader.upload(req.body.image, uploadOptions);
				
				// Add to both images array and legacy image field
				newPost.images.push({
					url: uploadResult.secure_url,
					cloudinaryId: uploadResult.public_id,
					aspectRatio: aspectRatio || "1:1"
				});
				newPost.image = uploadResult.secure_url;
				newPost.cloudinaryId = uploadResult.public_id;
			} catch (uploadError) {
				console.error("Error uploading image:", uploadError);
				return res.status(500).json({ 
					message: "Error uploading image",
					error: uploadError.message 
				});
			}
		}

		const postDoc = new Post(newPost);
		await postDoc.save();
		await postDoc.populate('author', 'name username profilePicture headline');
		
		res.status(201).json(postDoc);
	} catch (error) {
		console.error("Error in createPost controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const deletePost = async (req, res) => {
	try {
		const postId = req.params.id;
		const userId = req.user._id;

		const post = await Post.findById(postId);

		if (!post) {
			return res.status(404).json({ message: "Post not found" });
		}

		if (post.author.toString() !== userId.toString()) {
			return res.status(403).json({ message: "Not authorized to delete this post" });
		}

		// Delete images from Cloudinary
		if (post.images && post.images.length > 0) {
			for (const image of post.images) {
				if (image.cloudinaryId) {
					try {
						await cloudinary.uploader.destroy(image.cloudinaryId);
					} catch (error) {
						console.error("Error deleting image from Cloudinary:", error);
					}
				}
			}
		}
		// For backward compatibility
		else if (post.cloudinaryId) {
			try {
				await cloudinary.uploader.destroy(post.cloudinaryId);
			} catch (error) {
				console.error("Error deleting image from Cloudinary:", error);
			}
		}

		await Post.findByIdAndDelete(postId);
		res.status(200).json({ message: "Post deleted successfully" });
	} catch (error) {
		console.log("Error in delete post controller", error.message);
		res.status(500).json({ message: "Server error" });
	}
};

export const getPostById = async (req, res) => {
	try {
		const postId = req.params.id;
		const post = await Post.findById(postId)
			.populate("author", "name username profilePicture headline")
			.populate("comments.user", "name profilePicture username headline");

		res.status(200).json(post);
	} catch (error) {
		console.error("Error in getPostById controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const createComment = async (req, res) => {
	try {
		const postId = req.params.id;
		const { content } = req.body;

		const post = await Post.findByIdAndUpdate(
			postId,
			{
				$push: { comments: { user: req.user._id, content } },
			},
			{ new: true }
		).populate("author", "name email username headline profilePicture");

		// create a notification if the comment owner is not the post owner
		if (post.author._id.toString() !== req.user._id.toString()) {
			const newNotification = new Notification({
				recipient: post.author,
				type: "comment",
				relatedUser: req.user._id,
				relatedPost: postId,
			});

			await newNotification.save();

			try {
				const postUrl = process.env.CLIENT_URL + "/post/" + postId;
				await sendCommentNotificationEmail(
					post.author.email,
					post.author.name,
					req.user.name,
					postUrl,
					content
				);
			} catch (error) {
				console.log("Error in sending comment notification email:", error);
			}
		}

		res.status(200).json(post);
	} catch (error) {
		console.error("Error in createComment controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const likePost = async (req, res) => {
	try {
		const postId = req.params.id;
		const post = await Post.findById(postId);
		const userId = req.user._id;

		if (post.likes.includes(userId)) {
			// unlike the post
			post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
		} else {
			// like the post
			post.likes.push(userId);
			// create a notification if the post owner is not the user who liked
			if (post.author.toString() !== userId.toString()) {
				const newNotification = new Notification({
					recipient: post.author,
					type: "like",
					relatedUser: userId,
					relatedPost: postId,
				});

				await newNotification.save();
			}
		}

		await post.save();
		res.status(200).json(post);
	} catch (error) {
		console.error("Error in likePost controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const getPostsByUser = async (req, res) => {
	try {
		const userId = req.params.userId;
		const limit = parseInt(req.query.limit) || 10; // Default to 10 posts if no limit is provided
		
		const posts = await Post.find({ author: userId })
			.populate("author", "name username profilePicture headline")
			.populate("comments.user", "name profilePicture username")
			.sort({ createdAt: -1 })
			.limit(limit);

		res.status(200).json(posts);
	} catch (error) {
		console.error("Error in getPostsByUser controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};
