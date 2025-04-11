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
				$push: { comments: { 
					user: req.user._id, 
					content,
					likes: [],
					dislikes: []
				}},
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
		const userId = req.user._id;

		// Check if post exists
		const post = await Post.findById(postId);
		if (!post) {
			return res.status(404).json({ message: "Post not found" });
		}

		// Ensure likes array exists
		if (!post.likes) {
			post.likes = [];
		}

		// Safely check if user already liked the post
		const userLiked = post.likes.some(id => id && id.toString() === userId.toString());

		if (userLiked) {
			// unlike the post - filter out safely
			post.likes = post.likes.filter((id) => id && id.toString() !== userId.toString());
		} else {
			// like the post
			post.likes.push(userId);
			
			// create a notification if the post owner is not the user who liked
			try {
				if (post.author && post.author.toString() !== userId.toString()) {
					// Create notification following the proper schema
					const newNotification = new Notification({
						recipient: post.author,
						sender: userId,  // Add the required sender field
						type: "post_like", // Use the enum value from the schema
						post: postId,    // Use the post field instead of relatedPost
					});

					await newNotification.save();
				}
			} catch (notificationError) {
				// Log but don't fail if notification creation fails
				console.error("Error creating like notification:", notificationError);
			}
		}

		await post.save();
		
		// Return a clean, serialized post object
		const serializedPost = post.toObject();
		res.status(200).json(serializedPost);
	} catch (error) {
		console.error("Error in likePost controller:", error);
		res.status(500).json({ 
			message: "Server error while processing like",
			error: error.message
		});
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

export const deleteComment = async (req, res) => {
	try {
		const { postId, commentId } = req.params;
		const userId = req.user._id;
		
		// Find the post
		const post = await Post.findById(postId);
		if (!post) {
			return res.status(404).json({ message: "Post not found" });
		}
		
		// Find the comment
		const comment = post.comments.id(commentId);
		if (!comment) {
			return res.status(404).json({ message: "Comment not found" });
		}
		
		// Check if user is the comment author or post author
		const isCommentAuthor = comment.user.toString() === userId.toString();
		const isPostAuthor = post.author.toString() === userId.toString();
		
		if (!isCommentAuthor && !isPostAuthor) {
			return res.status(403).json({ message: "Not authorized to delete this comment" });
		}
		
		// Remove the comment
		post.comments.pull({ _id: commentId });
		await post.save();
		
		// Return updated post
		await post.populate("comments.user", "name profilePicture username");
		const serializedPost = post.toObject();
		res.status(200).json(serializedPost);
	} catch (error) {
		console.error("Error in deleteComment controller:", error);
		res.status(500).json({ 
			message: "Server error while deleting comment",
			error: error.message
		});
	}
};

export const editComment = async (req, res) => {
	try {
		const { postId, commentId } = req.params;
		const { content } = req.body;
		const userId = req.user._id;
		
		// Validate content
		if (!content || !content.trim()) {
			return res.status(400).json({ message: "Comment content cannot be empty" });
		}
		
		// Find the post
		const post = await Post.findById(postId);
		if (!post) {
			return res.status(404).json({ message: "Post not found" });
		}
		
		// Find the comment
		const comment = post.comments.id(commentId);
		if (!comment) {
			return res.status(404).json({ message: "Comment not found" });
		}
		
		// Check if user is the comment author
		if (comment.user.toString() !== userId.toString()) {
			return res.status(403).json({ message: "Not authorized to edit this comment" });
		}
		
		// Update the comment
		comment.content = content;
		comment.edited = true;
		await post.save();
		
		// Return updated post
		await post.populate("comments.user", "name profilePicture username");
		const serializedPost = post.toObject();
		res.status(200).json(serializedPost);
	} catch (error) {
		console.error("Error in editComment controller:", error);
		res.status(500).json({ 
			message: "Server error while editing comment",
			error: error.message
		});
	}
};

// New functions for liking and disliking comments
export const likeComment = async (req, res) => {
	try {
		const { postId, commentId } = req.params;
		const userId = req.user._id;

		const post = await Post.findById(postId);
		if (!post) {
			return res.status(404).json({ message: "Post not found" });
		}

		const comment = post.comments.id(commentId);
		if (!comment) {
			return res.status(404).json({ message: "Comment not found" });
		}

		// Initialize likes array if it doesn't exist
		if (!comment.likes) {
			comment.likes = [];
		}

		// Initialize dislikes array if it doesn't exist
		if (!comment.dislikes) {
			comment.dislikes = [];
		}

		const hasLiked = comment.likes.includes(userId);
		
		if (hasLiked) {
			// Unlike: Remove user ID from likes
			comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
		} else {
			// Like: Add user ID to likes
			comment.likes.push(userId);
			
			// If user has disliked, remove from dislikes
			comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId.toString());
		}

		await post.save();
		res.status(200).json({ likes: comment.likes, dislikes: comment.dislikes });
	} catch (error) {
		console.error("Error in likeComment controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const dislikeComment = async (req, res) => {
	try {
		const { postId, commentId } = req.params;
		const userId = req.user._id;

		const post = await Post.findById(postId);
		if (!post) {
			return res.status(404).json({ message: "Post not found" });
		}

		const comment = post.comments.id(commentId);
		if (!comment) {
			return res.status(404).json({ message: "Comment not found" });
		}

		// Initialize likes array if it doesn't exist
		if (!comment.likes) {
			comment.likes = [];
		}

		// Initialize dislikes array if it doesn't exist
		if (!comment.dislikes) {
			comment.dislikes = [];
		}

		const hasDisliked = comment.dislikes.includes(userId);
		
		if (hasDisliked) {
			// Un-dislike: Remove user ID from dislikes
			comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId.toString());
		} else {
			// Dislike: Add user ID to dislikes
			comment.dislikes.push(userId);
			
			// If user has liked, remove from likes
			comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
		}

		await post.save();
		res.status(200).json({ likes: comment.likes, dislikes: comment.dislikes });
	} catch (error) {
		console.error("Error in dislikeComment controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};
