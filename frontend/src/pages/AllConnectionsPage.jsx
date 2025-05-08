import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import Sidebar from "../components/Sidebar";
import UserCard from "../components/UserCard";
import { useAuthUser } from "../utils/authHooks";
import { Users, Search, ArrowLeft, Loader2, Filter, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AllConnectionsPage = () => {
  const navigate = useNavigate();
  const { data: authUser, isLoading: isAuthLoading } = useAuthUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // all, founder, investor, other

  // Get all potential connections for job seekers
  const { data: potentialConnections, isLoading: isConnectionsLoading } = useQuery({
    queryKey: ["allPotentialConnections"],
    queryFn: async () => {
      const res = await axiosInstance.get("/users/all-connections");
      return res.data;
    },
    enabled: !!authUser && authUser.userRole === "job_seeker"
  });

  if (isAuthLoading || isConnectionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-gray-600 font-medium">Loading potential connections...</p>
        </div>
      </div>
    );
  }

  // If user is not a job seeker, redirect to home
  if (authUser?.userRole !== "job_seeker") {
    navigate("/");
    return null;
  }

  // Filter and sort users
  const filterAndSortUsers = () => {
    if (!potentialConnections) return [];
    
    // First filter by role if needed
    let filtered = potentialConnections;
    if (roleFilter !== "all") {
      filtered = potentialConnections.filter(user => user.userRole === roleFilter);
    }
    
    // Then filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(term) || 
        user.headline?.toLowerCase().includes(term) ||
        user.username?.toLowerCase().includes(term) ||
        user.organization?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  const filteredUsers = filterAndSortUsers();

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
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-lg text-white mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Briefcase size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">All Potential Connections</h1>
                  <p className="text-white/80">Connect with founders and professionals to expand your network</p>
                </div>
              </div>
            </div>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search by name, headline, or organization..."
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
                  <option value="founder">Founders</option>
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
                    ? `No ${roleFilter === "job_seeker" ? "job seekers" : roleFilter === "founder" ? "founders" : "investors"} found in your potential connections`
                    : "No potential connections available at this time"}
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

export default AllConnectionsPage; 