import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
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
	AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuthUser } from "../utils/authHooks";

import PostAction from "./PostAction";

const MAX_CONTENT_LENGTH = 150; // Number of characters to show before "See more"

const Post = ({ post, displayActions = true, refetchComments }) => {
	const { postId } = useParams();
	const [activeImageIndex, setActiveImageIndex] = useState(0);
	const [content, setContent] = useState(post?.content || "");
	const [isEditing, setIsEditing] = useState(false);
	const [commentText, setCommentText] = useState("");
	const [showComments, setShowComments] = useState(false);
	const [showOptions, setShowOptions] = useState(false);
	const [showImageModal, setShowImageModal] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const optionsRef = useRef(null);
	const queryClient = useQueryClient();
	const { data: authUser } = useAuthUser();
	const [comments, setComments] = useState(post?.comments || []);
	
	// If post or authUser is undefined, don't render anything
	if (!post || !authUser) {
		return null;
	}
	
	const isOwner = authUser?._id === post?.author?._id;
	const isLiked = post?.likes?.includes(authUser?._id);
	
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
			await axiosInstance.post(`/posts/${post._id}/like`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["posts"] });
			queryClient.invalidateQueries({ queryKey: ["post", postId] });
		},
	});

	const handleLikePost = async () => {
		if (isLikingPost) return;
		likePost();
	};

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
					{displayContent}
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
				
			{/* Images section with slider layout */}
			{post.images && post.images.length > 0 ? (
				<div className="w-full relative">
					<div 
						className="bg-black flex justify-center items-center cursor-pointer" 
						onClick={() => openImageModal(activeImageIndex)}
					>
						<img 
							src={post.images[activeImageIndex]?.url || post.images[activeImageIndex]} 
							alt={`Post image ${activeImageIndex + 1}`} 
							className="max-w-full max-h-[500px] object-contain py-2" 
						/>
					</div>
					
					{/* Image navigation arrows */}
					{post.images.length > 1 && (
						<>
							<button 
								onClick={(e) => {
									e.stopPropagation();
									prevImage();
								}}
								className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 
										text-white rounded-full p-1 z-20 hover:bg-opacity-50 transition-all"
								aria-label="Previous image"
							>
								<ChevronLeft size={24} />
							</button>
							
							<button 
								onClick={(e) => {
									e.stopPropagation();
									nextImage();
								}}
								className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 
										text-white rounded-full p-1 z-20 hover:bg-opacity-50 transition-all"
								aria-label="Next image"
							>
								<ChevronRight size={24} />
							</button>
							
							{/* Image counter */}
							<div className="absolute bottom-2 left-0 right-0 text-center">
								<div className="inline-flex bg-black bg-opacity-50 rounded-full px-2 py-1 text-white text-xs">
									{activeImageIndex + 1} / {post.images.length}
								</div>
							</div>
						</>
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
				{post.likes.length > 0 && (
					<div className="flex items-center mb-2">
						<div className="flex -space-x-1 mr-2">
							{/* Display up to 2 user avatars who liked the post */}
							<div className="w-5 h-5 rounded-full border border-white bg-gray-200 flex justify-center items-center">
								<ThumbsUp size={12} className="text-blue-500" />
							</div>
						</div>
						<p className="text-xs text-gray-500">
							<span className="font-medium text-gray-700">
								{post.likes.length === 1
									? "1 person"
									: `${post.likes.length} people`} liked this
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
								<div className='flex-grow bg-gray-100 rounded-lg p-2'>
									<div className='mb-1'>
										<span className='font-semibold mr-2 text-sm'>{comment.user.name}</span>
										<span className='text-xs text-gray-500'>
											{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
										</span>
									</div>
									<p className='text-sm'>{comment.content}</p>
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
							className="absolute top-2 right-2 text-white hover:text-gray-300 z-10"
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
										text-white rounded-full p-2 bg-black bg-opacity-50 hover:bg-opacity-70"
								>
									<ChevronLeft size={32} />
								</button>
								
								<button 
									onClick={nextImage}
									className="absolute right-4 top-1/2 transform -translate-y-1/2 
										text-white rounded-full p-2 bg-black bg-opacity-50 hover:bg-opacity-70"
								>
									<ChevronRight size={32} />
								</button>
								
								{/* Image counter */}
								<div className="absolute bottom-4 left-0 right-0 text-center text-white">
									{activeImageIndex + 1} / {post.images.length}
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
