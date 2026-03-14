import express from "express";
import {
  createCompany,
  createJob,
  deleteCompany,
  getAllActiveJobs,
  getAllApplicationForJob,
  getAllCompany,
  getCompanyDetails,
  getSingleJob,
  updateJob,
} from "../controllers/job.controllers.js";
import { isAuth } from "../middleware/auth.js";
import uploadFile from "../middleware/multer.js";
const router = express.Router();

router.post("/company/new", isAuth, uploadFile, createCompany);
router.delete("/company/:companyId", isAuth, deleteCompany);
router.post("/new", isAuth, createJob);
router.put("/:jobId", isAuth, updateJob);
router.get("/company/all", isAuth, getAllCompany);
router.get("/company/:companyId", isAuth, getCompanyDetails);
router.get("/all", getAllActiveJobs);
router.get("/:jobId", getSingleJob);
router.get("/application/:jobId", isAuth, getAllApplicationForJob);
export default router;
