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
    
    // Find projects where user is the founder or a team member
    const projects = await Project.find({
      $or: [
        { founder: userId },
        { "teamMembers.userId": userId }
      ]
    })
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
    const role = project.openRoles.find(role => role.title === roleTitle);
    
    if (!role) {
      return res.status(400).json({ message: "The specified role does not exist" });
    }
    
    // Check if the role is already filled
    if (role.filled >= role.limit) {
      return res.status(400).json({ message: "This role has already been filled" });
    }
    
    // Check if user is already a member of this specific project's team
    const isCurrentTeamMember = project.teamMembers.some(
      member => member.userId.toString() === userId.toString()
    );
    
    if (isCurrentTeamMember) {
      return res.status(400).json({ message: "You are already a member of this project's team" });
    }
    
    // Check if user has already applied for this specific role in this project
    const existingApplication = project.applications.find(
      app => app.userId.toString() === userId.toString() && app.roleTitle === roleTitle
    );
    
    if (existingApplication) {
      if (existingApplication.status === "pending") {
        return res.status(400).json({ message: "You have already applied for this role" });
      } else if (existingApplication.status === "cancelled") {
        // Allow re-application if previous application was cancelled
        existingApplication.status = "pending";
        existingApplication.message = message || "";
        existingApplication.appliedDate = new Date();
        
        await project.save();
        
        return res.status(200).json({
          message: "Application resubmitted successfully",
          application: {
            roleTitle,
            status: "pending",
            appliedDate: new Date()
          }
        });
      }
      // For rejected applications, we'll allow reapplying by creating a new application below
    }
    
    // Check if user is already in a team for a different project
    if (req.user.currentStartup && req.user.currentStartup.startupId && 
        req.user.currentStartup.startupId.toString() !== projectId) {
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
        // Update the user's status
        user.currentStartup = {
          startupId: project._id,
          role: application.roleTitle,
          joinDate: new Date()
        };
        
        await user.save();
        
        // Cancel pending applications in all projects
        const userProjects = await Project.find({
          'applications.userId': application.userId,
          'applications.status': 'pending'
        });
        
        // Update status of all pending applications to "cancelled"
        for (const userProject of userProjects) {
          // For the current project, cancel pending applications for other roles
          if (userProject._id.toString() === projectId) {
            userProject.applications.forEach(app => {
              if (app.userId.toString() === application.userId.toString() && 
                  app.status === 'pending' && 
                  app._id.toString() !== applicationId) {
                app.status = 'cancelled';
                
                // Send notification about cancelled application
                try {
                  const notification = new Notification({
                    recipient: app.userId,
                    sender: req.user._id,
                    type: 'application_cancelled',
                    content: `Your application for the ${app.roleTitle} role in "${userProject.name}" was cancelled because you were accepted for another role.`,
                    project: userProject._id
                  });
                  notification.save();
                } catch (err) {
                  console.error("Error creating notification:", err);
                }
              }
            });
          } else {
            // For other projects, cancel all pending applications  
            userProject.applications.forEach(app => {
              if (app.userId.toString() === application.userId.toString() && app.status === 'pending') {
                app.status = 'cancelled';
                
                // Send notification about cancelled application
                try {
                  const notification = new Notification({
                    recipient: app.userId,
                    sender: req.user._id,
                    type: 'application_cancelled',
                    content: `Your application for the ${app.roleTitle} role in "${userProject.name}" was cancelled because you were accepted for another role.`,
                    project: userProject._id
                  });
                  notification.save();
                } catch (err) {
                  console.error("Error creating notification:", err);
                }
              }
            });
          }
          await userProject.save();
        }
      }
      
      // If the role is now filled, reject all other pending applications for this role
      if (role.filled >= role.limit) {
        // Reject all other pending applications for this role
        project.applications.forEach(app => {
          if (app.roleTitle === application.roleTitle && 
              app.status === 'pending' && 
              app._id.toString() !== applicationId) {
            app.status = 'rejected';
            
            // Send notification to the rejected user
            try {
              const notification = new Notification({
                recipient: app.userId,
                sender: req.user._id,
                type: 'application_rejected_auto',
                content: `Your application for the ${app.roleTitle} role in "${project.name}" was automatically rejected because the position has been filled.`,
                project: project._id
              });
              notification.save();
            } catch (err) {
              console.error("Error creating notification:", err);
            }
          }
        });
      }
    }
    
    // Update application status
    project.applications[applicationIndex].status = status;
    
    await project.save();

    // If application is accepted, create notification
    if (status === 'accepted') {
      try {
        const notification = new Notification({
          recipient: application.userId,
          sender: req.user._id,
          type: 'application_accepted',
          content: `Your application for the ${application.roleTitle} role in "${project.name}" has been accepted!`,
          project: project._id
        });
        await notification.save();
      } catch (err) {
        console.error("Error creating notification:", err);
      }
    } else if (status === 'rejected') {
      try {
        const notification = new Notification({
          recipient: application.userId,
          sender: req.user._id,
          type: 'application_rejected',
          content: `Your application for the ${application.roleTitle} role in "${project.name}" has been rejected.`,
          project: project._id
        });
        await notification.save();
      } catch (err) {
        console.error("Error creating notification:", err);
      }
    }
    
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
    const joinDate = project.teamMembers[memberIndex].joinDate;
    
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
    
    if (user) {
      // Only update if their current startup is this project
      if (user.currentStartup && 
          user.currentStartup.startupId && 
          user.currentStartup.startupId.toString() === projectId) {
        
        // Add to past startups
        user.pastStartups.push({
          startupId: project._id,
          role: user.currentStartup.role || memberRole,
          joinDate: user.currentStartup.joinDate || joinDate,
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
      
      // Notify the project founder
      try {
        const notification = new Notification({
          recipient: project.founder,
          sender: userId,
          type: "team_member_left",
          project: project._id,
          content: `A team member has left your project "${project.name}"`,
        });
        
        await notification.save();
      } catch (err) {
        console.error("Error creating notification for project founder:", err);
      }
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
    const joinDate = project.teamMembers[memberIndex].joinDate;
    
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
    
    if (user) {
      // Only update if their current startup is this project
      if (user.currentStartup && 
          user.currentStartup.startupId && 
          user.currentStartup.startupId.toString() === projectId) {
        
        // Add to past startups
        user.pastStartups.push({
          startupId: project._id,
          role: user.currentStartup.role || memberRole,
          joinDate: user.currentStartup.joinDate || joinDate,
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
      
      // Create notification for the removed user
      try {
        const notification = new Notification({
          recipient: memberId,
          sender: req.user._id,
          type: "connection_removed", // You might want to create a specific notification type for this
          content: `You have been removed from the project "${project.name}"`,
          project: project._id
        });
        
        await notification.save();
      } catch (err) {
        console.error("Error creating notification for removed team member:", err);
      }
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