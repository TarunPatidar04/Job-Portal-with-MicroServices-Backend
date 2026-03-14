import express from "express";
import { v2 as cloudinary } from "cloudinary";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Utils Service");
});

router.post("/upload", async (req, res) => {
  try {
    const { buffer, public_id } = req.body;
    if (public_id) {
      await cloudinary.uploader.destroy(public_id);
    }

    const cloud = await cloudinary.uploader.upload(buffer);
    return res.status(200).json({
      message: "Image uploaded successfully",
      url: cloud.secure_url,
      public_id: cloud.public_id,
    });
  } catch (error: any) {
    console.log(error);
    return res
      .status(500)
      .json({ message: error.message || "Internal server error" });
  }
});
export default router;
