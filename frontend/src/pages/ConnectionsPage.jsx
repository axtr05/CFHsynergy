import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import UserCard from "../components/UserCard";
import { ArrowLeft, Search, Users } from "lucide-react";

const ConnectionsPage = () => {
  const { username, type } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // Get current user's details
  const { data: authUser } = useQuery({
    queryKey: ["authUser"],
  });

  // Get profile user's details
  const { data: userProfile, isLoading: isUserLoading } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: () => axiosInstance.get(`/users/${username}`),
  });

  // Get connections based on the type parameter (mutual or all)
  const { data: connections, isLoading: isConnectionsLoading } = useQuery({
    queryKey: ["connections", username, type],
    queryFn: async () => {
      if (type === "mutual") {
        const res = await axiosInstance.get(`/connections/mutual/${userProfile.data._id}`);
        return res.data;
      } else {
        const res = await axiosInstance.get(`/connections/user/${username}`);
        return res.data;
      }
    },
    enabled: !!userProfile?.data,
  });

  // Check if current user is allowed to view connections
  const canViewConnections = () => {
    if (!authUser || !userProfile?.data) return false;
    
    // User can view their own connections
    if (authUser.username === username) return true;
    
    // User can view if they are connected
    const isConnected = authUser.connections.some(
      (connectionId) => connectionId === userProfile.data._id
    );
    
    return isConnected;
  };

  // Filter connections based on search term and remove user's own profile
  const filteredConnections = connections?.filter((connection) => {
    // Remove the user's own profile from connections
    if (connection._id === authUser._id) return false;
    
    // Apply search filter
    return connection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      connection.headline?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (isUserLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userProfile?.data) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white shadow-md rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <p className="text-gray-600 mb-6">The user you're looking for doesn't exist.</p>
          <Link to="/" className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition duration-300">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!canViewConnections()) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white shadow-md rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-6">
            You need to be connected with {userProfile.data.name} to view their connections.
          </p>
          <Link to={`/profile/${username}`} className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition duration-300">
            View Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <button 
          onClick={() => navigate(`/profile/${username}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Profile
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold">
              {type === "mutual" ? "Mutual Connections" : "Connections"}
            </h1>
            <p className="text-gray-600 text-sm">
              {type === "mutual" 
                ? `People who you and ${userProfile.data.name} both know`
                : `${userProfile.data.name}'s connections`}
            </p>
          </div>
          
          {type === "mutual" && (
            <Link 
              to={`/connections/${username}`} 
              className="text-primary hover:text-primary-dark flex items-center text-sm font-medium"
            >
              <Users size={16} className="mr-1.5" />
              View all connections
            </Link>
          )}
          
          {!type && userProfile.data._id !== authUser._id && (
            <Link 
              to={`/connections/${username}/mutual`} 
              className="text-primary hover:text-primary-dark flex items-center text-sm font-medium"
            >
              <Users size={16} className="mr-1.5" />
              View mutual connections
            </Link>
          )}
        </div>
        
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={16} className="text-gray-500" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            placeholder="Search connections"
          />
        </div>
      </div>

      {isConnectionsLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : filteredConnections?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConnections.map((connection) => (
            <UserCard
              key={connection._id}
              user={connection}
              isConnection={authUser.connections.includes(connection._id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-xl p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">No connections found</h2>
          <p className="text-gray-600 text-sm">
            {searchTerm
              ? "No connections match your search."
              : type === "mutual"
              ? `You and ${userProfile.data.name} don't have any mutual connections yet.`
              : `${userProfile.data.name} doesn't have any connections yet.`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ConnectionsPage; 