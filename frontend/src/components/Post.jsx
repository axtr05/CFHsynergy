import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { 
	ChevronLeft, 
	ChevronRight, 
	Loader, 
	MessageCircle, 
	Send, 
	Share2, 
	ThumbsUp, 
	Trash2,
	X,
	AlertCircle,
	ChevronDown,
	ChevronUp,
	MoreVertical,
	Edit,
	Check,
	ThumbsDown
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuthUser } from "../utils/authHooks";

import PostAction from "./PostAction";

const MAX_CONTENT_LENGTH = 150; // Number of characters to show before "See more"

const Post = ({ post, displayActions = true, refetchComments }) => {
	const { postId } = useParams();
	const [activeImageIndex, setActiveImageIndex] = useState(0);
	const [commentText, setCommentText] = useState("");
	const [showComments, setShowComments] = useState(false);
	const [showOptions, setShowOptions] = useState(false);
	const [showImageModal, setShowImageModal] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showAllImages, setShowAllImages] = useState(false);
	const [optimisticLikes, setOptimisticLikes] = useState(null);
	const [isOptimisticallyLiked, setIsOptimisticallyLiked] = useState(null);
	const [localLikeState, setLocalLikeState] = useState({
		initialized: false,
		likes: null,
		isLiked: null
	});
	const optionsRef = useRef(null);
	const imageSliderRef = useRef(null);
	const queryClient = useQueryClient();
	const { data: authUser } = useAuthUser();
	const [comments, setComments] = useState((post?.comments || []).map(comment => ({
		...comment,
		likes: comment.likes || [],
		dislikes: comment.dislikes || []
	})));
	
	// Add a synchronization state to track if we've attempted server synchronization
	const [syncAttempted, setSyncAttempted] = useState(false);
	
	// Inside the Post component, add these new state variables
	const [editingCommentId, setEditingCommentId] = useState(null);
	const [editedCommentContent, setEditedCommentContent] = useState("");
	const [commentMenuOpen, setCommentMenuOpen] = useState(null);
	
	// If post or authUser is undefined, don't render anything
	if (!post || !authUser) {
		return null;
	}
	
	const isOwner = authUser?._id === post?.author?._id;
	
	// Initialize local like state from post when it changes
	useEffect(() => {
		if (post && authUser) {
			setLocalLikeState({
				initialized: true,
				likes: [...(post.likes || [])],
				isLiked: post.likes?.includes(authUser._id) || false
			});
			// Reset optimistic values too
			setOptimisticLikes(null);
			setIsOptimisticallyLiked(null);
		}
	}, [post, authUser]);
	
	// Use optimistic values first, then fall back to local state, then post data
	const likes = optimisticLikes !== null 
		? optimisticLikes 
		: (localLikeState.initialized ? localLikeState.likes : (post?.likes || []));
		
	const isLiked = isOptimisticallyLiked !== null 
		? isOptimisticallyLiked 
		: (localLikeState.initialized ? localLikeState.isLiked : likes?.includes(authUser?._id));
	
	// Determine if content should be truncated
	const shouldTruncate = (post?.content?.length || 0) > MAX_CONTENT_LENGTH;
	const displayContent = shouldTruncate && !isExpanded 
		? post?.content?.substring(0, MAX_CONTENT_LENGTH) + '...' 
		: post?.content;
	
	// Close modal on ESC key press
	useEffect(() => {
		const handleEsc = (e) => {
			if (e.key === 'Escape') {
				setShowImageModal(false);
				setShowDeleteConfirm(false);
			}
		};
		
		if (showImageModal || showDeleteConfirm) {
			document.addEventListener('keydown', handleEsc);
		}
		
		return () => {
			document.removeEventListener('keydown', handleEsc);
		};
	}, [showImageModal, showDeleteConfirm]);

	const { mutate: deletePost, isPending: isDeletingPost } = useMutation({
		mutationFn: async () => {
			await axiosInstance.delete(`/posts/delete/${post._id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["posts"] });
			toast.success("Post deleted successfully");
			setShowDeleteConfirm(false);
		},
		onError: (error) => {
			toast.error(error.message);
			setShowDeleteConfirm(false);
		},
	});

	const handleDeletePost = () => {
		setShowDeleteConfirm(true);
	};
	
	const confirmDelete = () => {
		deletePost();
	};
	
	const cancelDelete = () => {
		setShowDeleteConfirm(false);
	};

	const { mutate: createComment, isPending: isAddingComment } = useMutation({
		mutationFn: async (newComment) => {
			await axiosInstance.post(`/posts/${post._id}/comment`, { content: newComment });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["posts"] });
			toast.success("Comment added successfully");
		},
		onError: (err) => {
			toast.error(err.response.data.message || "Failed to add comment");
		},
	});

	const { mutate: likePost, isPending: isLikingPost } = useMutation({
		mutationFn: async () => {
			try {
				// Added timeout to the request to prevent hanging
				const response = await axiosInstance.post(`/posts/${post._id}/like`, {}, {
					timeout: 5000 // 5 second timeout
				});
				return response.data;
			} catch (error) {
				// Enhanced error logging
				console.error("Error liking post:", error);
				console.error("Error details:", {
					postId: post._id,
					errorMessage: error.message,
					errorStatus: error.response?.status,
					errorData: error.response?.data
				});
				throw error;
			}
		},
		onMutate: async () => {
			// Cancel any outgoing refetches to avoid optimistic update being overwritten
			await queryClient.cancelQueries({ queryKey: ["posts"] });
			if (postId) {
				await queryClient.cancelQueries({ queryKey: ["post", postId] });
			}
			
			// Get current post state to use as rollback
			const previousPostsData = queryClient.getQueryData(["posts"]);
			
			// Capture previous value for potential rollback
			const previousLikes = [...(post.likes || [])];
			const wasLiked = previousLikes.includes(authUser._id);
			
			// Apply optimistic update
			const newLikes = wasLiked
				? previousLikes.filter(id => id !== authUser._id)
				: [...previousLikes, authUser._id];
				
			setOptimisticLikes(newLikes);
			setIsOptimisticallyLiked(!wasLiked);
			
			// Also update the posts cache optimistically
			if (previousPostsData) {
				const updatedPosts = previousPostsData.map(p => {
					if (p._id === post._id) {
						return {
							...p,
							likes: newLikes
						};
					}
					return p;
				});
				
				queryClient.setQueryData(["posts"], updatedPosts);
			}
			
			// Return context for potential rollback
			return { previousLikes, wasLiked, previousPostsData };
		},
		onSuccess: (updatedPost) => {
			// Update the cache with the server response
			queryClient.invalidateQueries({ queryKey: ["posts"] });
			if (postId) {
				queryClient.invalidateQueries({ queryKey: ["post", postId] });
			}
			
			// Reset optimistic state since we have real data now
			setOptimisticLikes(null);
			setIsOptimisticallyLiked(null);
		},
		onError: (error, _, context) => {
			// Revert to previous state on error
			setOptimisticLikes(context.previousLikes);
			setIsOptimisticallyLiked(context.wasLiked);
			
			// Also revert the cache if we had previously updated it
			if (context.previousPostsData) {
				queryClient.setQueryData(["posts"], context.previousPostsData);
			}
			
			// Show error message - be more specific based on error type
			if (error.response?.status === 500) {
				toast.error("Server error. Your like was saved locally but may not persist after refresh.");
			} else if (error.code === 'ECONNABORTED') {
				toast.error("Request timed out. Please try again later.");
			} else {
				toast.error("Failed to update like status. Please try again.");
			}
			
			console.error("Error liking post:", error);
		},
		// Enable retry for network errors, but not for 500 errors
		retry: (failureCount, error) => {
			// Don't retry on 500 errors
			if (error.response?.status === 500) return false;
			// Retry up to 2 times for other errors
			return failureCount < 2;
		}
	});

	// For better reliability, we intercept the server error and keep the UI in sync
	const handleLikeWithFallback = useCallback(async () => {
		// Skip if currently processing
		if (isLikingPost) return;
		
		// Apply optimistic update first to ensure UI responds immediately
		const wasLiked = localLikeState.initialized ? localLikeState.isLiked : likes?.includes(authUser?._id);
		
		// Toggle like state directly in local state
		setLocalLikeState(prev => {
			const newIsLiked = !prev.isLiked;
			const newLikes = newIsLiked
				? [...(prev.likes || []), authUser._id]
				: (prev.likes || []).filter(id => id !== authUser._id);
				
			return {
				initialized: true,
				likes: newLikes,
				isLiked: newIsLiked
			};
		});
		
		// Mark that we've attempted synchronization
		setSyncAttempted(true);
		
		// Then attempt server update as a background operation
		try {
			likePost();
		} catch (err) {
			// Error is already handled by mutation
			console.error("Error in handleLikeWithFallback:", err);
		}
	}, [authUser?._id, isLikingPost, likes, localLikeState, likePost]);

	// Replace the handleLikePost function with our enhanced version
	const handleLikePost = handleLikeWithFallback;

	const handleAddComment = async (e) => {
		e.preventDefault();
		if (commentText.trim()) {
			createComment(commentText);
			setCommentText("");
			setComments([
				...comments,
				{
					content: commentText,
					user: {
						_id: authUser._id,
						name: authUser.name,
						profilePicture: authUser.profilePicture,
					},
					createdAt: new Date(),
					likes: [],
					dislikes: [],
				},
			]);
		}
	};

	const nextImage = () => {
		if (post.images && post.images.length > 1) {
			setActiveImageIndex((prev) => (prev + 1) % post.images.length);
		}
	};

	const prevImage = () => {
		if (post.images && post.images.length > 1) {
			setActiveImageIndex((prev) => (prev === 0 ? post.images.length - 1 : prev - 1));
		}
	};
	
	const openImageModal = (index) => {
		setActiveImageIndex(index);
		setShowImageModal(true);
	};

	// Determine how many images to show initially
	const getVisibleImages = () => {
		if (!post.images) return [];
		if (showAllImages) return post.images;
		return post.images.slice(0, 1);
	};

	// Update the mutation functions
	const { mutate: deleteComment, isPending: isDeletingComment } = useMutation({
		mutationFn: async (commentId) => {
			const response = await axiosInstance.delete(`/posts/${post._id}/comment/${commentId}`);
			return response.data;
		},
		onMutate: async (commentId) => {
			// Cancel any outgoing refetches to avoid overwriting optimistic update
			await queryClient.cancelQueries({ queryKey: ["posts"] });
			
			// Save previous state
			const previousComments = [...comments];
			
			// Optimistically update comments
			const updatedComments = comments.filter(c => c._id !== commentId);
			setComments(updatedComments);
			
			// Close comment menu
			setCommentMenuOpen(null);
			
			// Return context with previous state
			return { previousComments };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["posts"] });
			toast.success("Comment deleted successfully");
		},
		onError: (err, commentId, context) => {
			// Revert to previous state
			setComments(context.previousComments);
			toast.error(err.response?.data?.message || "Failed to delete comment");
			setCommentMenuOpen(null);
		}
	});

	const { mutate: editComment, isPending: isEditingComment } = useMutation({
		mutationFn: async ({ commentId, content }) => {
			const response = await axiosInstance.put(`/posts/${post._id}/comment/${commentId}`, { content });
			return response.data;
		},
		onMutate: async ({ commentId, content }) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: ["posts"] });
			
			// Save previous state
			const previousComments = [...comments];
			
			// Optimistically update comments
			const updatedComments = comments.map(c => {
				if (c._id === commentId) {
					return {
						...c,
						content,
						edited: true
					};
				}
				return c;
			});
			
			setComments(updatedComments);
			
			// Reset editing state
			setEditingCommentId(null);
			setEditedCommentContent("");
			
			// Return context
			return { previousComments };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["posts"] });
			toast.success("Comment updated successfully");
		},
		onError: (err, _, context) => {
			// Revert to previous state
			setComments(context.previousComments);
			toast.error(err.response?.data?.message || "Failed to update comment");
		}
	});

	const handleCommentMenuToggle = (commentId) => {
		setCommentMenuOpen(prev => prev === commentId ? null : commentId);
	};

	const handleEditComment = (comment) => {
		setEditingCommentId(comment._id);
		setEditedCommentContent(comment.content);
		setCommentMenuOpen(null);
	};

	const handleDeleteComment = (commentId) => {
		deleteComment(commentId);
	};

	const handleSaveEditedComment = (commentId) => {
		if (editedCommentContent.trim() === "") {
			toast.error("Comment cannot be empty");
			return;
		}
		editComment({ commentId, content: editedCommentContent });
	};

	const handleCancelEdit = () => {
		setEditingCommentId(null);
		setEditedCommentContent("");
	};

	// Add a click outside handler for the comment menu
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (commentMenuOpen && !event.target.closest('.comment-menu')) {
				setCommentMenuOpen(null);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [commentMenuOpen]);

	// Update the like and dislike comment functions
	const { mutate: likeComment, isPending: isLikingComment } = useMutation({
		mutationFn: async (commentId) => {
			const response = await axiosInstance.post(`/posts/${post._id}/comment/${commentId}/like`);
			return response.data;
		},
		onMutate: async (commentId) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: ["posts"] });
			
			// Save previous state
			const previousComments = [...comments];
			
			// Optimistically update the comment likes
			const updatedComments = comments.map(c => {
				if (c._id === commentId) {
					const likes = c.likes || [];
					const dislikes = c.dislikes || [];
					const isLiked = likes.includes(authUser._id);
					return {
						...c,
						likes: isLiked 
							? likes.filter(id => id !== authUser._id) 
							: [...likes, authUser._id],
						dislikes: dislikes.includes(authUser._id) 
							? dislikes.filter(id => id !== authUser._id) 
							: dislikes
					};
				}
				return c;
			});
			
			setComments(updatedComments);
			
			// Return context with previous state
			return { previousComments };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
		onError: (err, _, context) => {
			// Revert to previous state
			setComments(context.previousComments);
			toast.error(err.response?.data?.message || "Failed to like comment");
		}
	});

	const { mutate: dislikeComment, isPending: isDislikingComment } = useMutation({
		mutationFn: async (commentId) => {
			const response = await axiosInstance.post(`/posts/${post._id}/comment/${commentId}/dislike`);
			return response.data;
		},
		onMutate: async (commentId) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: ["posts"] });
			
			// Save previous state
			const previousComments = [...comments];
			
			// Optimistically update the comment dislikes
			const updatedComments = comments.map(c => {
				if (c._id === commentId) {
					const likes = c.likes || [];
					const dislikes = c.dislikes || [];
					const isDisliked = dislikes.includes(authUser._id);
					return {
						...c,
						dislikes: isDisliked 
							? dislikes.filter(id => id !== authUser._id) 
							: [...dislikes, authUser._id],
						likes: likes.includes(authUser._id) 
							? likes.filter(id => id !== authUser._id) 
							: likes
					};
				}
				return c;
			});
			
			setComments(updatedComments);
			
			// Return context with previous state
			return { previousComments };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
		onError: (err, _, context) => {
			// Revert to previous state
			setComments(context.previousComments);
			toast.error(err.response?.data?.message || "Failed to dislike comment");
		}
	});

	return (
		<div className='bg-white rounded-lg shadow-sm border border-gray-100 mb-4 overflow-hidden'>
			{/* Author info section */}
			<div className='p-4 pb-2'>
				<div className='flex items-center justify-between mb-2'>
					<div className='flex items-center'>
						<Link to={`/profile/${post?.author?.username}`}>
							<img
								src={post?.author?.profilePicture || "/avatar.png"}
								alt={post?.author?.name || "User"}
								className='size-10 rounded-full mr-3'
							/>
						</Link>

						<div>
							<Link to={`/profile/${post?.author?.username}`}>
								<h3 className='font-semibold text-gray-900'>{post?.author?.name || "Unknown User"}</h3>
							</Link>
							<p className='text-xs text-gray-500'>{post?.author?.headline || ""}</p>
							<p className='text-xs text-gray-500'>
								{formatDistanceToNow(new Date(post?.createdAt || Date.now()), { addSuffix: true })}
								{post?.edited && <span className='ml-1'>· Edited</span>}
							</p>
						</div>
					</div>
					{isOwner && (
						<button onClick={handleDeletePost} className='text-red-500 hover:text-red-700'>
							{isDeletingPost ? <Loader size={18} className='animate-spin' /> : <Trash2 size={18} />}
						</button>
					)}
				</div>
				
				{/* Post content with "See more" option */}
				<div className='mb-3 text-gray-800 whitespace-pre-wrap'>
					{post.content !== undefined && post.content !== null ? displayContent : <span className="text-gray-400">No content</span>}
					{shouldTruncate && (
						<button 
							onClick={() => setIsExpanded(!isExpanded)} 
							className="text-blue-500 hover:text-blue-700 ml-1 font-medium text-sm"
						>
							{isExpanded ? 'See less' : 'See more'}
						</button>
					)}
				</div>
			</div>
				
			{/* Images section with vertical stacking */}
			{post.images && post.images.length > 0 ? (
				<div className="w-full relative">
					{/* First visible image */}
					<div className="w-full flex flex-col">
						{getVisibleImages().map((image, index) => (
							<div
								key={index}
								className="w-full bg-black flex justify-center items-center cursor-pointer mb-1 last:mb-0 relative"
								onClick={() => openImageModal(index)}
							>
								<img
									src={image?.url || image}
									alt={`Post image ${index + 1}`}
									className="max-w-full max-h-[500px] object-contain py-2"
								/>

								{/* Image counter indicator */}
								{post.images.length > 1 && (
									<div className="absolute top-2 right-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs text-white">
										{index + 1}/{post.images.length}
									</div>
								)}
							</div>
						))}
					</div>

					{/* View all images toggle */}
					{post.images.length > 1 && (
						<button
							onClick={() => setShowAllImages(!showAllImages)}
							className="w-full bg-black bg-opacity-5 hover:bg-opacity-10 py-2 flex items-center justify-center space-x-1 text-sm font-medium text-gray-700 transition-colors"
						>
							{showAllImages ? (
								<>
									<ChevronUp size={16} />
									<span>Show less</span>
								</>
							) : (
								<>
									<ChevronDown size={16} />
									<span>View all {post.images.length} images</span>
								</>
							)}
						</button>
					)}
				</div>
			) : (
				// For backward compatibility
				post.image && (
					<div 
						className="w-full bg-black flex justify-center cursor-pointer"
						onClick={() => openImageModal(0)}
					>
						<img 
							src={post.image} 
							alt='Post content' 
							className='max-h-[500px] max-w-full object-contain py-2' 
						/>
					</div>
				)
			)}

			{/* Likes section - showing who liked the post */}
			<div className="p-4 pt-3">
				{likes.length > 0 && (
					<div className="flex items-center mb-2">
						<div className="flex -space-x-1 mr-2">
							<div className="w-5 h-5 rounded-full border border-white bg-gray-200 flex justify-center items-center">
								<ThumbsUp size={12} className="text-blue-500" />
							</div>
						</div>
						<p className="text-xs text-gray-500">
							<span className="font-medium text-gray-700">
								{likes.length === 1
									? "1 person"
									: `${likes.length} people`} liked this
							</span>
						</p>
					</div>
				)}
				
				{/* Comment count display */}
				{post.comments && post.comments.length > 0 && (
					<div className="flex items-center mb-2">
						<p className="text-xs text-gray-500">
							<MessageCircle size={12} className="text-gray-500 inline mr-1" />
							<span className="font-medium text-gray-700">
								{post.comments.length === 1
									? "1 comment"
									: `${post.comments.length} comments`}
							</span>
						</p>
					</div>
				)}

				{/* Action buttons */}
				<div className='flex justify-between border-t border-b border-gray-100 py-1 my-1'>
					<PostAction
						icon={<ThumbsUp size={18} className={isLiked ? "text-blue-500 fill-blue-300" : ""} />}
						text={isLiked ? "Liked" : "Like"}
						onClick={handleLikePost}
						className={isLiked ? "text-blue-500" : "text-gray-500 hover:text-gray-700"}
						isLoading={isLikingPost}
					/>

					<PostAction
						icon={<MessageCircle size={18} />}
						text="Comment"
						onClick={() => setShowComments(!showComments)}
						className="text-gray-500 hover:text-gray-700"
					/>
					
					<PostAction 
						icon={<Share2 size={18} />} 
						text='Share'
						className="text-gray-500 hover:text-gray-700"
					/>
				</div>
			</div>

			{/* Comments section */}
			{showComments && (
				<div className='px-4 pb-4'>
					<div className='mb-4 max-h-60 overflow-y-auto'>
						{comments.map((comment) => (
							<div key={comment._id} className='mb-2 p-2 rounded flex items-start'>
								<img
									src={comment.user.profilePicture || "/avatar.png"}
									alt={comment.user.name}
									className='w-8 h-8 rounded-full mr-2 flex-shrink-0'
								/>
								<div className='flex-grow bg-gray-100 rounded-lg p-2 relative'>
									{editingCommentId === comment._id ? (
										<div className="w-full">
											<textarea
												value={editedCommentContent}
												onChange={(e) => setEditedCommentContent(e.target.value)}
												className="w-full p-2 rounded text-sm bg-white border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary min-h-[60px] mb-2"
												placeholder="Edit your comment..."
											/>
											<div className="flex justify-end space-x-2">
												<button
													onClick={handleCancelEdit}
													className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
													disabled={isEditingComment}
												>
													Cancel
												</button>
												<button
													onClick={() => handleSaveEditedComment(comment._id)}
													className="px-2 py-1 text-xs bg-primary text-white rounded flex items-center"
													disabled={isEditingComment}
												>
													{isEditingComment ? (
														<>
															<Loader size={12} className="animate-spin mr-1" />
															Saving...
														</>
													) : (
														<>
															<Check size={12} className="mr-1" />
															Save
														</>
													)}
												</button>
											</div>
										</div>
									) : (
										<>
											<div className='mb-1'>
												<span className='font-semibold mr-2 text-sm'>{comment.user.name}</span>
												<span className='text-xs text-gray-500'>
													{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
													{comment.edited && <span className='ml-1'>· Edited</span>}
												</span>
											</div>
											<p className='text-sm'>{comment.content}</p>
											
											{/* Comment like/dislike actions */}
											<div className="flex items-center mt-1 space-x-3">
												<button 
													onClick={() => likeComment(comment._id)}
													className={`flex items-center text-xs ${(comment.likes && comment.likes.includes(authUser._id)) ? 'text-blue-500' : 'text-gray-500'} hover:text-blue-600`}
													disabled={isLikingComment}
												>
													<ThumbsUp size={12} className={`mr-1 ${(comment.likes && comment.likes.includes(authUser._id)) ? 'fill-blue-300' : ''}`} />
													{comment.likes && comment.likes.length > 0 && <span>{comment.likes.length}</span>}
												</button>
												
												<button 
													onClick={() => dislikeComment(comment._id)}
													className={`flex items-center text-xs ${(comment.dislikes && comment.dislikes.includes(authUser._id)) ? 'text-red-500' : 'text-gray-500'} hover:text-red-600`}
													disabled={isDislikingComment}
												>
													<ThumbsDown size={12} className={`mr-1 ${(comment.dislikes && comment.dislikes.includes(authUser._id)) ? 'fill-red-300' : ''}`} />
													{comment.dislikes && comment.dislikes.length > 0 && <span>{comment.dislikes.length}</span>}
												</button>
											</div>
											
											{/* Comment actions menu */}
											{(comment.user._id === authUser._id || post.author._id === authUser._id) && (
												<div className="absolute top-2 right-2">
													<button 
														onClick={() => handleCommentMenuToggle(comment._id)}
														className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200"
													>
														<MoreVertical size={14} />
													</button>
													
													{commentMenuOpen === comment._id && (
														<div className="absolute right-0 top-full mt-1 bg-white shadow-md rounded-md py-1 z-10 w-32 comment-menu">
															{comment.user._id === authUser._id && (
																<button
																	onClick={() => handleEditComment(comment)}
																	className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
																>
																	<Edit size={14} className="mr-2" />
																	Edit
																</button>
															)}
															<button
																onClick={() => handleDeleteComment(comment._id)}
																className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-gray-100 flex items-center"
																disabled={isDeletingComment}
															>
																{isDeletingComment ? (
																	<Loader size={14} className="animate-spin mr-2" />
																) : (
																	<Trash2 size={14} className="mr-2" />
																)}
																Delete
															</button>
														</div>
													)}
												</div>
											)}
										</>
									)}
								</div>
							</div>
						))}
					</div>

					<form onSubmit={handleAddComment} className='flex items-center'>
						<input
							type='text'
							value={commentText}
							onChange={(e) => setCommentText(e.target.value)}
							placeholder='Add a comment...'
							className='flex-grow p-2 rounded-l-full bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary'
						/>

						<button
							type='submit'
							className='bg-primary text-white p-2 rounded-r-full hover:bg-primary-dark transition duration-300'
							disabled={isAddingComment}
						>
							{isAddingComment ? <Loader size={18} className='animate-spin' /> : <Send size={18} />}
						</button>
					</form>
				</div>
			)}
			
			{/* Delete confirmation modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
						<button 
							onClick={cancelDelete} 
							className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
						>
							<X size={20} />
						</button>
						
						<div className="flex items-center mb-4">
							<AlertCircle size={24} className="text-red-500 mr-2" />
							<h3 className="text-lg font-bold text-gray-900">Delete Post?</h3>
						</div>
						
						<p className="text-gray-600 mb-6">
							Are you sure you want to delete this post? This action cannot be undone.
						</p>
						
						<div className="flex justify-end space-x-3">
							<button
								onClick={cancelDelete}
								className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
							>
								Cancel
							</button>
							
							<button
								onClick={confirmDelete}
								className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center"
								disabled={isDeletingPost}
							>
								{isDeletingPost ? (
									<>
										<Loader size={16} className="animate-spin mr-2" />
										Deleting...
									</>
								) : (
									<>Delete</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
			
			{/* Image Modal */}
			{showImageModal && (
				<div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex justify-center items-center p-4">
					<div className="relative w-full h-full max-w-5xl mx-auto flex items-center justify-center">
						{/* Close button */}
						<button 
							onClick={() => setShowImageModal(false)} 
							className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 p-2 rounded-full"
						>
							<X size={24} />
						</button>
						
						{/* Main image display */}
						<img 
							src={post.images ? 
								(post.images[activeImageIndex]?.url || post.images[activeImageIndex]) : 
								post.image
							} 
							alt={`Full size image ${activeImageIndex + 1}`} 
							className="max-h-[85vh] max-w-[90vw] object-contain" 
						/>
						
						{/* Navigation buttons - only show if multiple images */}
						{post.images && post.images.length > 1 && (
							<>
								<button 
									onClick={prevImage}
									className="absolute left-4 top-1/2 transform -translate-y-1/2 
										text-white rounded-full p-3 bg-black bg-opacity-70 hover:bg-opacity-90 shadow-xl"
								>
									<ChevronLeft size={36} />
								</button>
								
								<button 
									onClick={nextImage}
									className="absolute right-4 top-1/2 transform -translate-y-1/2 
										text-white rounded-full p-3 bg-black bg-opacity-70 hover:bg-opacity-90 shadow-xl"
								>
									<ChevronRight size={36} />
								</button>
								
								{/* Image counter with more visibility */}
								<div className="absolute bottom-8 left-0 right-0 text-center">
									<div className="inline-flex px-4 py-2 bg-black bg-opacity-70 rounded-full text-white font-medium">
										{activeImageIndex + 1} / {post.images.length}
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
export default Post;
