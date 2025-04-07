import { useState, useEffect } from "react";
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
  const [hasShownAcceptanceMessage, setHasShownAcceptanceMessage] = useState(false);
  const [hasShownRejectionMessage, setHasShownRejectionMessage] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [teamMembersPage, setTeamMembersPage] = useState(1);
  const COMMENTS_PER_PAGE = 5;
  const TEAM_MEMBERS_PER_PAGE = 5;
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  const { data: project, isLoading, error, refetch } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/projects/${projectId}`);
      return response.data.project;
    },
  });

  const { data: comments, isLoading: isLoadingComments } = useQuery({
    queryKey: ["projectComments", projectId, commentsPage],
    queryFn: async () => {
      const response = await axiosInstance.get(`/projects/${projectId}/comments?page=${commentsPage}&limit=${COMMENTS_PER_PAGE}`);
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

  const { mutate: processApplication, isLoading: isProcessingApplication } = useMutation({
    mutationFn: async ({ applicationId, status }) => {
      return axiosInstance.put(`/projects/${projectId}/applications/${applicationId}`, { status });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(["project", projectId]);
      if (variables.status === "accepted") {
        toast.success("Application accepted successfully!");
      } else {
        toast.success("Application rejected successfully!");
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Error processing application");
    },
  });

  const { mutate: leaveProject, isLoading: isLeavingProject } = useMutation({
    mutationFn: async () => {
      return axiosInstance.post(`/projects/${projectId}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["project", projectId]);
      toast.success("You have left the project successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Error leaving project");
    },
  });

  const { mutate: removeTeamMember, isLoading: isRemovingMember } = useMutation({
    mutationFn: async (memberId) => {
      return axiosInstance.delete(`/projects/${projectId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["project", projectId]);
      toast.success("Team member removed successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Error removing team member");
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

    // Check all conditions that would prevent application
    if (isFounder) {
      toast.error("You cannot apply to your own project");
      return;
    }

    if (isTeamMember) {
      toast.error("You are already a member of this project");
      return;
    }

    // Check if user has already applied for this specific role
    const existingApplication = project.applications?.find(
      app => app.userId._id === user._id && app.roleTitle === role.title
    );

    if (existingApplication && existingApplication.status === "rejected") {
      toast.error("You cannot apply for this role as your previous application was rejected");
      return;
    }

    if (existingApplication && existingApplication.status === "pending") {
      toast.error("Your application for this role is still pending approval");
      return;
    }

    // Check if position is filled
    if (role.filled >= role.limit) {
      toast.error("This position has already been filled");
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

  useEffect(() => {
    if (user && project?.applications) {
      const acceptedApplication = project.applications.find(
        app => app.userId._id === user._id && app.status === "accepted"
      );
      
      if (acceptedApplication && !hasShownAcceptanceMessage) {
        toast.success("Your application has been accepted! You are now a member of this project.");
        setHasShownAcceptanceMessage(true);
      }
    }
  }, [user, project, hasShownAcceptanceMessage]);

  useEffect(() => {
    if (user && project?.applications) {
      const rejectedApplication = project.applications.find(
        app => app.userId._id === user._id && app.status === "rejected"
      );
      
      if (rejectedApplication && !hasShownRejectionMessage) {
        toast.error("Your application was not accepted. You cannot apply again for this project.");
        setHasShownRejectionMessage(true);
      }
    }
  }, [user, project, hasShownRejectionMessage]);

  // Calculate paginated data
  const paginatedComments = comments?.comments?.slice(0, COMMENTS_PER_PAGE) || [];
  const paginatedTeamMembers = project?.teamMembers?.slice(
    (teamMembersPage - 1) * TEAM_MEMBERS_PER_PAGE,
    teamMembersPage * TEAM_MEMBERS_PER_PAGE
  ) || [];

  const totalCommentsPages = Math.ceil((comments?.totalComments || 0) / COMMENTS_PER_PAGE);
  const totalTeamMembersPages = Math.ceil((project?.teamMembers?.length || 0) / TEAM_MEMBERS_PER_PAGE);

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

  if (!project) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="text-center bg-yellow-50 p-10 rounded-lg">
          <h2 className="text-2xl text-yellow-600 mb-4">Project Not Found</h2>
          <p className="text-gray-700 mb-6">The project you're looking for doesn't exist or has been removed.</p>
          <Link to="/projects" className="btn btn-primary">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const isFounder = user && project?.founder?._id === user._id;
  const hasApplied = user && project?.applications?.some(app => app.userId._id === user._id && app.status === "pending");
  const hasBeenRejectedForAny = user && project?.applications?.some(app => app.userId._id === user._id && app.status === "rejected");
  const hasBeenCancelledForAny = user && project?.applications?.some(app => app.userId._id === user._id && app.status === "cancelled");
  const isPendingApprovalForAny = user && project?.applications?.some(app => app.userId._id === user._id && app.status === "pending");
  const isTeamMember = project?.teamMembers?.some(member => member.userId?._id === user?._id);
  const hasUpvoted = project?.upvotes?.some(upvoteId => upvoteId === user?._id);
  
  const projectCommentsToShow = showAllComments 
    ? comments?.comments 
    : comments?.comments?.slice(0, 3);

  const getApplyButtonState = (role) => {
    if (isFounder) return { text: "You're the founder", disabled: true, style: "btn-disabled" };
    if (isTeamMember) return { text: "You're a member", disabled: true, style: "btn-disabled" };
    
    // Check for role-specific application status
    const userApplication = user && project?.applications?.find(
      app => app.userId._id === user._id && app.roleTitle === role.title
    );
    
    if (userApplication) {
      if (userApplication.status === "rejected") {
        return { text: "Not Eligible", disabled: true, style: "btn-disabled bg-gray-200 border-gray-300 text-gray-500" };
      }
      if (userApplication.status === "pending") {
        return { text: "Application Pending", disabled: true, style: "btn-secondary" };
      }
      if (userApplication.status === "cancelled") {
        return { text: "Reapply", disabled: false, style: "btn-outline" };
      }
      if (userApplication.status === "accepted") {
        return { text: "Accepted", disabled: true, style: "btn-success" };
      }
    }
    
    // Check if the role is filled
    if (role.filled >= role.limit) {
      return { text: "Position Filled", disabled: true, style: "btn-disabled" };
    }
    
    return { 
      text: <><Plus size={16} className="mr-1" />Apply</>, 
      disabled: false, 
      style: "btn-primary"
    };
  };

  const buttonState = getApplyButtonState(selectedRole);
  
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
          <div className="relative w-full" style={{ height: "400px" }}>
            <img 
              src={project.poster} 
              alt={project.name} 
              className="w-full h-full object-contain bg-gray-50"
            />
          </div>
        ) : (
          <div className="w-full h-80 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white">
            <h1 className="text-4xl font-bold">{project.name}</h1>
          </div>
        )}
        
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">{project.name}</h1>
              <div className="flex items-center mb-4">
                {project?.founder?.username && (
                  <Link to={`/profile/${project.founder.username}`} className="flex items-center mr-4">
                    <img 
                      src={project.founder.profilePicture || '/avatar.png'} 
                      alt={project.founder.name}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                    <span className="text-gray-700 hover:underline font-medium">{project.founder.name}</span>
                  </Link>
                )}
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
              
              {/* Team Members List */}
              <div className="space-y-4">
                {/* Founder - Always show first */}
                {project?.founder && (
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center">
                      <img 
                        src={project.founder?.profilePicture || "/avatar.png"} 
                        alt={project.founder?.name || "Founder"} 
                        className="w-8 h-8 rounded-full mr-3" 
                      />
                      <div>
                        {project.founder?.username ? (
                          <Link 
                            to={`/profile/${project.founder.username}`}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {project.founder.name || "Unknown Founder"}
                          </Link>
                        ) : (
                          <span className="font-medium">
                            {project.founder?.name || "Unknown Founder"}
                          </span>
                        )}
                        <p className="text-xs text-gray-500">Project Founder</p>
                      </div>
                    </div>
                    {/* Only show founder badge if the viewer is not the founder */}
                    {!isFounder && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                        Founder
                      </span>
                    )}
                  </div>
                )}
                
                {/* Other team members (excluding founder) */}
                {paginatedTeamMembers
                  .filter(member => member.userId?._id !== project.founder?._id)
                  .map((member, index) => (
                    <div key={member.userId?._id || index} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="flex items-center">
                        <img 
                          src={member.userId?.profilePicture || "/avatar.png"} 
                          alt={member.userId?.name || "Team Member"} 
                          className="w-8 h-8 rounded-full mr-3" 
                        />
                        <div>
                          {member.userId?.username ? (
                            <Link 
                              to={`/profile/${member.userId.username}`}
                              className="font-medium hover:text-primary hover:underline"
                            >
                              {member.userId.name || "Unknown Member"}
                            </Link>
                          ) : (
                            <span className="font-medium">
                              {member.userId?.name || "Unknown Member"}
                            </span>
                          )}
                          <p className="text-xs text-gray-500">Joined {new Date(member.joinDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                          {member.role || "Team Member"}
                        </span>
                        
                        {/* Remove button - Only visible to founder */}
                        {isFounder && (
                          <button
                            onClick={() => {
                              setMemberToRemove(member);
                              setShowRemoveConfirmation(true);
                            }}
                            className="btn btn-error btn-sm"
                            disabled={isRemovingMember}
                          >
                            {isRemovingMember ? (
                              <Loader size={14} className="animate-spin" />
                            ) : (
                              "Remove"
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                
                {project?.teamMembers?.length <= 1 && (
                  <p className="text-gray-500 italic py-2">No team members yet besides the founder.</p>
                )}
              </div>

              {/* Team Members Pagination */}
              {totalTeamMembersPages > 1 && (
                <div className="flex justify-center mt-4">
                  <div className="join">
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setTeamMembersPage(prev => Math.max(prev - 1, 1))}
                      disabled={teamMembersPage === 1}
                    >
                      «
                    </button>
                    <button className="join-item btn btn-sm">
                      Page {teamMembersPage}
                    </button>
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setTeamMembersPage(prev => Math.min(prev + 1, totalTeamMembersPages))}
                      disabled={teamMembersPage === totalTeamMembersPages}
                    >
                      »
                    </button>
                  </div>
                </div>
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
              
              {/* Comments List */}
              <div className="space-y-4">
                {paginatedComments.map((comment) => (
                  <div key={comment._id} className="border-b pb-4">
                    <div className="flex items-center mb-2">
                      <img 
                        src={comment.user.profilePicture || "/avatar.png"} 
                        alt={comment.user.name} 
                        className="w-6 h-6 rounded-full mr-2" 
                      />
                      <span className="text-sm font-medium">{comment.user.name}</span>
                    </div>
                    <p className="text-gray-600 text-sm">{comment.text}</p>
                  </div>
                ))}
              </div>

              {/* Comments Pagination */}
              {totalCommentsPages > 1 && (
                <div className="flex justify-center mt-4">
                  <div className="join">
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setCommentsPage(prev => Math.max(prev - 1, 1))}
                      disabled={commentsPage === 1}
                    >
                      «
                    </button>
                    <button className="join-item btn btn-sm">
                      Page {commentsPage}
                    </button>
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setCommentsPage(prev => Math.min(prev + 1, totalCommentsPages))}
                      disabled={commentsPage === totalCommentsPages}
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="md:col-span-1">
          {/* Open roles section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Open Roles</h2>
            
            {/* Show message for users who have left the project */}
            {user && project?.pastMembers?.some(member => member.userId?._id === user._id) && (
              <div className="mb-4 p-3 rounded-lg border bg-yellow-50 border-yellow-200">
                <p className="text-sm font-medium text-yellow-700">
                  You have previously been a member of this project. You can apply for roles again.
                </p>
              </div>
            )}

            {/* Show message for cancelled applications */}
            {user && hasBeenCancelledForAny && (
              <div className="mb-4 p-3 rounded-lg border bg-blue-50 border-blue-200">
                <p className="text-sm font-medium text-blue-700">
                  Some of your applications were cancelled because you were accepted for another role.
                  You can reapply if you want.
                </p>
              </div>
            )}
            
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
                    
                    {/* Application status for this specific role */}
                    {user && project.applications?.some(app => 
                      app.userId._id === user._id && 
                      app.roleTitle === role.title && 
                      ['pending', 'accepted', 'rejected'].includes(app.status)
                    ) && (
                      <div className={`mb-3 p-2 rounded-lg border ${
                        project.applications.find(app => 
                          app.userId._id === user._id && 
                          app.roleTitle === role.title
                        ).status === 'pending' ? 'bg-blue-50 border-blue-200' : 
                        project.applications.find(app => 
                          app.userId._id === user._id && 
                          app.roleTitle === role.title
                        ).status === 'accepted' ? 'bg-green-50 border-green-200' :
                        'bg-red-50 border-red-200'
                      }`}>
                        <p className={`text-xs font-medium ${
                          project.applications.find(app => 
                            app.userId._id === user._id && 
                            app.roleTitle === role.title
                          ).status === 'pending' ? 'text-blue-700' : 
                          project.applications.find(app => 
                            app.userId._id === user._id && 
                            app.roleTitle === role.title
                          ).status === 'accepted' ? 'text-green-700' :
                          'text-red-700'
                        }`}>
                          {project.applications.find(app => 
                            app.userId._id === user._id && 
                            app.roleTitle === role.title
                          ).status === 'pending' ? 'Your application for this role is pending' : 
                          project.applications.find(app => 
                            app.userId._id === user._id && 
                            app.roleTitle === role.title
                          ).status === 'accepted' ? 'You were accepted for this role' :
                          'Your application for this role was not accepted'}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {role.filled}/{role.limit} positions filled
                      </span>
                      
                      <button
                        onClick={() => handleApply(role)}
                        disabled={getApplyButtonState(role).disabled}
                        className={`btn btn-sm ${getApplyButtonState(role).style}`}
                      >
                        {getApplyButtonState(role).text}
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
                          src={application.userId?.profilePicture || "/avatar.png"} 
                          alt={application.userId?.name || "Applicant"} 
                          className="w-8 h-8 rounded-full mr-2" 
                        />
                        <div>
                          {application.userId?.username ? (
                            <Link 
                              to={`/profile/${application.userId.username}`}
                              className="font-medium hover:underline"
                            >
                              {application.userId.name || "Unknown Applicant"}
                            </Link>
                          ) : (
                            <span className="font-medium">
                              {application.userId?.name || "Unknown Applicant"}
                            </span>
                          )}
                          <p className="text-xs text-gray-500">Applied for: {application.roleTitle}</p>
                        </div>
                      </div>
                      
                      {application.message && (
                        <p className="text-sm text-gray-700 mt-2 mb-3 bg-gray-50 p-2 rounded">
                          {application.message}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => processApplication({ applicationId: application._id, status: "rejected" })}
                          disabled={isProcessingApplication}
                          className="btn btn-sm btn-error"
                        >
                          {isProcessingApplication ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            "Reject"
                          )}
                        </button>
                        <button 
                          onClick={() => processApplication({ applicationId: application._id, status: "accepted" })}
                          disabled={isProcessingApplication}
                          className="btn btn-sm btn-success"
                        >
                          {isProcessingApplication ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            "Accept"
                          )}
                        </button>
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
      
      {/* Remove Member Confirmation Modal */}
      {showRemoveConfirmation && memberToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 shadow-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Confirm Team Member Removal</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to remove {memberToRemove.userId?.name || "this member"} from the team?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRemoveConfirmation(false);
                  setMemberToRemove(null);
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeTeamMember(memberToRemove.userId?._id);
                  setShowRemoveConfirmation(false);
                  setMemberToRemove(null);
                }}
                className="btn btn-error"
                disabled={isRemovingMember}
              >
                {isRemovingMember ? (
                  <Loader size={14} className="animate-spin mr-2" />
                ) : null}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage; 