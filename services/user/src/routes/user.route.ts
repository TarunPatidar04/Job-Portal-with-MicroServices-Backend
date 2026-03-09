import express, { Router } from "express";
import { isAuth } from "../middleware/auth.js";
import {
  getUserProfile,
  myProfile,
  updatedProfilePic,
  updatedUserProfile,
} from "../controllers/user.controllers.js";
import uploadFile from "../middleware/multer.js";

const router = Router();

router.get("/me", isAuth, myProfile);
router.get("/:userId", isAuth, getUserProfile);
router.put("/update/profile", isAuth, updatedUserProfile);
router.put("/update/pic", isAuth,uploadFile, updatedProfilePic);

export default router;
