import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
	createPost,
	getFeedPosts,
	deletePost,
	getPostById,
	createComment,
	likePost,
	getPostsByUser,
	deleteComment,
	editComment,
	likeComment,
	dislikeComment,
} from "../controllers/post.controller.js";

const router = express.Router();

router.get("/", protectRoute, getFeedPosts);
router.post("/create", protectRoute, createPost);
router.get("/user/:userId", protectRoute, getPostsByUser);
router.delete("/delete/:id", protectRoute, deletePost);
router.get("/:id", protectRoute, getPostById);
router.post("/:id/comment", protectRoute, createComment);
router.post("/:id/like", protectRoute, likePost);
router.delete("/:postId/comment/:commentId", protectRoute, deleteComment);
router.put("/:postId/comment/:commentId", protectRoute, editComment);
router.post("/:postId/comment/:commentId/like", protectRoute, likeComment);
router.post("/:postId/comment/:commentId/dislike", protectRoute, dislikeComment);

export default router;
