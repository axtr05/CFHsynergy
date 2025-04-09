import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, ThumbsUp, Share2, Loader2, ChevronLeft, ChevronRight, X, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const MAX_CONTENT_LENGTH = 150; // Number of characters to show before "See more"

const PostsList = ({ userId, limit = 3, showAllLink = false }) => {
  console.log('PostsList props:', { userId, limit, showAllLink });

  const { data: posts, isLoading, error, refetch } = useQuery({
    queryKey: ['userPosts', userId, limit],
    queryFn: async () => {
      if (!userId) {
        console.error('Missing userId in PostsList');
        throw new Error('User ID is required');
      }
      
      try {
        console.log('Fetching posts for user:', userId);
        const apiUrl = `/posts/user/${userId}?limit=${limit}`;
        console.log('API URL:', apiUrl);
        
        const response = await axiosInstance.get(apiUrl);
        console.log('Posts response data:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching posts:', error);
        if (error.response) {
          console.error('Response error data:', error.response.data);
          console.error('Response error status:', error.response.status);
        }
        throw error;
      }
    },
    enabled: Boolean(userId),
    retry: 1,
    staleTime: 30000,
  });
  
  const [showImageModal, setShowImageModal] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [expandedPosts, setExpandedPosts] = useState({});
  
  // Toggle expanded state for a post
  const toggleExpanded = (postId) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };
  
  // Check if post content should be truncated
  const shouldTruncate = (content) => content?.length > MAX_CONTENT_LENGTH;
  
  // Get display content for a post
  const getDisplayContent = (post) => {
    // Add debugging for posts content
    console.log('Post content check:', {
      id: post?._id,
      hasContent: Boolean(post?.content),
      contentType: typeof post?.content,
      contentLength: post?.content?.length || 0,
      contentSample: post?.content ? post.content.substring(0, 30) + '...' : 'No content'
    });
    
    if (!post?.content) return '';
    if (!shouldTruncate(post.content)) return post.content;
    
    return expandedPosts[post._id] 
      ? post.content 
      : post.content.substring(0, MAX_CONTENT_LENGTH) + '...';
  };
  
  // Close modal on ESC key press
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowImageModal(false);
      }
    };
    
    if (showImageModal) {
      document.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showImageModal]);
  
  const openImageModal = (post, index) => {
    setActivePost(post);
    setActiveImageIndex(index);
    setShowImageModal(true);
  };
  
  const nextImage = () => {
    if (activePost?.images && activePost.images.length > 1) {
      setActiveImageIndex((prev) => (prev + 1) % activePost.images.length);
    }
  };

  const prevImage = () => {
    if (activePost?.images && activePost.images.length > 1) {
      setActiveImageIndex((prev) => (prev === 0 ? activePost.images.length - 1 : prev - 1));
    }
  };

  // Add a debug function for images
  const logImageDetails = (post) => {
    if (!post) return;
    
    console.log('Image details for post:', post._id, {
      hasImages: Boolean(post.images && post.images.length > 0),
      imagesCount: post.images?.length || 0,
      firstImageType: post.images && post.images.length > 0 ? 
        (typeof post.images[0] === 'object' ? 'object' : typeof post.images[0]) : 'none',
      firstImageUrl: post.images && post.images.length > 0 ? 
        (typeof post.images[0] === 'object' ? post.images[0].url : post.images[0]) : 'none',
      legacyImage: Boolean(post.image),
      legacyImageUrl: post.image || 'none'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-gray-500">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center">
        <div className="text-red-500 mb-2">
          <X className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-medium text-red-700 mb-2">Failed to load posts</h3>
        <p className="text-red-600 text-sm mb-4">We couldn't load the posts for this profile.</p>
        <button 
          onClick={() => refetch()} 
          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="bg-gray-50 p-8 rounded-lg border border-gray-100 text-center">
        <p className="text-gray-600 mb-1">No posts to show</p>
        <p className="text-gray-500 text-sm">This user hasn't published any posts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts?.map((post) => {
        // Call the debug function
        logImageDetails(post);
        
        return (
          <div key={post._id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 pb-2">
              <div className="flex mb-3">
                <Link to={`/profile/${post.author.username}`} className="mr-3">
                  <img
                    src={post.author.profilePicture || "/avatar.png"}
                    alt={post.author.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </Link>
                <div>
                  <Link to={`/profile/${post.author.username}`} className="font-medium text-gray-900 hover:underline">
                    {post.author.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {post.author.headline}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    {post.edited && <span className="ml-1">· Edited</span>}
                  </p>
                </div>
              </div>
              
              <Link to={`/post/${post._id}`} className="block">
                <div className="text-gray-800 mb-3 whitespace-pre-wrap break-words">
                  {post.content ? (
                    <>
                      {expandedPosts[post._id] || post.content.length <= MAX_CONTENT_LENGTH
                        ? post.content
                        : post.content.substring(0, MAX_CONTENT_LENGTH) + '...'}
                      
                      {post.content.length > MAX_CONTENT_LENGTH && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            toggleExpanded(post._id);
                          }} 
                          className="text-blue-500 hover:text-blue-700 ml-1 font-medium text-sm"
                        >
                          {expandedPosts[post._id] ? 'See less' : 'See more'}
                        </button>
                      )}
                    </>
                  ) : (
                    'No content available'
                  )}
                </div>
              </Link>
            </div>
            
            {/* Images section with slider layout */}
            {post.images && post.images.length > 0 && (
              <div className="w-full relative">
                <div 
                  className="bg-black flex justify-center items-center cursor-pointer" 
                  onClick={() => openImageModal(post, post.images.length > 1 ? 0 : 0)}
                >
                  <img 
                    src={typeof post.images[0] === 'object' ? post.images[0].url : post.images[0]}
                    alt={`Post image 1`}
                    className="max-w-full max-h-[500px] object-contain py-2"
                  />
                </div>
                
                {/* Image counter for multiple images */}
                {post.images.length > 1 && (
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <div className="inline-flex bg-black bg-opacity-50 rounded-full px-2 py-1 text-white text-xs">
                      1 / {post.images.length} • Click to view all
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Single image fallback */}
            {!post.images && post.image && (
              <div 
                className="w-full bg-black flex justify-center cursor-pointer"
                onClick={() => openImageModal(post, 0)}
              >
                <img 
                  src={post.image} 
                  alt="Post content" 
                  className="max-h-[500px] max-w-full object-contain py-2" 
                />
              </div>
            )}
            
            {/* Likes section */}
            <div className="p-4 pt-3">
              {post.likes?.length > 0 && (
                <div className="flex items-center mb-2">
                  <div className="flex -space-x-1 mr-2">
                    <div className="w-5 h-5 rounded-full border border-white bg-gray-200 flex justify-center items-center">
                      <ThumbsUp size={12} className="text-blue-500" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      {post.likes.length === 1 ? "1 person" : `${post.likes.length} people`} liked this
                    </span>
                  </p>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex justify-between border-t border-b border-gray-100 py-1 my-1">
                <Link to={`/post/${post._id}`} className="flex items-center py-1.5 px-4 hover:bg-gray-50 rounded-md transition-colors text-gray-500 hover:text-gray-700">
                  <ThumbsUp size={18} className="mr-1.5" />
                  <span className="text-sm font-medium">Like{post.likes?.length > 0 ? ` (${post.likes.length})` : ''}</span>
                </Link>
                
                <Link to={`/post/${post._id}`} className="flex items-center py-1.5 px-4 hover:bg-gray-50 rounded-md transition-colors text-gray-500 hover:text-gray-700">
                  <MessageCircle size={18} className="mr-1.5" />
                  <span className="text-sm font-medium">Comment{post.comments?.length > 0 ? ` (${post.comments.length})` : ''}</span>
                </Link>
                
                <button className="flex items-center py-1.5 px-4 hover:bg-gray-50 rounded-md transition-colors text-gray-500 hover:text-gray-700">
                  <Share2 size={18} className="mr-1.5" />
                  <span className="text-sm font-medium">Share</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Image Modal */}
      {showImageModal && activePost && (
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
              src={activePost.images ? 
                (typeof activePost.images[activeImageIndex] === 'object' ? 
                  activePost.images[activeImageIndex].url : 
                  activePost.images[activeImageIndex]) : 
                activePost.image
              } 
              alt={`Full size image ${activeImageIndex + 1}`} 
              className="max-h-[85vh] max-w-[90vw] object-contain" 
            />
            
            {/* Navigation buttons - only show if multiple images */}
            {activePost.images && activePost.images.length > 1 && (
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
                  {activeImageIndex + 1} / {activePost.images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {showAllLink && posts?.length > 0 && (
        <Link 
          to={`/profile/${posts[0].author.username}/activity`} 
          className="block text-center text-blue-600 hover:underline text-sm font-medium mt-2"
        >
          See all activity
        </Link>
      )}
    </div>
  );
};

export default PostsList; 