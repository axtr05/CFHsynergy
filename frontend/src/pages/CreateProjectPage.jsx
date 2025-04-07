import { useNavigate } from "react-router-dom";
import CreateProjectForm from "../components/projects/CreateProjectForm";
import { useAuthUser } from "../utils/authHooks";

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const { data: user, isLoading, error } = useAuthUser();

  // Redirect non-founders to home page
  if (!isLoading && user && user.userRole !== "founder") {
    navigate("/");
    return null;
  }

  const handleProjectCreated = (project) => {
    // Redirect to the new project page
    navigate(`/projects/${project._id}`);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create a New Project</h1>
        <p className="text-gray-600 mt-2">
          Share your startup idea with the world and find team members to help you build it.
        </p>
      </div>

      <CreateProjectForm onSuccess={handleProjectCreated} />
    </div>
  );
};

export default CreateProjectPage; 