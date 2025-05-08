import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthUser } from "../utils/authHooks";
import { axiosInstance } from "../lib/axios";
import { toast } from "react-hot-toast";
import { Loader, ArrowLeft } from "lucide-react";
import EditProjectForm from "../components/projects/EditProjectForm";

const EditProjectPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data: user, isLoading: isLoadingUser } = useAuthUser();

  // Fetch project data and check if user is the founder
  const { 
    data: projectData, 
    isLoading: isLoadingProject,
    error 
  } = useQuery({
    queryKey: ["project", projectId, "checkOwner"],
    queryFn: async () => {
      const response = await axiosInstance.get(`/projects/${projectId}`);
      return response.data;
    },
    enabled: !!user && !!projectId,
    retry: 1,
    onError: (error) => {
      console.error("Error fetching project:", error);
      toast.error(error.response?.data?.message || "Failed to load project");
    }
  });

  // Handle loading state
  if (isLoadingUser || isLoadingProject) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 flex flex-col items-center justify-center h-64">
          <Loader className="h-10 w-10 animate-spin text-primary mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Loading project data...</h3>
          <p className="text-gray-500 text-sm mt-2">Please wait while we prepare the edit form</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 flex flex-col items-center justify-center h-64">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700">Failed to load project data</h3>
          <p className="text-gray-500 text-sm mt-2 mb-4">There was an error retrieving the project information</p>
          <button 
            onClick={() => navigate("/projects")}
            className="btn btn-primary"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 flex flex-col items-center justify-center h-64">
          <h3 className="text-lg font-medium text-gray-700">Authentication Required</h3>
          <p className="text-gray-500 text-sm mt-2 mb-4">Please log in to edit this project</p>
          <button
            onClick={() => navigate("/login")}
            className="btn btn-primary"
          >
            Login to Continue
          </button>
        </div>
      </div>
    );
  }

  // Check if project exists
  if (!projectData || !projectData.project) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 flex flex-col items-center justify-center h-64">
          <h3 className="text-lg font-medium text-gray-700">Project Not Found</h3>
          <p className="text-gray-500 text-sm mt-2 mb-4">The project you're looking for doesn't exist or has been removed</p>
          <button
            onClick={() => navigate("/projects")}
            className="btn btn-primary"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  // Check if user is the founder
  const isFounder = projectData.project.founder._id === user._id;
  
  if (!isFounder) {
    toast.error("Only the project founder can edit this project");
    navigate(`/projects/${projectId}`);
    return null;
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="btn btn-ghost flex items-center"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Project
        </button>
      </div>
      
      <EditProjectForm 
        projectId={projectId} 
        onSuccess={() => {
          navigate(`/projects/${projectId}`);
        }} 
      />
    </div>
  );
};

export default EditProjectPage; 