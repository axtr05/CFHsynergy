import { useParams, useNavigate } from "react-router-dom";
import EditProjectForm from "../components/projects/EditProjectForm";
import { useAuthUser } from "../utils/authHooks";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import { toast } from "react-hot-toast";
import { Loader } from "lucide-react";

const EditProjectPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data: user, isLoading: isUserLoading } = useAuthUser();

  // Check if user is the project founder
  const { data: projectData, isLoading: isProjectLoading } = useQuery({
    queryKey: ["project", projectId, "checkOwner"],
    queryFn: async () => {
      const response = await axiosInstance.get(`/projects/${projectId}`);
      return response.data;
    },
    onError: () => {
      toast.error("Failed to load project data");
      navigate("/projects");
    },
    enabled: !!user,
  });

  // Loading state
  if (isUserLoading || isProjectLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  // Check if user is founder
  if (user && projectData && projectData.project.founder._id !== user._id) {
    toast.error("You can only edit your own projects");
    navigate(`/projects/${projectId}`);
    return null;
  }

  // Handle successful project update
  const handleProjectUpdated = (project) => {
    navigate(`/projects/${project._id}`);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Project</h1>
        <p className="text-gray-600 mt-2">
          Update your project information and open roles.
        </p>
      </div>

      <EditProjectForm 
        projectId={projectId} 
        onSuccess={handleProjectUpdated} 
      />
    </div>
  );
};

export default EditProjectPage; 