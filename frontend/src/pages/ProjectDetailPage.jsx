import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { toast } from "react-hot-toast";
import { useAuthUser } from "../utils/authHooks";
import { 
  ThumbsUp, 
  Users, 
  Info, 
  MessageSquare, 
  Link as LinkIcon, 
  ExternalLink, 
  Clock, 
  Plus, 
  Loader, 
  ChevronDown, 
  ChevronUp,
  Edit
} from "lucide-react";

const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useAuthUser();
  const [activeTab, setActiveTab] = useState("details");
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/projects/${projectId}`);
      return response.data;
    },
  });

  const { data: comments, isLoading: isLoadingComments } = useQuery({
    queryKey: ["projectComments", projectId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/projects/${projectId}/comments`);
      return response.data;
    },
    enabled: activeTab === "comments",
  });

  const { mutate: upvoteProject, isLoading: isUpvoting } = useMutation({
    mutationFn: async () => {
      return axiosInstance.post(`/projects/${projectId}/upvote`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["project", projectId]);
      toast.success("Project upvoted!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Error upvoting project");
    },
  });

  const { mutate: submitApplication, isLoading: isSubmittingApplication } = useMutation({
    mutationFn: async (data) => {
      return axiosInstance.post(`/projects/${projectId}/apply`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["project", projectId]);
      setShowApplicationModal(false);
      setSelectedRole(null);
      setApplicationMessage("");
      toast.success("Application submitted successfully!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Error submitting application");
    },
  });

  const { mutate: addComment, isLoading: isAddingComment } = useMutation({
    mutationFn: async (data) => {
      return axiosInstance.post(`/projects/${projectId}/comments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["projectComments", projectId]);
      setCommentText("");
      toast.success("Comment added successfully!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Error adding comment");
    },
  });

  const [commentText, setCommentText] = useState("");

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    addComment({ text: commentText });
  };

  const handleApply = (role) => {
    if (!user) {
      toast.error("Please login to apply for roles");
      navigate("/login");
      return;
    }

    setSelectedRole(role);
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = () => {
    if (!selectedRole) return;
    
    submitApplication({
      roleTitle: selectedRole.title,
      message: applicationMessage
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="text-center bg-red-50 p-10 rounded-lg">
          <h2 className="text-2xl text-red-600 mb-4">Error Loading Project</h2>
          <p className="text-gray-700 mb-6">{error.response?.data?.message || "Something went wrong"}</p>
          <Link to="/projects" className="btn btn-primary">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const project = data.project;
  const isFounder = user && project.founder._id === user._id;
  const hasApplied = project.applications?.some(app => app.userId._id === user?._id);
  const isTeamMember = project.teamMembers?.some(member => member.userId._id === user?._id);
  const hasUpvoted = project.upvotes?.some(upvoteId => upvoteId === user?._id);
  
  const projectCommentsToShow = showAllComments 
    ? comments?.comments 
    : comments?.comments?.slice(0, 3);

  // Get stage label
  const getStageLabel = (stage) => {
    const stageMap = {
      "idea": "Idea Stage",
      "buildingMVP": "Building MVP",
      "MVP": "MVP Completed",
      "prototype": "Prototype",
      "fundraising": "Fundraising",
      "growth": "Growth",
      "exit": "Exit"
    };
    return stageMap[stage] || stage;
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Project header */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        {project.poster ? (
          <div className="aspect-w-16 aspect-h-9 w-full max-h-80 overflow-hidden">
            <img 
              src={project.poster} 
              alt={project.name} 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-w-16 aspect-h-9 w-full max-h-80 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white">
            <h1 className="text-4xl font-bold">{project.name}</h1>
          </div>
        )}
        
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">{project.name}</h1>
              <div className="flex items-center mb-4">
                <Link to={`/profile/${project.founder.username}`} className="flex items-center mr-4">
                  <img 
                    src={project.founder.profilePicture || '/avatar.png'} 
                    alt={project.founder.name}
                    className="w-6 h-6 rounded-full mr-2"
                  />
                  <span className="text-gray-700 hover:underline font-medium">{project.founder.name}</span>
                </Link>
                <span className="text-gray-500 text-sm">{project.upvotes?.length || 0} upvotes</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {project.website && (
                <a 
                  href={project.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm flex items-center gap-1"
                >
                  <ExternalLink size={16} />
                  Visit Website
                </a>
              )}
              
              {/* Edit Project Button - Only visible to founder */}
              {isFounder && (
                <Link 
                  to={`/projects/${projectId}/edit`}
                  className="btn btn-primary btn-sm flex items-center gap-1"
                >
                  <Edit size={16} />
                  Edit Project
                </Link>
              )}
              
              <button 
                onClick={() => upvoteProject()}
                disabled={isUpvoting || hasUpvoted}
                className={`btn btn-sm ${hasUpvoted ? 'btn-primary text-white' : 'btn-outline'}`}
              >
                <ThumbsUp size={16} className="mr-1" />
                {hasUpvoted ? 'Upvoted' : 'Upvote'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tab navigation */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab("details")}
          className={`py-3 px-5 font-medium flex items-center gap-2 ${
            activeTab === "details"
              ? "text-primary border-b-2 border-primary"
              : "text-gray-600 hover:text-primary"
          }`}
        >
          <Info size={18} />
          DETAILS
        </button>
        
        <button
          onClick={() => setActiveTab("team")}
          className={`py-3 px-5 font-medium flex items-center gap-2 ${
            activeTab === "team"
              ? "text-primary border-b-2 border-primary"
              : "text-gray-600 hover:text-primary"
          }`}
        >
          <Users size={18} />
          TEAM MEMBERS
        </button>
        
        <button
          onClick={() => setActiveTab("comments")}
          className={`py-3 px-5 font-medium flex items-center gap-2 ${
            activeTab === "comments"
              ? "text-primary border-b-2 border-primary"
              : "text-gray-600 hover:text-primary"
          }`}
        >
          <MessageSquare size={18} />
          COMMENTS {comments?.comments?.length > 0 && `(${comments.comments.length})`}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2">
          {/* Details tab */}
          {activeTab === "details" && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Description</h2>
              <div className="whitespace-pre-wrap text-gray-700 mb-8">
                {project.description}
              </div>
              
              {project.website && (
                <div className="mb-4">
                  <h3 className="text-md font-semibold mb-2">Website</h3>
                  <a 
                    href={project.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <LinkIcon size={16} className="mr-2" />
                    {project.website}
                  </a>
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="text-md font-semibold mb-2">Category</h3>
                <p className="text-gray-700">{project.category}</p>
              </div>
              
              <div className="mb-4">
                <h3 className="text-md font-semibold mb-2">Current Stage</h3>
                <p className="text-gray-700">{getStageLabel(project.stage)}</p>
              </div>
              
              <div>
                <h3 className="text-md font-semibold mb-2">Created</h3>
                <div className="flex items-center text-gray-700">
                  <Clock size={16} className="mr-2" />
                  {new Date(project.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Team members tab */}
          {activeTab === "team" && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Team Members</h2>
              
              {/* Founder */}
              <div className="mb-8">
                <h3 className="text-md font-semibold mb-4">Founder</h3>
                <div className="flex items-center">
                  <img 
                    src={project.founder.profilePicture || "/avatar.png"} 
                    alt={project.founder.name} 
                    className="w-12 h-12 rounded-full mr-4" 
                  />
                  <div>
                    <Link 
                      to={`/profile/${project.founder.username}`}
                      className="font-medium hover:underline"
                    >
                      {project.founder.name}
                    </Link>
                    <p className="text-sm text-gray-600">{project.founder.headline}</p>
                  </div>
                </div>
              </div>
              
              {/* Team members list */}
              {project.teamMembers && project.teamMembers.length > 0 ? (
                <>
                  <h3 className="text-md font-semibold mb-4">Team Members</h3>
                  <div className="space-y-4">
                    {project.teamMembers.map((member) => (
                      <div key={member.userId._id} className="flex items-center">
                        <img 
                          src={member.userId.profilePicture || "/avatar.png"} 
                          alt={member.userId.name} 
                          className="w-12 h-12 rounded-full mr-4" 
                        />
                        <div>
                          <Link 
                            to={`/profile/${member.userId.username}`}
                            className="font-medium hover:underline"
                          >
                            {member.userId.name}
                          </Link>
                          <p className="text-sm text-gray-600">{member.role}</p>
                          <p className="text-xs text-gray-500">
                            Joined {new Date(member.joinDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-gray-500 italic">No team members yet besides the founder.</p>
              )}
            </div>
          )}
          
          {/* Comments tab */}
          {activeTab === "comments" && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Comments</h2>
              
              {/* Comment form */}
              {user && (
                <form onSubmit={handleSubmitComment} className="mb-6">
                  <div className="flex">
                    <img 
                      src={user.profilePicture || "/avatar.png"} 
                      alt={user.name} 
                      className="w-10 h-10 rounded-full mr-3" 
                    />
                    <div className="flex-1">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="textarea textarea-bordered w-full h-24"
                        required
                      />
                      <div className="flex justify-end mt-2">
                        <button 
                          type="submit" 
                          className="btn btn-primary btn-sm"
                          disabled={isAddingComment}
                        >
                          {isAddingComment ? (
                            <>
                              <Loader size={16} className="mr-2 animate-spin" />
                              Posting...
                            </>
                          ) : (
                            "Post Comment"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}
              
              {/* Comments list */}
              {isLoadingComments ? (
                <div className="flex justify-center py-10">
                  <Loader className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {projectCommentsToShow?.length > 0 ? (
                    <>
                      <div className="space-y-6">
                        {projectCommentsToShow.map((comment) => (
                          <div key={comment._id} className="flex">
                            <img 
                              src={comment.user.profilePicture || "/avatar.png"} 
                              alt={comment.user.name} 
                              className="w-10 h-10 rounded-full mr-3" 
                            />
                            <div>
                              <div className="flex items-center">
                                <Link 
                                  to={`/profile/${comment.user.username}`}
                                  className="font-medium hover:underline mr-2"
                                >
                                  {comment.user.name}
                                </Link>
                                <span className="text-xs text-gray-500">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="mt-1 text-gray-700">{comment.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {comments?.comments?.length > 3 && (
                        <button
                          onClick={() => setShowAllComments(!showAllComments)}
                          className="mt-6 text-blue-600 hover:underline flex items-center"
                        >
                          {showAllComments ? (
                            <>
                              <ChevronUp size={16} className="mr-1" />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown size={16} className="mr-1" />
                              Show all {comments.comments.length} comments
                            </>
                          )}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-center text-gray-500 py-10">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="md:col-span-1">
          {/* Open roles section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Open Roles</h2>
            
            {project.openRoles && project.openRoles.length > 0 ? (
              <div className="space-y-4">
                {project.openRoles.map((role, index) => (
                  <div 
                    key={index} 
                    className="border rounded-lg p-4 transition-all hover:border-primary"
                  >
                    <h3 className="font-bold text-lg">{role.title}</h3>
                    {role.description && (
                      <p className="text-gray-600 text-sm mt-1 mb-3">{role.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {role.filled}/{role.limit} positions filled
                      </span>
                      
                      <button
                        onClick={() => handleApply(role)}
                        disabled={isFounder || isTeamMember || hasApplied}
                        className="btn btn-primary btn-sm"
                      >
                        <Plus size={16} className="mr-1" />
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No open roles at the moment.</p>
            )}
          </div>
          
          {/* Pending applications section - Only visible to founder */}
          {isFounder && project.applications && project.applications.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Pending Applications</h2>
              
              <div className="space-y-4">
                {project.applications
                  .filter(app => app.status === "pending")
                  .map((application) => (
                    <div key={application._id} className="border rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <img 
                          src={application.userId.profilePicture || "/avatar.png"} 
                          alt={application.userId.name} 
                          className="w-8 h-8 rounded-full mr-2" 
                        />
                        <div>
                          <Link 
                            to={`/profile/${application.userId.username}`}
                            className="font-medium hover:underline"
                          >
                            {application.userId.name}
                          </Link>
                          <p className="text-xs text-gray-500">Applied for: {application.roleTitle}</p>
                        </div>
                      </div>
                      
                      {application.message && (
                        <p className="text-sm text-gray-700 mt-2 mb-3 bg-gray-50 p-2 rounded">
                          {application.message}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-end space-x-2">
                        <button className="btn btn-sm btn-error">Reject</button>
                        <button className="btn btn-sm btn-success">Accept</button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Application Modal */}
      {showApplicationModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Apply for {selectedRole.title}</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to Project Owner (Optional)
              </label>
              <textarea
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                placeholder="Tell the project founder why you're a good fit for this role..."
                className="textarea textarea-bordered w-full h-32"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowApplicationModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitApplication}
                disabled={isSubmittingApplication}
                className="btn btn-primary"
              >
                {isSubmittingApplication ? (
                  <>
                    <Loader size={16} className="mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage; 