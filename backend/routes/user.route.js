import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getSuggestedConnections, getPublicProfile, updateProfile, deleteUser, searchUsers, toggleVerification, getAllPotentialConnections, syncConnections } from "../controllers/user.controller.js";

const router = express.Router();

router.get("/suggestions", protectRoute, getSuggestedConnections);
router.get("/all-connections", protectRoute, getAllPotentialConnections);
router.get("/search", protectRoute, searchUsers);
router.get("/:username", protectRoute, getPublicProfile);

router.put("/profile", protectRoute, updateProfile);
router.delete("/:username", protectRoute, deleteUser);
router.patch("/verify/:userId", protectRoute, toggleVerification);
router.post("/sync-connections", protectRoute, syncConnections);

export default router;
