import axios from "axios";
import getBuffer from "../utils/buffer.js";
import { sql } from "../utils/db.js";
import ErrorHandler from "../utils/errorHandler.js";
import { TryCatch } from "../utils/TryCatch.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { forgotPasswordTemplate } from "../template.js";
import { publicToTopic } from "../producer.js";
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

export const loginUser = TryCatch(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ErrorHandler(400, "Please fill all details");
  }

  const user =
    await sql`SELECT u.user_id ,u.name ,u.email ,u.password ,u.phone_number,
    u.role ,u.bio ,u.resume ,u.profile_pic,u.subscription,ARRAY_AGG(s.name)
     FILTER (WHERE s.name IS NOT NULL) as skills FROM users u LEFT JOIN user_skills us
      ON u.user_id = us.user_id LEFT JOIN skills s ON us.skill_id = s.skill_id WHERE u.email=${email}
      GROUP BY u.user_id;`;

  if (user.length === 0) {
    throw new ErrorHandler(404, "User not found");
  }

  const userObject = user[0];
  const isPasswordMatched = await bcrypt.compare(password, userObject.password);

  if (!isPasswordMatched) {
    throw new ErrorHandler(401, "Invalid credentials");
  }

  userObject.skills = userObject.skills || [];

  delete userObject.password;

  const token = jwt.sign(
    { id: userObject.user_id },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "15d",
    },
  );

  res.json({
    success: true,
    message: "User logged in successfully",
    user: userObject,
    token,
  });
});

export const forgotPassword = TryCatch(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw new ErrorHandler(400, "Email is required");
  }

  const user = await sql`SELECT user_id,email FROM users WHERE email=${email}`;

  if (user.length === 0) {
    throw new ErrorHandler(404, "User not found");
  }
  const userObject = user[0];

  const resetToken = jwt.sign(
    { email: userObject.email, type: "reset" },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "15m",
    },
  );

  const resetLink = `${process.env.FRONTEND_URL}/reset/${resetToken}`;
  const message = {
    to: email,
    subject: "Reset Password",
    html: forgotPasswordTemplate(resetLink),
  };

  publicToTopic("send-mail", message);
  res.json({
    success: true,
    message: "Reset password link sent successfully",
    // user: user[0],
    // token: resetLink,
  });
});
