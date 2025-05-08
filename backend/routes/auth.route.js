import express from "express";
import { login, logout, signup, getCurrentUser, updateUserOnboarding, updateUserRole } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.get("/me", protectRoute, getCurrentUser);
router.post("/onboarding", protectRoute, updateUserOnboarding);
router.post("/update-role", protectRoute, updateUserRole);

export default router;
