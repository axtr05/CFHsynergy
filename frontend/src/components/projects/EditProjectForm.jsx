import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-hot-toast";
import { Loader, Plus, Trash2, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EditProjectForm = ({ projectId, onSuccess }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    teamSize: 1,
    website: "",
    stage: "idea",
    poster: "",
    openRoles: [],
  });
  const [newRole, setNewRole] = useState({ title: "", description: "", limit: 1 });
  const [posterPreview, setPosterPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Fetch project data
  const { data: projectData, isLoading: isLoadingProject } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/projects/${projectId}`);
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Project data loaded:", data.project.name);
    },
    onError: (error) => {
      console.error("Error loading project:", error);
      toast.error("Failed to load project data");
      navigate("/projects");
    },
  });

  // Set form data when project data is available
  useEffect(() => {
    if (projectData && projectData.project) {
      const project = projectData.project;
      
      // Using setTimeout to ensure this runs after state updates
      setTimeout(() => {
        setFormData({
          name: project.name || "",
          description: project.description || "",
          category: project.category || "",
          teamSize: project.teamSize || 1,
          website: project.website || "",
          stage: project.stage || "idea",
          poster: project.poster || "",
          openRoles: project.openRoles || [],
        });
        
        if (project.poster) {
          setPosterPreview(project.poster);
        }
        
        setIsDataLoaded(true);
        
        console.log("Form data set successfully:", {
          name: project.name,
          description: project.description?.substring(0, 30) + "...",
        });
      }, 0);
    }
  }, [projectData]);

  const { mutate: updateProject, isLoading } = useMutation({
    mutationFn: async (data) => {
      // First update the project
      const response = await axiosInstance.put(`/projects/${projectId}`, {
        name: data.name,
        description: data.description,
        category: data.category,
        teamSize: data.teamSize,
        website: data.website,
        stage: data.stage,
        openRoles: data.openRoles,
      });

      // If there's a new poster, upload it
      if (data.poster && data.poster !== projectData?.project.poster) {
        await axiosInstance.post(`/projects/${projectId}/poster`, { 
          poster: data.poster 
        });
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Project updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      if (onSuccess) onSuccess(data.project);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Error updating project");
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePosterChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Show uploading toast
    const loadingToast = toast.loading("Processing image...");
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      setPosterPreview(event.target.result);
      setFormData((prev) => ({
        ...prev,
        poster: event.target.result,
      }));
      
      // Success toast
      toast.dismiss(loadingToast);
      toast.success("Image processed successfully");
      setIsUploading(false);
    };
    
    reader.onerror = () => {
      // Error toast
      toast.dismiss(loadingToast);
      toast.error("Error processing image");
      setIsUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleAddRole = () => {
    if (!newRole.title.trim()) {
      toast.error("Role title is required");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      openRoles: [...prev.openRoles, { ...newRole, filled: 0 }],
    }));

    setNewRole({
      title: "",
      description: "",
      limit: 1,
    });
  };

  const handleRemoveRole = (index) => {
    setFormData((prev) => ({
      ...prev,
      openRoles: prev.openRoles.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Project description is required");
      return;
    }

    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }

    updateProject(formData);
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

  // Show loading state while fetching data
  if (isLoadingProject || (!isDataLoaded && projectData)) {
    return (
      <div className="bg-white rounded-lg shadow p-8 flex flex-col items-center justify-center h-64">
        <Loader className="h-10 w-10 animate-spin text-primary mb-4" />
        <h3 className="text-lg font-medium text-gray-700">Loading project data...</h3>
        <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the existing project details</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {projectData && projectData.project && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-medium text-blue-800">Editing Project: {projectData.project.name}</h3>
              <p className="text-sm text-blue-600 mt-1">
                Current stage: {stages.find(s => s.value === projectData.project.stage)?.label || projectData.project.stage}
              </p>
            </div>
            {projectData.project.upvotes?.length > 0 && (
              <div className="bg-white px-3 py-1 rounded-full text-sm text-blue-700 font-medium border border-blue-200">
                {projectData.project.upvotes.length} upvotes
              </div>
            )}
          </div>
          
          {/* Team members info */}
          {projectData.project.teamMembers && projectData.project.teamMembers.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-blue-700 font-medium mb-2">Current Team Members:</p>
              <div className="flex flex-wrap gap-2">
                {projectData.project.teamMembers.map((member, i) => (
                  <div key={i} className="bg-white px-2 py-1 rounded border border-blue-200 text-xs flex items-center">
                    <img 
                      src={member.userId.profilePicture || "/avatar.png"} 
                      alt={member.userId.name} 
                      className="w-4 h-4 rounded-full mr-1" 
                    />
                    <span>{member.userId.name}</span>
                    <span className="text-gray-500 ml-1">({member.role})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-2xl font-bold">Edit Project</h2>

          {/* Poster Upload */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Project Image
            </label>
            <div className="flex items-center space-x-4">
              <div
                className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer overflow-hidden"
                onClick={() => document.getElementById("poster-upload").click()}
              >
                {posterPreview ? (
                  <img
                    src={posterPreview}
                    alt="Project poster"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span className="text-sm text-gray-500 mt-1">Upload Image</span>
                  </>
                )}
              </div>
              <input
                type="file"
                id="poster-upload"
                className="hidden"
                accept="image/*"
                onChange={handlePosterChange}
                disabled={isUploading}
              />
              <div className="text-sm text-gray-500">
                <p>Recommended size: 1200 x 630 pixels</p>
                <p>Max file size: 5MB</p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Project Name*
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input input-bordered w-full"
              placeholder="Enter project name"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Description*
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="textarea textarea-bordered w-full"
              placeholder="Describe your project idea, goals, and vision"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Category*
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="select select-bordered w-full"
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Team Size
              </label>
              <input
                type="number"
                name="teamSize"
                value={formData.teamSize}
                onChange={handleChange}
                min={1}
                max={100}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Project Stage
              </label>
              <select
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                className="select select-bordered w-full"
              >
                {stages.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Website URL
            </label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="input input-bordered w-full"
              placeholder="https://yourproject.com"
            />
          </div>

          {/* Open Roles */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Open Roles
            </label>
            <div className="space-y-4 mb-4">
              {formData.openRoles.map((role, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 flex flex-col md:flex-row gap-4 md:items-end"
                >
                  <div className="flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-gray-700 text-sm mb-1">
                          Role Title
                        </label>
                        <input
                          type="text"
                          value={role.title}
                          onChange={(e) => {
                            const newRoles = [...formData.openRoles];
                            newRoles[index].title = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              openRoles: newRoles,
                            }));
                          }}
                          className="input input-bordered w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-1">
                          Positions
                        </label>
                        <div className="flex flex-col">
                          <input
                            type="number"
                            value={role.limit}
                            onChange={(e) => {
                              const newRoles = [...formData.openRoles];
                              newRoles[index].limit = parseInt(e.target.value) || 1;
                              setFormData((prev) => ({
                                ...prev,
                                openRoles: newRoles,
                              }));
                            }}
                            min={role.filled || 1}
                            className="input input-bordered w-full"
                          />
                          {role.filled > 0 && (
                            <span className="text-xs text-gray-500 mt-1">
                              {role.filled} position{role.filled !== 1 ? 's' : ''} already filled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-gray-700 text-sm mb-1">
                        Description
                      </label>
                      <textarea
                        value={role.description}
                        onChange={(e) => {
                          const newRoles = [...formData.openRoles];
                          newRoles[index].description = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            openRoles: newRoles,
                          }));
                        }}
                        rows={2}
                        className="textarea textarea-bordered w-full"
                        placeholder="Describe the responsibilities and requirements"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="btn btn-error btn-outline"
                      onClick={() => handleRemoveRole(index)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add New Role Form */}
              <div className="border border-dashed rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Add New Role</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 text-sm mb-1">
                      Role Title
                    </label>
                    <input
                      type="text"
                      value={newRole.title}
                      onChange={(e) =>
                        setNewRole((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="input input-bordered w-full"
                      placeholder="e.g. Frontend Developer"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">
                      Positions
                    </label>
                    <input
                      type="number"
                      value={newRole.limit}
                      onChange={(e) =>
                        setNewRole((prev) => ({
                          ...prev,
                          limit: parseInt(e.target.value) || 1,
                        }))
                      }
                      min={1}
                      className="input input-bordered w-full"
                    />
                  </div>
                </div>
                <div className="mb-2">
                  <label className="block text-gray-700 text-sm mb-1">
                    Description
                  </label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) =>
                      setNewRole((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={2}
                    className="textarea textarea-bordered w-full"
                    placeholder="Describe the responsibilities and requirements"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddRole}
                  >
                    <Plus size={16} className="mr-1" />
                    Add Role
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || isUploading}
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Project"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditProjectForm; 