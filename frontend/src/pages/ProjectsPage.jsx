import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { Loader, Filter, Search, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { useAuthUser } from "../utils/authHooks";
import { toast } from "react-hot-toast";

const ProjectCard = ({ project }) => {
  // Get user-friendly stage label
  const getStageLabel = (stageValue) => {
    const stageMap = {
      "idea": "Idea Stage",
      "buildingMVP": "Building MVP",
      "MVP": "MVP Completed",
      "prototype": "Prototype",
      "fundraising": "Fundraising",
      "growth": "Growth",
      "exit": "Exit"
    };
    return stageMap[stageValue] || stageValue;
  };

  const navigate = useNavigate();
  const [showRoles, setShowRoles] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [applicationMessage, setApplicationMessage] = useState("");
  const { data: user } = useAuthUser();

  // Handle card click to navigate to project detail page
  const handleCardClick = (e) => {
    // Don't navigate if clicking on buttons or within expandable sections
    if (
      e.target.closest('button') || 
      showRoles || 
      showApplicationModal || 
      e.target.closest('.modal') ||
      e.target.closest('.dropdown') ||
      e.target.closest('a')
    ) {
      return;
    }
    
    navigate(`/projects/${project._id}`);
  };

  // Mutation for submitting application
  const { mutate: submitApplication, isLoading: isSubmitting } = useMutation({
    mutationFn: async (data) => {
      const response = await axiosInstance.post(`/projects/${project._id}/apply`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Application submitted successfully!");
      setShowApplicationModal(false);
      setApplicationMessage("");
      setSelectedRole(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to submit application");
    }
  });

  const handleRoleClick = (role) => {
    if (!user) {
      toast.error("Please login to apply for roles");
      return;
    }

    if (user.userRole !== "jobseeker") {
      toast.error("Only job seekers can apply for roles");
      return;
    }

    if (project.founder._id === user._id) {
      toast.error("You cannot apply to your own project");
      return;
    }

    if (project.teamMembers.some(member => member.userId._id === user._id)) {
      toast.error("You are already a member of this project");
      return;
    }

    // Check if user has already applied for this specific role
    const existingApplication = project.applications?.find(
      app => app.userId._id === user._id && app.roleTitle === role.title
    );

    if (existingApplication && existingApplication.status === "rejected") {
      toast.error("Your previous application for this role was rejected");
      return;
    }

    if (existingApplication && existingApplication.status === "pending") {
      toast.error("You already have a pending application for this role");
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

  // Function to get team members display
  const renderTeamMembers = () => {
    if (!project.teamMembers || project.teamMembers.length === 0) {
      return (
        <div className="text-center py-3">
          <p className="text-gray-500 text-sm">Only founder at the moment</p>
          <div className="flex items-center justify-center mt-2">
            <img 
              src={project.founder?.profilePicture || "/avatar.png"} 
              alt={project.founder?.name} 
              className="w-8 h-8 rounded-full mr-2"
            />
            <span className="text-sm font-medium">{project.founder?.name}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Founder:</span>
          <div className="flex items-center">
            <img 
              src={project.founder?.profilePicture || "/avatar.png"} 
              alt={project.founder?.name} 
              className="w-6 h-6 rounded-full mr-1"
            />
            <span className="text-sm">{project.founder?.name}</span>
          </div>
        </div>
        
        {project.teamMembers.map((member, index) => (
          <div key={index} className="flex items-center justify-between py-1 border-t border-gray-100">
            <span className="text-sm text-gray-600">{member.role || "Team Member"}</span>
            <div className="flex items-center">
              <img 
                src={member.userId?.profilePicture || "/avatar.png"} 
                alt={member.userId?.name} 
                className="w-6 h-6 rounded-full mr-1"
              />
              <span className="text-sm">{member.userId?.name}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Function to render project details
  const renderDetails = () => {
    return (
      <div className="py-2">
        <p className="text-gray-600 text-sm mb-3">
          {project.description}
        </p>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">Category:</span> {project.category}
          </div>
          <div>
            <span className="font-medium">Stage:</span> {getStageLabel(project.stage)}
          </div>
          <div>
            <span className="font-medium">Team Size:</span> {project.teamSize}
          </div>
          <div>
            <span className="font-medium">Created:</span> {new Date(project.createdAt).toLocaleDateString()}
          </div>
        </div>
        
        {project.website && (
          <div className="mt-3">
            <a 
              href={project.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-sm flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Visit Project Website
            </a>
          </div>
        )}
      </div>
    );
  };

  // Function to render comments
  const renderComments = () => {
    if (!project.comments || project.comments.length === 0) {
      return (
        <div className="text-center py-3">
          <p className="text-gray-500 text-sm">No comments yet</p>
        </div>
      );
    }

    return (
      <div className="py-2">
        {project.comments.slice(0, 3).map((comment, index) => (
          <div key={index} className="mb-2 pb-2 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center mb-1">
              <img 
                src={comment.user?.profilePicture || "/avatar.png"} 
                alt={comment.user?.name} 
                className="w-5 h-5 rounded-full mr-1"
              />
              <span className="text-xs font-medium">{comment.user?.name}</span>
              <span className="text-xs text-gray-500 ml-auto">{new Date(comment.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-gray-600">{comment.text}</p>
          </div>
        ))}
        
        {project.comments.length > 3 && (
          <div className="text-center mt-1">
            <Link to={`/projects/${project._id}`} className="text-blue-500 hover:underline text-xs">
              View all {project.comments.length} comments
            </Link>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="block cursor-pointer" onClick={handleCardClick}>
      <div className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300">
        {project.poster ? (
          <img
            src={project.poster}
            alt={project.name}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <h3 className="text-white text-xl font-semibold">{project.name}</h3>
          </div>
        )}
        
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold mb-1">{project.name}</h3>
              <div className="flex items-center mb-1">
                <img 
                  src={project.founder?.profilePicture || "/avatar.png"} 
                  alt={project.founder?.name} 
                  className="w-5 h-5 rounded-full mr-1"
                />
                <span className="text-sm text-gray-600">{project.founder?.name}</span>
              </div>
            </div>
            <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
              {getStageLabel(project.stage)}
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mt-2 line-clamp-2">
            {project.description}
          </p>
          
          <div className="mt-3 flex flex-wrap gap-1">
            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
              {project.category}
            </span>
            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
              Team: {project.teamMembers?.length || 1}/{project.teamSize}
            </span>
          </div>
        </div>
      </div>
      
      {/* Expandable Roles - using stopPropagation to prevent card click */}
      <div className="bg-white border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShowRoles(!showRoles);
            setActiveTab(null);
          }}
          className="w-full text-left py-2 px-4 flex items-center justify-between"
        >
          <span className="text-sm font-medium text-gray-600">
            {showRoles ? "Hide Roles" : "Show Available Roles"}
          </span>
          <span className="text-gray-500">
            {showRoles ? "▲" : "▼"}
          </span>
        </button>
        
        {showRoles && (
          <div className="border-t border-gray-200">
            {/* Roles Section */}
            {activeTab === null && (
              <div className="p-4">
                {project.openRoles && project.openRoles.length > 0 ? (
                  project.openRoles.map((role, index) => {
                    // Check for role-specific application status
                    const userApplication = user && project.applications?.find(
                      app => app.userId._id === user._id && app.roleTitle === role.title
                    );
                    
                    const isFilled = role.filled >= role.limit;
                    const isRejected = userApplication && userApplication.status === "rejected";
                    const isPending = userApplication && userApplication.status === "pending";
                    const isAccepted = userApplication && userApplication.status === "accepted";
                    const isCancelled = userApplication && userApplication.status === "cancelled";
                    
                    // Set button text and style based on status
                    let buttonText = "Apply for this role";
                    let buttonClass = "text-gray-700";
                    let iconClass = "bg-purple-600";
                    let disabled = false;
                    
                    if (isFilled) {
                      buttonText = "Position filled";
                      buttonClass = "text-gray-400";
                      iconClass = "bg-gray-400";
                      disabled = true;
                    } else if (isRejected) {
                      buttonText = "Application rejected";
                      buttonClass = "text-gray-400";
                      iconClass = "bg-red-400";
                      disabled = true;
                    } else if (isPending) {
                      buttonText = "Application pending";
                      buttonClass = "text-blue-600";
                      iconClass = "bg-blue-600";
                      disabled = true;
                    } else if (isAccepted) {
                      buttonText = "Application accepted";
                      buttonClass = "text-green-600";
                      iconClass = "bg-green-600";
                      disabled = true;
                    } else if (isCancelled) {
                      buttonText = "Reapply for this role";
                      buttonClass = "text-purple-600";
                      iconClass = "bg-purple-600";
                      disabled = false;
                    }
                    
                    return (
                      <div key={index} className="mb-2 last:mb-0">
                        <div className="flex items-start gap-2 p-2 rounded">
                          <div className="flex-grow">
                            <div className="flex justify-between">
                              <span className="font-medium">{role.title}</span>
                              <span className="text-xs text-gray-500">
                                {role.filled}/{role.limit} filled
                              </span>
                            </div>
                            {role.description && (
                              <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRoleClick(role);
                          }}
                          disabled={disabled}
                          className={`w-full flex items-center gap-2 hover:bg-gray-100 p-2 rounded ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
                        >
                          <div className={`${iconClass} rounded-full w-6 h-6 flex items-center justify-center text-white text-sm`}>
                            {isPending ? '⏳' : isAccepted ? '✓' : isRejected ? '✗' : '+'}
                          </div>
                          <span className={buttonClass}>{buttonText}</span>
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 italic text-sm text-center py-2">No open roles at the moment</p>
                )}
              </div>
            )}
            
            {/* Team Members Tab Content */}
            {activeTab === 'team' && (
              <div className="p-4">
                {/* Team Members */}
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Team Members</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTeamMembers(!showTeamMembers);
                      }}
                      className="text-primary hover:text-primary-dark"
                    >
                      {showTeamMembers ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  {showTeamMembers && (
                    <div className="mt-2 space-y-2">
                      {project.teamMembers && project.teamMembers.length > 0 ? (
                        project.teamMembers.map((member) => (
                          <div key={member.userId._id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <img 
                                src={member.userId.profilePicture || "/avatar.png"} 
                                alt={member.userId.name} 
                                className="w-6 h-6 rounded-full mr-2" 
                              />
                              <Link 
                                to={`/profile/${member.userId.username}`}
                                className="text-sm text-gray-600 hover:text-primary hover:underline"
                              >
                                {member.userId.name}
                              </Link>
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              {member.role}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">No team members yet</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Details Tab Content */}
            {activeTab === 'details' && (
              <div className="p-4">
                {renderDetails()}
              </div>
            )}
            
            {/* Comments Tab Content */}
            {activeTab === 'comments' && (
              <div className="p-4">
                {renderComments()}
              </div>
            )}
            
            {/* Tab Navigation */}
            <div className="grid grid-cols-3 gap-2 px-4 py-3 border-t border-gray-200">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab(activeTab === 'team' ? null : 'team');
                }}
                className={`text-center py-1.5 text-xs rounded ${
                  activeTab === 'team' 
                    ? 'bg-gray-200 text-gray-800 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                TEAM MEMBERS
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab(activeTab === 'details' ? null : 'details');
                }}
                className={`text-center py-1.5 text-xs rounded ${
                  activeTab === 'details' 
                    ? 'bg-gray-200 text-gray-800 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                DETAILS
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab(activeTab === 'comments' ? null : 'comments');
                }}
                className={`text-center py-1.5 text-xs rounded ${
                  activeTab === 'comments' 
                    ? 'bg-gray-200 text-gray-800 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                COMMENTS ({project.commentCount || 0})
              </button>
            </div>
          </div>
        )}
        
        {!showRoles && (
          <Link to={`/projects/${project._id}`} className="block bg-gray-50 text-center py-2 rounded-b-lg border-t border-gray-200">
            <span className="text-gray-600 text-sm">View Details</span>
          </Link>
        )}
      </div>

      {/* Application Modal - also needs stopPropagation */}
      {showApplicationModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Apply for {selectedRole?.title}</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why do you want to join this project?
              </label>
              <textarea
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows="4"
                placeholder="Tell us about your interest and relevant experience..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowApplicationModal(false);
                  setApplicationMessage("");
                  setSelectedRole(null);
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubmitApplication();
                }}
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? (
                  <Loader size={16} className="animate-spin" />
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

const ProjectsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const { data: user } = useAuthUser();
  
  const page = Number(searchParams.get("page")) || 1;
  const category = searchParams.get("category") || "";
  const stage = searchParams.get("stage") || "";
  const sort = searchParams.get("sort") || "latest";
  const search = searchParams.get("search") || "";
  
  // Get projects with filters
  const { data, isLoading, error } = useQuery({
    queryKey: ["projects", page, category, stage, sort, search],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page,
        limit: 12,
        sort,
      });
      
      if (category) queryParams.append("category", category);
      if (stage) queryParams.append("stage", stage);
      if (search) queryParams.append("search", search);
      
      const response = await axiosInstance.get(`/projects?${queryParams}`);
      return response.data;
    },
  });
  
  const handleSearch = (e) => {
    e.preventDefault();
    const searchValue = e.target.elements.search.value;
    setSearchParams(prev => {
      if (searchValue) {
        prev.set("search", searchValue);
      } else {
        prev.delete("search");
      }
      prev.set("page", "1");
      return prev;
    });
  };
  
  const clearFilters = () => {
    setSearchParams({ page: "1" });
  };
  
  const setFilter = (name, value) => {
    setSearchParams(prev => {
      if (value) {
        prev.set(name, value);
      } else {
        prev.delete(name);
      }
      prev.set("page", "1");
      return prev;
    });
  };
  
  const categories = [
    "Artificial Intelligence",
    "Creativity",
    "Cyber Security",
    "E-Commerce",
    "Education",
    "Finance",
    "Fitness",
    "Gaming",
    "Marketing",
    "Nonprofits",
    "Real Estate",
    "Software",
    "Travel",
    "Web 3",
  ];

  const stages = [
    { value: "idea", label: "Idea Stage" },
    { value: "buildingMVP", label: "Building MVP" },
    { value: "MVP", label: "MVP Completed" },
    { value: "prototype", label: "Prototype" },
    { value: "fundraising", label: "Fundraising" },
    { value: "growth", label: "Growth" },
    { value: "exit", label: "Exit" },
  ];
  
  const sortOptions = [
    { value: "latest", label: "Most Recent" },
    { value: "oldest", label: "Oldest First" },
    { value: "upvotes", label: "Most Upvotes" },
  ];
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Discover Projects</h1>
          <p className="text-gray-600 mt-1">
            Find exciting startups to join or invest in
          </p>
        </div>
        
        {user?.userRole === "founder" && (
          <Link to="/projects/create" className="btn btn-primary text-white mt-4 md:mt-0">
            <Plus size={18} className="mr-1" /> Create Project
          </Link>
        )}
      </div>
      
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <form onSubmit={handleSearch} className="flex-grow">
            <div className="relative">
              <input
                type="text"
                name="search"
                placeholder="Search projects..."
                defaultValue={search}
                className="input input-bordered w-full pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <button type="submit" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600">
                Go
              </button>
            </div>
          </form>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-outline flex items-center"
            >
              <Filter size={18} className="mr-1" /> Filters
            </button>
            
            <select
              value={sort}
              onChange={(e) => setFilter("sort", e.target.value)}
              className="select select-bordered"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setFilter("category", e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setFilter("stage", e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="">All Stages</option>
                  {stages.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="btn btn-ghost btn-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader size={32} className="animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">Error loading projects</p>
          <button
            onClick={() => refetch()}
            className="btn btn-primary mt-4"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Projects Grid */}
          {data?.projects?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {data.projects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-lg text-gray-600 mb-4">No projects found</p>
              {user?.userRole === "founder" ? (
                <Link to="/projects/create" className="btn btn-primary text-white">
                  Create Your First Project
                </Link>
              ) : (
                <p>Try changing the filters or check back later.</p>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {data?.totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="join">
                <button
                  onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: Math.max(1, page - 1).toString() })}
                  disabled={page === 1}
                  className="join-item btn"
                >
                  «
                </button>
                
                {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: pageNum.toString() })}
                    className={`join-item btn ${pageNum === page ? "btn-active" : ""}`}
                  >
                    {pageNum}
                  </button>
                ))}
                
                <button
                  onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: Math.min(data.totalPages, page + 1).toString() })}
                  disabled={page === data.totalPages}
                  className="join-item btn"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectsPage; 