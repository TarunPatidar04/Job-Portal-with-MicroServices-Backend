import express, { Router } from "express";
import { isAuth } from "../middleware/auth.js";
import {
  addSkillToUser,
  deleteSkillFromUser,
  getUserProfile,
  myProfile,
  updatedProfilePic,
  updatedResume,
  updatedUserProfile,
} from "../controllers/user.controllers.js";
import uploadFile from "../middleware/multer.js";

const router = Router();

router.get("/me", isAuth, myProfile);
router.get("/:userId", isAuth, getUserProfile);
router.put("/update/profile", isAuth, updatedUserProfile);
router.put("/update/pic", isAuth, uploadFile, updatedProfilePic);
router.put("/update/resume", isAuth, uploadFile, updatedResume);
router.post("/skill/add", isAuth, addSkillToUser);
router.delete("/skill/delete", isAuth, deleteSkillFromUser);

export default router;
