import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["searchUsers", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const res = await axiosInstance.get(`/users/search?query=${searchQuery}`);
      return res.data;
    },
    enabled: searchQuery.trim().length > 0,
  });

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${searchQuery}`);
      setShowResults(false);
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      <form onSubmit={handleSearch} className="relative">
        <div className="relative flex items-center">
          <Search size={18} className="absolute left-2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            className="bg-base-100 pl-9 pr-8 py-1.5 rounded-full text-sm w-full md:w-60 focus:outline-none focus:ring-1 focus:ring-primary"
            onFocus={() => setShowResults(true)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setShowResults(false);
              }}
              className="absolute right-2"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>
      </form>

      {/* Search Results Dropdown */}
      {showResults && searchQuery.trim() !== "" && (
        <div className="absolute top-full mt-1 w-full bg-white rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-sm text-gray-500">Loading...</div>
          ) : searchResults?.length > 0 ? (
            searchResults.map((user) => (
              <Link
                key={user._id}
                to={`/profile/${user.username}`}
                onClick={() => setShowResults(false)}
                className="flex items-center p-2 hover:bg-gray-50 transition-colors"
              >
                <img
                  src={user.profilePicture || "/avatar.png"}
                  alt={user.name}
                  className="w-8 h-8 rounded-full mr-2"
                />
                <div>
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-gray-500">@{user.username}</p>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-3 text-center text-sm text-gray-500">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar; 