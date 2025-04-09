import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import Sidebar from "../components/Sidebar";
import UserCard from "../components/UserCard";
import RecommendedUser from "../components/RecommendedUser";
import { useAuthUser } from "../utils/authHooks";
import { Briefcase, TrendingUp, Users, Search, ArrowLeft, Loader2, Filter } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const RecommendationsPage = () => {
  const navigate = useNavigate();
  const { data: authUser, isLoading: isAuthLoading } = useAuthUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // all, founder, investor, job_seeker

  // Get all recommendations based on user role
  const { data: recommendedUsers, isLoading: isRecommendationsLoading } = useQuery({
    queryKey: ["recommendedUsers", authUser?.userRole, "all"],
    queryFn: async () => {
      // Different endpoint based on user role
      const roleParam = authUser?.userRole || "default";
      // Get more recommendations for the full page
      const res = await axiosInstance.get(`/users/suggestions?role=${roleParam}&limit=50`);
      return res.data;
    },
    enabled: !!authUser
  });

  if (isAuthLoading || isRecommendationsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-gray-600 font-medium">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  // Filter and sort users
  const filterAndSortUsers = () => {
    if (!recommendedUsers) return [];
    
    // First filter by role if needed
    let filtered = recommendedUsers;
    if (roleFilter !== "all") {
      filtered = recommendedUsers.filter(user => user.userRole === roleFilter);
    }
    
    // Then filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(term) || 
        user.headline?.toLowerCase().includes(term) ||
        user.username?.toLowerCase().includes(term)
      );
    }
    
    // Sort by role priority regardless of filter
    const founders = filtered.filter(user => user.userRole === "founder");
    const investors = filtered.filter(user => user.userRole === "investor");
    const jobSeekers = filtered.filter(user => user.userRole === "job_seeker");
    const others = filtered.filter(user => 
      user.userRole !== "founder" && 
      user.userRole !== "investor" && 
      user.userRole !== "job_seeker"
    );
    
    // Put founders and investors first, then job seekers
    return [...founders, ...investors, ...jobSeekers, ...others];
  };

  const filteredUsers = filterAndSortUsers();
  
  // Determine the title and icon based on user role
  const getRecommendationTitle = () => {
    switch(authUser?.userRole) {
      case "founder":
        return {
          title: "Investors you may want to connect with",
          subtitle: "Connect with investors who can help grow your startup",
          icon: <TrendingUp size={24} className="text-blue-500" />,
          gradient: "from-blue-500 to-indigo-500"
        };
      case "investor":
        return {
          title: "Founders you may want to connect with",
          subtitle: "Discover promising startups and founders",
          icon: <Briefcase size={24} className="text-green-500" />,
          gradient: "from-green-500 to-emerald-500"
        };
      case "job_seeker":
        return {
          title: "Founders looking for talent",
          subtitle: "Find opportunities at growing startups",
          icon: <Briefcase size={24} className="text-purple-500" />,
          gradient: "from-purple-500 to-pink-500"
        };
      default:
        return {
          title: "People you may know",
          subtitle: "Expand your professional network",
          icon: <Users size={24} className="text-gray-500" />,
          gradient: "from-gray-500 to-slate-500"
        };
    }
  };

  const recommendation = getRecommendationTitle();

  return (
    <div className="max-w-7xl mx-auto pt-6 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="hidden lg:block lg:col-span-1">
          <Sidebar user={authUser} />
        </div>
        
        <div className="col-span-1 lg:col-span-3">
          {/* Header with Back Button */}
          <div className="mb-6">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back to Home
            </button>
            
            {/* Title Section with Gradient */}
            <div className={`bg-gradient-to-r ${recommendation.gradient} p-6 rounded-lg text-white mb-6`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg">
                  {recommendation.icon}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{recommendation.title}</h1>
                  <p className="text-white/80">{recommendation.subtitle}</p>
                </div>
              </div>
            </div>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search by name or headline..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
                />
                <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-500" />
                <select 
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="founder">Entrepreneurs</option>
                  <option value="investor">Investors</option>
                  <option value="job_seeker">Job Seekers</option>
                </select>
              </div>
            </div>
            
            {/* Results Count */}
            <div className="text-gray-600 mb-4">
              Showing {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            </div>
          </div>
          
          {/* User Cards Grid */}
          {filteredUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => (
                <UserCard key={user._id} user={user} isConnection={false} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-secondary rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
              <Users size={64} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-bold mb-2">No users found</h2>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? "Try adjusting your search criteria"
                  : roleFilter !== "all" 
                    ? `No ${roleFilter === "job_seeker" ? "job seekers" : roleFilter === "founder" ? "entrepreneurs" : "investors"} found in your recommendations`
                    : "No recommendations available at this time"}
              </p>
              {(searchTerm || roleFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                  }}
                  className="px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendationsPage; 