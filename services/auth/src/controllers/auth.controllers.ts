import { sql } from "../utils/db.js";
import ErrorHandler from "../utils/errorHandler.js";
import { TryCatch } from "../utils/TryCatch.js";
import bcrypt from "bcrypt";

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
    const [user] =
      await sql`INSERT INTO users (name,email,password,phone_number,role) VALUES
      (${name} ,${email},${hashPassword},${phoneNumber},${role} )
      RETURNING user_id ,name,email,phone_number,role,created_at`;

    registerUser = user;
  }
  res.json(registerUser);
});
