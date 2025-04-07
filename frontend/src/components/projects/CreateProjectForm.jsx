import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-hot-toast";
import { Loader, Plus, Trash2, Upload } from "lucide-react";

const CreateProjectForm = ({ onSuccess }) => {
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

  const [newRole, setNewRole] = useState({
    title: "",
    description: "",
    limit: 1,
  });

  const [posterPreview, setPosterPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: createProject, isLoading } = useMutation({
    mutationFn: async (data) => {
      // First create the project
      const response = await axiosInstance.post("/projects", {
        name: data.name,
        description: data.description,
        category: data.category,
        teamSize: data.teamSize,
        website: data.website,
        stage: data.stage,
        openRoles: data.openRoles,
      });

      // If there's a poster, upload it
      if (data.poster) {
        const projectId = response.data.project._id;
        await axiosInstance.post(`/projects/${projectId}/poster`, { 
          poster: data.poster 
        });
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Project created successfully!");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (onSuccess) onSuccess(data.project);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Error creating project");
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

    createProject(formData);
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

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-2xl font-bold">Create a New Project</h2>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Current Stage
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Team Size (including you)
              </label>
              <input
                type="number"
                name="teamSize"
                value={formData.teamSize}
                onChange={handleChange}
                min={1}
                max={50}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Website (if any)
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="input input-bordered w-full"
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Roles Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Open Roles</h3>
            
            <div className="border rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={newRole.title}
                    onChange={(e) => setNewRole({ ...newRole, title: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="e.g., Frontend Developer"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Positions
                  </label>
                  <input
                    type="number"
                    value={newRole.limit}
                    onChange={(e) => setNewRole({ ...newRole, limit: Math.max(1, parseInt(e.target.value) || 1) })}
                    min={1}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Description
                </label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="textarea textarea-bordered w-full"
                  placeholder="Describe requirements, responsibilities, etc."
                  rows={2}
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddRole}
                  className="btn btn-secondary"
                >
                  <Plus size={18} className="mr-1" /> Add Role
                </button>
              </div>
            </div>
            
            {formData.openRoles.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Added Roles</h4>
                
                {formData.openRoles.map((role, index) => (
                  <div 
                    key={index} 
                    className="border rounded-lg p-3 bg-gray-50 flex justify-between items-start"
                  >
                    <div>
                      <p className="font-medium">{role.title}</p>
                      {role.description && (
                        <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {role.limit} position{role.limit > 1 ? "s" : ""}
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(index)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="btn btn-primary text-white"
              disabled={isLoading || isUploading}
            >
              {isLoading ? (
                <>
                  <Loader size={18} className="mr-2 animate-spin" />
                  Creating Project...
                </>
              ) : (
                "Create Project"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateProjectForm; 