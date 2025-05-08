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
      
      // Also invalidate notifications to ensure they appear immediately
      queryClient.invalidateQueries(["notifications"]);
      
      if (variables.status === "accepted") {
        toast.success("Application accepted successfully! Other pending applications from this user will be automatically cancelled.");
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

    // Check if user is already a member
    if (isTeamMember) {
      // Only block if trying to apply for a role they don't already have
      const currentUserRole = project.teamMembers.find(
        member => member.userId._id === user._id
      )?.role;
      
      if (currentUserRole === role.title) {
        toast.error("You are already a member with this role");
        return;
      } else {
        toast.error("You are already a member of this project with a different role");
        return;
      }
    }

    // Check if user has already applied for this specific role
    const existingApplication = project.applications?.find(
      app => app.userId && app.userId._id === user._id && app.roleTitle === role.title
    );

    if (existingApplication && existingApplication.status === "rejected") {
      toast.error("Your previous application for this role was rejected");
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
      // Check for accepted applications
      const acceptedApplications = project.applications.filter(
        app => app.userId && app.userId._id === user._id && app.status === "accepted"
      );
      
      if (acceptedApplications.length > 0) {
        // We'll use application IDs to track which notifications we've shown
        acceptedApplications.forEach(app => {
          const notificationKey = `shown_acceptance_${projectId}_${app._id}`;
          
          // Only show the notification if we haven't shown it before
          if (!localStorage.getItem(notificationKey)) {
            toast.success(`Your application for the ${app.roleTitle} role has been accepted! You are now a member of this project.`);
            localStorage.setItem(notificationKey, "true");
          }
        });
      }
      
      // Check for rejected applications
      const rejectedApplications = project.applications.filter(
        app => app.userId && app.userId._id === user._id && app.status === "rejected"
      );
      
      if (rejectedApplications.length > 0) {
        // Handle rejected applications similarly
        rejectedApplications.forEach(app => {
          const notificationKey = `shown_rejection_${projectId}_${app._id}`;
          
          if (!localStorage.getItem(notificationKey)) {
            toast.error(`Your application for the ${app.roleTitle} role was not accepted.`);
            localStorage.setItem(notificationKey, "true");
          }
        });
      }
    }
  }, [user, project, projectId]);

  // Calculate paginated data
  const paginatedComments = comments?.comments || [];
  const totalCommentsPages = comments ? Math.ceil(comments.total / COMMENTS_PER_PAGE) : 1;
  
  // Filter out team members with deleted profiles (userId is null)
  const validTeamMembers = project?.teamMembers?.filter(member => member.userId) || [];
  const paginatedTeamMembers = validTeamMembers;
  const totalTeamMembersPages = Math.ceil(validTeamMembers.length / TEAM_MEMBERS_PER_PAGE) || 1;

  // Variable definitions
  const isFounder = user && project?.founder?._id === user?._id;
  const hasApplied = user && project?.applications?.some(app => app?.userId && app?.userId?._id === user?._id && app?.status === "pending");
  const hasBeenRejectedForAny = user && project?.applications?.some(app => app?.userId && app?.userId?._id === user._id && app?.status === "rejected");
  const hasBeenCancelledForAny = user && project?.applications?.some(app => app?.userId && app?.userId?._id === user._id && app?.status === "cancelled");
  const hasBeenAcceptedForAny = user && project?.applications?.some(app => app?.userId && app?.userId?._id === user._id && app?.status === "accepted");
  const isPendingApprovalForAny = user && project?.applications?.some(app => app?.userId && app?.userId?._id === user._id && app?.status === "pending");
  // Check if the user is currently a team member (not considering past membership)
  const isTeamMember = project?.teamMembers?.some(member => member?.userId?._id === user?._id);
  // Check if the user was previously a team member but is no longer
  const wasPreviouslyTeamMember = hasBeenAcceptedForAny && !isTeamMember;
  const hasUpvoted = project?.upvotes?.some(upvoteId => upvoteId === user?._id);
  
  const projectCommentsToShow = showAllComments 
    ? comments?.comments 
    : comments?.comments?.slice(0, 3);

  const getApplyButtonState = (role) => {
    // Handle case when role is null or undefined
    if (!role) {
      return { 
        text: "Select a role", 
        disabled: true, 
        style: "btn-disabled" 
      };
    }
    
    if (isFounder) return { text: "You're the founder", disabled: true, style: "btn-disabled" };
    
    // Check if user is currently a team member (not a past member)
    // Note: We use the current teamMembers array to determine membership status
    if (isTeamMember) {
      // Check if they're specifically in this role
      const userRole = project.teamMembers?.find(
        member => member?.userId?._id === user?._id
      )?.role;
      
      if (userRole === role.title) {
        return { text: "You're a member", disabled: true, style: "btn-disabled" };
      } else {
        // User is a member but in a different role
        return { text: "Already in another role", disabled: true, style: "btn-disabled" };
      }
    }
    
    // Check for role-specific application status
    const userApplication = user && project?.applications?.find(
      app => app?.userId && app.userId._id === user._id && app?.roleTitle === role?.title
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
        // If they were accepted but aren't in teamMembers, they might have been removed
        if (!isTeamMember) {
          return { text: <><Plus size={16} className="mr-1" />Apply Again</>, disabled: false, style: "btn-primary" };
        }
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

  // Only get button state if selectedRole exists
  const buttonState = selectedRole ? getApplyButtonState(selectedRole) : { text: "Select a role", disabled: true, style: "btn-disabled" };
  
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
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-500">Loading project details...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-96">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-800 font-medium mb-2">Error Loading Project</p>
          <p className="text-gray-500 text-center mb-4">There was a problem loading this project.</p>
          <button 
            onClick={() => refetch()} 
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      ) : !project ? (
        <div className="flex flex-col items-center justify-center h-96">
          <p className="text-gray-800 font-medium mb-2">Project Not Found</p>
          <p className="text-gray-500 text-center mb-4">The requested project could not be found.</p>
          <Link to="/projects" className="btn btn-primary">
            Browse Projects
          </Link>
        </div>
      ) : (
        <>
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
                      .filter(member => member.userId) // Filter out members with no user data (deleted profiles)
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
                                  {member.userId.name}
                                </Link>
                              ) : (
                                <span className="font-medium">
                                  {member.userId?.name}
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
                    
                    {validTeamMembers.length <= 1 && (
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
                
                {/* Show message for users who were previously team members but are now removed */}
                {user && wasPreviouslyTeamMember && (
                  <div className="mb-4 p-3 rounded-lg border bg-blue-50 border-blue-200">
                    <p className="text-sm font-medium text-blue-700">
                      You were previously a member of this project but have been removed. You can apply for roles again.
                    </p>
                  </div>
                )}

                {/* Show message for users who have left the project */}
                {user && project?.pastMembers?.some(member => member.userId?._id === user._id) && !wasPreviouslyTeamMember && (
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
                      Some of your applications were cancelled because you were accepted for a different role.
                      {!isTeamMember && " You can reapply if you want."}
                    </p>
                  </div>
                )}
                
                {project && project.openRoles && project.openRoles.length > 0 ? (
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
                        {user && (() => {
                          // Find application for this specific role
                          const roleApplication = project.applications?.find(app => 
                            app.userId && app.userId._id === user._id && 
                            app.roleTitle === role.title
                          );
                          
                          // Only show acceptance message if this user is a team member with THIS specific role
                          const isUserAcceptedForThisRole = project.teamMembers?.some(member => 
                            member.userId && 
                            member.userId._id === user._id && 
                            member.role === role.title
                          );
                          
                          // For pending applications
                          if (roleApplication && roleApplication.status === 'pending') {
                            return (
                              <div className="mb-3 p-2 rounded-lg border bg-blue-50 border-blue-200">
                                <p className="text-xs font-medium text-blue-700">
                                  Your application for this role is pending
                                </p>
                              </div>
                            );
                          }
                          
                          // Only show acceptance message for the role they were actually accepted for
                          if (isUserAcceptedForThisRole) {
                            return (
                              <div className="mb-3 p-2 rounded-lg border bg-green-50 border-green-200">
                                <p className="text-xs font-medium text-green-700">
                                  You were accepted for this role
                                </p>
                              </div>
                            );
                          }
                          
                          return null;
                        })()}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {role.filled}/{role.limit} positions filled
                          </span>
                          
                          <button
                            onClick={() => handleApply(role)}
                            disabled={role ? getApplyButtonState(role).disabled : true}
                            className={`btn btn-sm ${role ? getApplyButtonState(role).style : 'btn-disabled'}`}
                          >
                            {role ? getApplyButtonState(role).text : 'Select role'}
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
                      .filter(app => app.userId) // Filter out applications with no user data (deleted profiles)
                      .map((application) => (
                        <div key={application._id} className="border rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <img 
                              src={application.userId?.profilePicture || "/avatar.png"} 
                              alt={application.userId?.name} 
                              className="w-8 h-8 rounded-full mr-2" 
                            />
                            <div>
                              {application.userId?.username ? (
                                <Link 
                                  to={`/profile/${application.userId.username}`}
                                  className="font-medium hover:underline"
                                >
                                  {application.userId.name}
                                </Link>
                              ) : (
                                <span className="font-medium">
                                  {application.userId.name}
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
        </>
      )}
    </div>
  );
};

export default ProjectDetailPage; 