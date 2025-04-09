import cloudinary from "../lib/cloudinary.js";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";

export const getFeedPosts = async (req, res) => {
	try {
		// Get all posts, not just from connections
		const posts = await Post.find()
			.populate("author", "name username profilePicture headline")
			.populate("comments.user", "name profilePicture")
			.sort({ createdAt: -1 });

		// Debug posts and check for content
		console.log(`Found ${posts.length} posts`);
		posts.forEach((post, index) => {
			console.log(`Post ${index} - ID: ${post._id}, Has content: ${!!post.content}, Content: "${post.content}"`);
		});

		// Convert to plain objects to ensure all fields are serialized
		const serializedPosts = posts.map(post => {
			const plainPost = post.toObject();
			// Ensure content exists
			if (plainPost.content === undefined) {
				plainPost.content = "";
			}
			return plainPost;
		});

		res.status(200).json(serializedPosts);
	} catch (error) {
		console.error("Error in getFeedPosts controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const createPost = async (req, res) => {
	try {
		// Log the incoming request to understand what's being received
		console.log("Create Post request received");
		console.log("Request body keys:", Object.keys(req.body));
		
		const { content, images } = req.body;
		
		// Create basic post data with content
		let newPost = {
			author: req.user._id,
			content: content || "", // Ensure content is never undefined
			images: []
		};

		// Process images if they exist
		if (images) {
			try {
				// Handle both array and single image cases
				const imagesToProcess = Array.isArray(images) ? images : [images];
				
				for (const imageData of imagesToProcess) {
					// Skip if no valid image data
					if (!imageData) continue;
					
					// Upload to Cloudinary
					console.log("Uploading image to Cloudinary...");
					const uploadOptions = { folder: "cfh-synergy/posts" };
					
					try {
						const uploadResult = await cloudinary.uploader.upload(imageData, uploadOptions);
						
						// Add to images array
						newPost.images.push({
							url: uploadResult.secure_url,
							cloudinaryId: uploadResult.public_id,
							aspectRatio: "1:1" // Default aspect ratio
						});
						
						// For backward compatibility
						if (!newPost.image) {
							newPost.image = uploadResult.secure_url;
							newPost.cloudinaryId = uploadResult.public_id;
						}
						
						console.log("Image uploaded successfully:", uploadResult.secure_url);
					} catch (cloudinaryError) {
						console.error("Cloudinary upload error:", cloudinaryError);
						// Continue with the rest of the post even if one image fails
					}
				}
			} catch (uploadError) {
				console.error("Error processing images:", uploadError);
				// Continue with post creation without images
			}
		}

		// Create and save the post
		console.log("Creating post with data:", {
			...newPost,
			content: newPost.content,
			imageCount: newPost.images.length
		});
		
		const postDoc = new Post(newPost);
		await postDoc.save();
		await postDoc.populate('author', 'name username profilePicture headline');
		
		// Serialize the post to ensure all fields are present
		const serializedPost = postDoc.toObject();
		if (serializedPost.content === undefined) {
			serializedPost.content = "";
		}
		
		console.log("Post created successfully with ID:", serializedPost._id);
		res.status(201).json(serializedPost);
	} catch (error) {
		console.error("Error in createPost controller:", error);
		res.status(500).json({ 
			message: "Failed to create post", 
			error: error.message,
			stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
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

		if (!post) {
			return res.status(404).json({ message: "Post not found" });
		}

		// Convert to plain object to ensure all fields are serialized
		const serializedPost = post.toObject();
		// Ensure content exists
		if (serializedPost.content === undefined) {
			serializedPost.content = "";
		}

		res.status(200).json(serializedPost);
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
		const posts = await Post.find({ author: userId })
			.populate("author", "name username profilePicture headline")
			.populate("comments.user", "name profilePicture")
			.sort({ createdAt: -1 });

		// Convert to plain objects to ensure all fields are serialized
		const serializedPosts = posts.map(post => {
			const plainPost = post.toObject();
			// Ensure content exists
			if (plainPost.content === undefined) {
				plainPost.content = "";
			}
			return plainPost;
		});

		res.status(200).json(serializedPosts);
	} catch (error) {
		console.error("Error in getPostsByUser controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};
