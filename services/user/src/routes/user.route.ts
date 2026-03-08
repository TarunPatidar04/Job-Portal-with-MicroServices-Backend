import express, { Router } from "express";
import { isAuth } from "../middleware/auth.js";
import { getUserProfile, myProfile } from "../controllers/user.controllers.js";

const router = Router();

router.get("/me", isAuth, myProfile);
router.get("/:userId", isAuth, getUserProfile);
export default router;
