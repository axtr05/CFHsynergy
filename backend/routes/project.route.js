import express from "express";
import { 
  createProject,
  getProjects,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
  uploadProjectPoster,
  upvoteProject,
  applyForRole,
  processApplication,
  leaveProject,
  removeTeamMember,
  getProjectComments,
  addProjectComment
} from "../controllers/project.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getProjects);
router.get("/:projectId", getProjectById);
router.get("/user/:userId", getUserProjects);
router.get("/:projectId/comments", getProjectComments);

// Protected routes
router.post("/", protectRoute, createProject);
router.put("/:projectId", protectRoute, updateProject);
router.delete("/:projectId", protectRoute, deleteProject);
router.post("/:projectId/poster", protectRoute, uploadProjectPoster);
router.post("/:projectId/upvote", protectRoute, upvoteProject);
router.post("/:projectId/apply", protectRoute, applyForRole);
router.put("/:projectId/applications/:applicationId", protectRoute, processApplication);
router.post("/:projectId/leave", protectRoute, leaveProject);
router.delete("/:projectId/members/:memberId", protectRoute, removeTeamMember);
router.post("/:projectId/comments", protectRoute, addProjectComment);

export default router; 