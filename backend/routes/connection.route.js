import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
	acceptConnectionRequest,
	getConnectionRequests,
	getConnectionStatus,
	getUserConnections,
	getUserConnectionsByUsername,
	getMutualConnections,
	rejectConnectionRequest,
	removeConnection,
	sendConnectionRequest,
	withdrawConnectionRequest,
} from "../controllers/connection.controller.js";

const router = express.Router();

router.post("/request/:userId", protectRoute, sendConnectionRequest);
router.delete("/request/:userId", protectRoute, withdrawConnectionRequest);
router.put("/accept/:requestId", protectRoute, acceptConnectionRequest);
router.put("/reject/:requestId", protectRoute, rejectConnectionRequest);
// Get all connection requests for the current user
router.get("/requests", protectRoute, getConnectionRequests);
// Get all connections for a user
router.get("/", protectRoute, getUserConnections);
// Get all connections for a user by username
router.get("/user/:username", protectRoute, getUserConnectionsByUsername);
// Get mutual connections between current user and another user
router.get("/mutual/:userId", protectRoute, getMutualConnections);
router.delete("/:userId", protectRoute, removeConnection);
router.get("/status/:userId", protectRoute, getConnectionStatus);

export default router;
