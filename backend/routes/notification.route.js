import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
	deleteNotification,
	getUserNotifications,
	markNotificationAsRead,
	markAllNotificationsAsRead,
	resetNotifications
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protectRoute, getUserNotifications);

router.put("/:id/read", protectRoute, markNotificationAsRead);
router.put("/read-all", protectRoute, markAllNotificationsAsRead);
router.delete("/:id", protectRoute, deleteNotification);
router.post("/reset", protectRoute, resetNotifications);

export default router;
