import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { Loader, Filter, Search, Plus } from "lucide-react";
import { useAuthUser } from "../utils/authHooks";

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

  return (
    <Link to={`/projects/${project._id}`} className="block">
      <div className="bg-white rounded-lg overflow-hidden shadow-md transition-all hover:shadow-lg">
        {project.poster ? (
          <img 
            src={project.poster} 
            alt={project.name} 
            className="w-full h-40 object-cover"
          />
        ) : (
          <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">No image</span>
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-start justify-between">
            <h3 className="font-bold text-lg mb-1">{project.name}</h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {project.category}
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {project.description}
          </p>
          
          <div className="flex items-center text-xs text-gray-500 mb-3">
            <div className="flex items-center mr-4">
              <span>Team: {project.teamMembers?.length || 1}/{project.teamSize}</span>
            </div>
            <div className="flex items-center">
              <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">
                {getStageLabel(project.stage)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center">
            <img 
              src={project.founder?.profilePicture || "/avatar.png"} 
              alt={project.founder?.name} 
              className="w-6 h-6 rounded-full mr-2"
            />
            <span className="text-sm font-medium">{project.founder?.name}</span>
          </div>
        </div>
      </div>
    </Link>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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