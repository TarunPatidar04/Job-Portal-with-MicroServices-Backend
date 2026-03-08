import express, { Router } from "express";
import { isAuth } from "../middleware/auth.js";
import { myProfile } from "../controllers/user.controllers.js";

const router = Router();

router.get("/me", isAuth, myProfile);

export default router;
