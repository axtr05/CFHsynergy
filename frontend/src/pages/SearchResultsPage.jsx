import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import UserCard from "../components/UserCard";
import { Search } from "lucide-react";
import { useAuthUser } from "../utils/authHooks";

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { data: authUser } = useAuthUser();

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["searchUsers", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await axiosInstance.get(`/users/search?query=${query}`);
      return res.data;
    },
    enabled: query.trim().length > 0,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="col-span-1 lg:col-span-1">
        <Sidebar user={authUser} />
      </div>
      <div className="col-span-1 lg:col-span-3">
        <div className="bg-secondary rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-2">Search Results</h1>
          <p className="text-gray-600 mb-6">
            Showing results for "{query}"
          </p>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : searchResults?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((user) => (
                <UserCard 
                  key={user._id} 
                  user={user} 
                  isConnection={authUser.connections?.includes(user._id)} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Search size={48} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No users found</h2>
              <p className="text-gray-500">
                Try searching with a different username or name
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage; 