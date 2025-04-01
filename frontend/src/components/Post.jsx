import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
	Trash2 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import PostAction from "./PostAction";

const Post = ({ post }) => {
	const { postId } = useParams();
	const [activeImageIndex, setActiveImageIndex] = useState(0);

	const { data: authUser } = useQuery({ queryKey: ["authUser"] });
	const [showComments, setShowComments] = useState(false);
	const [newComment, setNewComment] = useState("");
	const [comments, setComments] = useState(post.comments || []);
	const isOwner = authUser._id === post.author._id;
	const isLiked = post.likes.includes(authUser._id);

	const queryClient = useQueryClient();

	const { mutate: deletePost, isPending: isDeletingPost } = useMutation({
		mutationFn: async () => {
			await axiosInstance.delete(`/posts/delete/${post._id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["posts"] });
			toast.success("Post deleted successfully");
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

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

	const handleDeletePost = () => {
		if (!window.confirm("Are you sure you want to delete this post?")) return;
		deletePost();
	};

	const handleLikePost = async () => {
		if (isLikingPost) return;
		likePost();
	};

	const handleAddComment = async (e) => {
		e.preventDefault();
		if (newComment.trim()) {
			createComment(newComment);
			setNewComment("");
			setComments([
				...comments,
				{
					content: newComment,
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

	return (
		<div className='bg-secondary rounded-lg shadow mb-4'>
			<div className='p-4'>
				<div className='flex items-center justify-between mb-4'>
					<div className='flex items-center'>
						<Link to={`/profile/${post?.author?.username}`}>
							<img
								src={post.author.profilePicture || "/avatar.png"}
								alt={post.author.name}
								className='size-10 rounded-full mr-3'
							/>
						</Link>

						<div>
							<Link to={`/profile/${post?.author?.username}`}>
								<h3 className='font-semibold'>{post.author.name}</h3>
							</Link>
							<p className='text-xs text-info'>{post.author.headline}</p>
							<p className='text-xs text-info'>
								{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
							</p>
						</div>
					</div>
					{isOwner && (
						<button onClick={handleDeletePost} className='text-red-500 hover:text-red-700'>
							{isDeletingPost ? <Loader size={18} className='animate-spin' /> : <Trash2 size={18} />}
						</button>
					)}
				</div>
				<p className='mb-4'>{post.content}</p>
				
				{/* Display images with Instagram aspect ratios and navigation arrows */}
				{post.images && post.images.length > 0 ? (
					<div className="relative mb-4 w-full overflow-hidden rounded-lg">
						{post.images.map((image, index) => {
							// Get aspect ratio class from image data or use default
							const aspectRatioClass = (() => {
								const ratio = image.aspectRatio || "1:1";
								switch (ratio) {
									case "1:1": return "aspect-[1/1]"; // Square
									case "1.91:1": return "aspect-[1.91/1]"; // Landscape
									case "4:5": return "aspect-[4/5]"; // Portrait
									default: return "aspect-[1/1]"; // Default to square
								}
							})();
							
							return (
								<div 
									key={index} 
									className={`${aspectRatioClass} w-full bg-black ${index === activeImageIndex ? 'block' : 'hidden'}`}
								>
									<img 
										src={image.url} 
										alt={`Post image ${index + 1}`} 
										className="w-full h-full object-contain mx-auto" 
									/>
								</div>
							);
						})}
						
						{/* Navigation arrows */}
						{post.images.length > 1 && (
							<>
								<button 
									onClick={prevImage}
									className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 
											text-white rounded-full p-1 z-20 hover:bg-opacity-50 transition-all"
									aria-label="Previous image"
								>
									<ChevronLeft size={24} />
								</button>
								
								<button 
									onClick={nextImage}
									className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 
											text-white rounded-full p-1 z-20 hover:bg-opacity-50 transition-all"
									aria-label="Next image"
								>
									<ChevronRight size={24} />
								</button>
								
								{/* Image indicators */}
								<div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
									<div className="flex space-x-1 bg-black bg-opacity-20 rounded-full px-2 py-1">
										{post.images.map((_, index) => (
											<div 
												key={index} 
												className={`h-2 w-2 rounded-full cursor-pointer ${index === activeImageIndex 
												? 'bg-blue-500' : 'bg-white bg-opacity-50'}`}
												onClick={() => setActiveImageIndex(index)}
											></div>
										))}
									</div>
								</div>
							</>
						)}
					</div>
				) : (
					// For backward compatibility
					post.image && (
						<div className="w-full aspect-[1/1] mb-4 bg-black rounded-lg overflow-hidden">
							<img src={post.image} alt='Post content' className='w-full h-full object-contain' />
						</div>
					)
				)}

				<div className='flex justify-between text-info'>
					<PostAction
						icon={<ThumbsUp size={18} className={isLiked ? "text-blue-500 fill-blue-300" : ""} />}
						text={`Like (${post.likes.length})`}
						onClick={handleLikePost}
					/>

					<PostAction
						icon={<MessageCircle size={18} />}
						text={`Comment (${comments.length})`}
						onClick={() => setShowComments(!showComments)}
					/>
					<PostAction icon={<Share2 size={18} />} text='Share' />
				</div>
			</div>

			{showComments && (
				<div className='px-4 pb-4'>
					<div className='mb-4 max-h-60 overflow-y-auto'>
						{comments.map((comment) => (
							<div key={comment._id} className='mb-2 bg-base-100 p-2 rounded flex items-start'>
								<img
									src={comment.user.profilePicture || "/avatar.png"}
									alt={comment.user.name}
									className='w-8 h-8 rounded-full mr-2 flex-shrink-0'
								/>
								<div className='flex-grow'>
									<div className='flex items-center mb-1'>
										<span className='font-semibold mr-2'>{comment.user.name}</span>
										<span className='text-xs text-info'>
											{formatDistanceToNow(new Date(comment.createdAt))}
										</span>
									</div>
									<p>{comment.content}</p>
								</div>
							</div>
						))}
					</div>

					<form onSubmit={handleAddComment} className='flex items-center'>
						<input
							type='text'
							value={newComment}
							onChange={(e) => setNewComment(e.target.value)}
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
		</div>
	);
};
export default Post;
