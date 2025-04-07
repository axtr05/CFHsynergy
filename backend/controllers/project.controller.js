import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import Comment from "../models/comment.model.js";
import Notification from "../models/notification.model.js";

// Create a new project
export const createProject = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      category, 
      teamSize, 
      website, 
      stage, 
      openRoles 
    } = req.body;
    
    // Validate required fields
    if (!name || !description || !category) {
      return res.status(400).json({ message: "Name, description and category are required" });
    }
    
    // Check if user is a founder
    if (req.user.userRole !== "founder") {
      return res.status(403).json({ message: "Only founders can create projects" });
    }
    
    // Create project with founder as first team member
    const project = new Project({
      name,
      description,
      category,
      founder: req.user._id,
      teamSize: teamSize || 1,
      website: website || "",
      stage: stage || "idea",
      openRoles: openRoles || [],
      teamMembers: [{
        userId: req.user._id,
        role: "Founder",
        joinDate: new Date()
      }]
    });
    
    await project.save();
    
    res.status(201).json({
      message: "Project created successfully",
      project
    });
  } catch (error) {
    console.error("Error in createProject:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all projects with pagination and filters
export const getProjects = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      stage,
      sort = "latest",
      search 
    } = req.query;
    
    const query = {};
    
    // Apply filters if provided
    if (category) query.category = category;
    if (stage) query.stage = stage;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Determine sort order
    let sortOption = {};
    switch(sort) {
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "upvotes":
        sortOption = { upvoteCount: -1 };
        break;
      case "latest":
      default:
        sortOption = { createdAt: -1 };
    }
    
    // Execute query with pagination
    const projects = await Project.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .populate("founder", "name username profilePicture")
      .populate("teamMembers.userId", "name username profilePicture")
      .lean();
    
    // Get total count for pagination
    const totalProjects = await Project.countDocuments(query);
    
    res.status(200).json({
      projects,
      currentPage: pageNum,
      totalPages: Math.ceil(totalProjects / limitNum),
      totalProjects
    });
  } catch (error) {
    console.error("Error in getProjects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get projects by specific user
export const getUserProjects = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find projects where user is the founder
    const projects = await Project.find({ founder: userId })
      .sort({ createdAt: -1 })
      .populate("founder", "name username profilePicture")
      .populate("teamMembers.userId", "name username profilePicture")
      .lean();
    
    res.status(200).json({ projects });
  } catch (error) {
    console.error("Error in getUserProjects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get a specific project by ID
export const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const project = await Project.findById(projectId)
      .populate("founder", "name username profilePicture headline")
      .populate("teamMembers.userId", "name username profilePicture headline")
      .populate("applications.userId", "name username profilePicture headline")
      .populate("upvotes", "name username")
      .populate("investors.userId", "name username profilePicture headline")
      .lean();
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    res.status(200).json({ project });
  } catch (error) {
    console.error("Error in getProjectById:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update a project
export const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const updates = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    // Find project
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user is the founder
    if (project.founder.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own projects" });
    }
    
    // Update allowed fields
    const allowedUpdates = [
      "name", "description", "category", "teamSize", 
      "website", "stage", "openRoles"
    ];
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        project[field] = updates[field];
      }
    });
    
    await project.save();
    
    res.status(200).json({ 
      message: "Project updated successfully",
      project
    });
  } catch (error) {
    console.error("Error in updateProject:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete a project
export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    // Find project
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user is the founder
    if (project.founder.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own projects" });
    }
    
    // Delete poster image from Cloudinary if exists
    if (project.posterId) {
      try {
        await cloudinary.uploader.destroy(project.posterId);
      } catch (cloudinaryError) {
        console.error("Error deleting project poster from Cloudinary:", cloudinaryError);
        // Continue with deletion even if cloudinary fails
      }
    }
    
    // Delete project
    await Project.findByIdAndDelete(projectId);
    
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error in deleteProject:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Upload project poster
export const uploadProjectPoster = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { poster } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    // Find project
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user is the founder
    if (project.founder.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own projects" });
    }
    
    if (!poster) {
      return res.status(400).json({ message: "Poster image is required" });
    }
    
    try {
      // Delete old poster if exists
      if (project.posterId) {
        try {
          await cloudinary.uploader.destroy(project.posterId);
        } catch (cloudinaryError) {
          console.error("Error deleting old project poster:", cloudinaryError);
          // Continue even if delete fails
        }
      }
      
      // Upload new poster to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(poster, {
        folder: "project_posters",
      });
      
      // Update project with new poster
      project.poster = uploadResult.secure_url;
      project.posterId = uploadResult.public_id;
      
      await project.save();
      
      res.status(200).json({
        message: "Project poster uploaded successfully",
        poster: project.poster
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary error:", cloudinaryError);
      return res.status(500).json({ message: "Error uploading image to cloud storage" });
    }
  } catch (error) {
    console.error("Error in uploadProjectPoster:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Upvote a project
export const upvoteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user has already upvoted
    const hasUpvoted = project.upvotes.includes(userId);
    
    if (hasUpvoted) {
      // Remove upvote
      project.upvotes = project.upvotes.filter(id => id.toString() !== userId.toString());
    } else {
      // Add upvote
      project.upvotes.push(userId);
    }
    
    // Update upvote count
    project.upvoteCount = project.upvotes.length;
    
    await project.save();
    
    res.status(200).json({
      message: hasUpvoted ? "Upvote removed" : "Project upvoted",
      upvoted: !hasUpvoted,
      upvoteCount: project.upvotes.length
    });
  } catch (error) {
    console.error("Error in upvoteProject:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Apply for a role in a project
export const applyForRole = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { roleTitle, message } = req.body;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    if (!roleTitle) {
      return res.status(400).json({ message: "Role title is required" });
    }
    
    // Check if user is a job seeker
    if (req.user.userRole !== "jobseeker") {
      return res.status(403).json({ message: "Only job seekers can apply for roles" });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if the role exists in openRoles
    const roleExists = project.openRoles.some(role => role.title === roleTitle);
    
    if (!roleExists) {
      return res.status(400).json({ message: "The specified role does not exist" });
    }
    
    // Check if user has already applied for a role in this project
    const alreadyApplied = project.applications.some(
      app => app.userId.toString() === userId.toString()
    );
    
    if (alreadyApplied) {
      return res.status(400).json({ message: "You have already applied for a role in this project" });
    }
    
    // Check if user is already in a team
    if (req.user.currentStartup && req.user.currentStartup.startupId) {
      return res.status(400).json({ message: "You are already part of another startup" });
    }
    
    // Add application
    project.applications.push({
      userId,
      roleTitle,
      message: message || "",
      status: "pending",
      appliedDate: new Date()
    });
    
    await project.save();
    
    res.status(200).json({
      message: "Application submitted successfully",
      application: {
        roleTitle,
        status: "pending",
        appliedDate: new Date()
      }
    });
  } catch (error) {
    console.error("Error in applyForRole:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Process role application (accept/reject)
export const processApplication = async (req, res) => {
  try {
    const { projectId, applicationId } = req.params;
    const { status } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    if (!status || !["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'accepted' or 'rejected'" });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user is the founder
    if (project.founder.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the project founder can process applications" });
    }
    
    // Find the application
    const applicationIndex = project.applications.findIndex(
      app => app._id.toString() === applicationId
    );
    
    if (applicationIndex === -1) {
      return res.status(404).json({ message: "Application not found" });
    }
    
    const application = project.applications[applicationIndex];
    
    // If accepting the application
    if (status === "accepted") {
      // Find the role in openRoles
      const roleIndex = project.openRoles.findIndex(role => role.title === application.roleTitle);
      
      if (roleIndex === -1) {
        return res.status(400).json({ message: "The role no longer exists" });
      }
      
      const role = project.openRoles[roleIndex];
      
      // Check if role is already filled
      if (role.filled >= role.limit) {
        return res.status(400).json({ message: "This role has already been filled" });
      }
      
      // Check if team size is reached
      if (project.teamMembers.length >= project.teamSize) {
        return res.status(400).json({ message: "Team size limit reached" });
      }
      
      // Add to team members
      project.teamMembers.push({
        userId: application.userId,
        role: application.roleTitle,
        joinDate: new Date()
      });
      
      // Increment filled count for the role
      project.openRoles[roleIndex].filled += 1;
      
      // Update user's currentStartup
      const user = await User.findById(application.userId);
      
      if (user) {
        user.currentStartup = {
          startupId: project._id,
          role: application.roleTitle,
          joinDate: new Date()
        };
        
        await user.save();
      }
    }
    
    // Update application status
    project.applications[applicationIndex].status = status;
    
    await project.save();
    
    res.status(200).json({
      message: `Application ${status}`,
      status
    });
  } catch (error) {
    console.error("Error in processApplication:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Leave a project (for team members)
export const leaveProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user is in the team
    const memberIndex = project.teamMembers.findIndex(
      member => member.userId.toString() === userId.toString()
    );
    
    if (memberIndex === -1) {
      return res.status(400).json({ message: "You are not a member of this project" });
    }
    
    // Founder cannot leave their own project
    if (project.founder.toString() === userId.toString()) {
      return res.status(400).json({ message: "Founders cannot leave their own projects" });
    }
    
    const memberRole = project.teamMembers[memberIndex].role;
    
    // Remove from team members
    project.teamMembers.splice(memberIndex, 1);
    
    // Decrement filled count for the role if it exists
    const roleIndex = project.openRoles.findIndex(role => role.title === memberRole);
    if (roleIndex !== -1) {
      project.openRoles[roleIndex].filled = Math.max(0, project.openRoles[roleIndex].filled - 1);
    }
    
    await project.save();
    
    // Update user's current startup
    const user = await User.findById(userId);
    
    if (user && user.currentStartup && user.currentStartup.startupId) {
      // Add to past startups
      user.pastStartups.push({
        startupId: project._id,
        role: user.currentStartup.role,
        joinDate: user.currentStartup.joinDate,
        exitDate: new Date()
      });
      
      // Clear current startup
      user.currentStartup = {
        startupId: null,
        role: "",
        joinDate: null
      };
      
      await user.save();
    }
    
    res.status(200).json({
      message: "You have left the project successfully"
    });
  } catch (error) {
    console.error("Error in leaveProject:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Remove team member (for founders)
export const removeTeamMember = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user is the founder
    if (project.founder.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the project founder can remove team members" });
    }
    
    // Cannot remove yourself (the founder)
    if (memberId === req.user._id.toString()) {
      return res.status(400).json({ message: "Founders cannot remove themselves" });
    }
    
    // Find the team member
    const memberIndex = project.teamMembers.findIndex(
      member => member.userId.toString() === memberId
    );
    
    if (memberIndex === -1) {
      return res.status(404).json({ message: "Team member not found" });
    }
    
    const memberRole = project.teamMembers[memberIndex].role;
    
    // Remove from team members
    project.teamMembers.splice(memberIndex, 1);
    
    // Decrement filled count for the role if it exists
    const roleIndex = project.openRoles.findIndex(role => role.title === memberRole);
    if (roleIndex !== -1) {
      project.openRoles[roleIndex].filled = Math.max(0, project.openRoles[roleIndex].filled - 1);
    }
    
    await project.save();
    
    // Update user's current startup
    const user = await User.findById(memberId);
    
    if (user && user.currentStartup && user.currentStartup.startupId) {
      // Add to past startups
      user.pastStartups.push({
        startupId: project._id,
        role: user.currentStartup.role,
        joinDate: user.currentStartup.joinDate,
        exitDate: new Date()
      });
      
      // Clear current startup
      user.currentStartup = {
        startupId: null,
        role: "",
        joinDate: null
      };
      
      await user.save();
    }
    
    res.status(200).json({
      message: "Team member removed successfully"
    });
  } catch (error) {
    console.error("Error in removeTeamMember:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get project comments
export const getProjectComments = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Fetch comments for this project
    const comments = await Comment.find({ project: projectId })
      .populate("user", "name username profilePicture")
      .sort({ createdAt: -1 });
    
    res.status(200).json({ comments });
  } catch (error) {
    console.error("Error in getProjectComments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add a comment to a project
export const addProjectComment = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }
    
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    const comment = new Comment({
      text,
      user: userId,
      project: projectId
    });
    
    await comment.save();
    
    // Populate user info before returning
    await comment.populate("user", "name username profilePicture");
    
    // Create notification for project founder if commenter is not the founder
    if (project.founder.toString() !== userId.toString()) {
      const notification = new Notification({
        recipient: project.founder,
        sender: userId,
        type: "project_comment",
        project: projectId,
        comment: comment._id,
        read: false
      });
      
      await notification.save();
    }
    
    res.status(201).json({ message: "Comment added successfully", comment });
  } catch (error) {
    console.error("Error in addProjectComment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}; 