import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Heart, MessageSquare, Share2 } from "lucide-react";

const UserActivityPage = () => {
  const { username } = useParams();
  
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: () => axiosInstance.get(`/users/${username}`).then(res => res.data),
  });
  
  const { data: posts, isLoading: isPostsLoading } = useQuery({
    queryKey: ["userPosts", user?._id],
    queryFn: () => axiosInstance.get(`/posts/user/${user?._id}`).then(res => res.data),
    enabled: !!user?._id,
  });
  
  if (isUserLoading || isPostsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-gray-600 font-medium">Loading activity...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-5xl mx-auto bg-gray-50 min-h-screen p-4 md:p-6">
      <header className="bg-white shadow-sm rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <img 
            src={user.profilePicture || "/avatar.png"} 
            alt={user.name} 
            className="w-16 h-16 rounded-full object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold">{user.name}'s Activity</h1>
            <Link to={`/profile/${username}`} className="text-blue-600 hover:underline">
              Back to profile
            </Link>
          </div>
        </div>
      </header>
      
      <div className="space-y-4">
        {posts?.length > 0 ? (
          posts.map((post) => (
            <div key={post._id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex mb-4">
                <img
                  src={post.author.profilePicture || "/avatar.png"}
                  alt={post.author.name}
                  className="w-10 h-10 rounded-full mr-3 object-cover"
                />
                <div>
                  <Link to={`/profile/${post.author.username}`} className="font-medium text-gray-900 hover:underline">
                    {post.author.name}
                  </Link>
                  <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
              
              <Link to={`/post/${post._id}`} className="block">
                <p className="text-gray-700 mb-4">{post.content}</p>
                
                {post.images && post.images.length > 0 && (
                  <div className={`grid ${post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2 mb-4`}>
                    {post.images.map((image, index) => (
                      <img 
                        key={index} 
                        src={image.url || image} 
                        alt={`Post image ${index + 1}`} 
                        className="w-full h-auto rounded-md object-cover max-h-80"
                      />
                    ))}
                  </div>
                )}
              </Link>
              
              <div className="flex items-center justify-between text-gray-500 text-sm mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Heart size={18} />
                  <span>{post.likes?.length || 0} likes</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} />
                  <span>{post.comments?.length || 0} comments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Share2 size={18} />
                  <span>Share</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500">No posts to show.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserActivityPage; 