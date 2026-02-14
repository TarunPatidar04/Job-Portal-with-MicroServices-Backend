import axios from "axios";
import getBuffer from "../utils/buffer.js";
import { sql } from "../utils/db.js";
import ErrorHandler from "../utils/errorHandler.js";
import { TryCatch } from "../utils/TryCatch.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const registerUser = TryCatch(async (req, res, next) => {
  const { name, email, password, phoneNumber, role, bio } = req.body;

  if (!name || !email || !phoneNumber || !role) {
    throw new ErrorHandler(400, "Please fill all details");
  }

  const existingUser =
    await sql`SELECT user_id FROM users WHERE email=${email}`;

  if (existingUser.length > 0) {
    throw new ErrorHandler(409, "User with this email already exits");
  }

  const hashPassword = await bcrypt.hash(password, 10);

  let registerUser;

  if (role === "recruiter") {
    const [user] =
      await sql`INSERT INTO users (name,email,password,phone_number,role) VALUES
      (${name} ,${email},${hashPassword},${phoneNumber},${role} )
      RETURNING user_id ,name,email,phone_number,role,created_at`;

    registerUser = user;
  } else if (role === "jobseeker") {
    const file = req.file;

    if (!file) {
      throw new ErrorHandler(400, "Please upload your resume for jobseeker");
    }

    const fileBuffer = getBuffer(file);

    if (!fileBuffer || !fileBuffer.content) {
      throw new ErrorHandler(500, "Failed to ganerate buffer from file");
    }

    const { data } = await axios.post(
      `${process.env.UPLOAD_SERVICE}/api/utils/upload`,
      {
        buffer: fileBuffer.content,
      },
    );

    const [user] =
      await sql`INSERT INTO users (name,email,password,phone_number,role,bio,resume,resume_public_id) VALUES
      (${name} ,${email},${hashPassword},${phoneNumber},${role},${bio},${data.url},${data.public_id} )
      RETURNING user_id ,name,email,phone_number,role,bio,resume,created_at`;

    registerUser = user;
  }

  const token = jwt.sign(
    { id: registerUser?.user_id },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "15d",
    },
  );

  res.json({
    success: true,
    message: "User registered successfully",
    user: registerUser,
    token,
  });
});
