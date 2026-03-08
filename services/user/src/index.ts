import express from "express";
import dotenv from "dotenv";
import userRouter from "./routes/user.route.js";
dotenv.config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/user", userRouter);

app.listen(process.env.PORT || 8000, () => {
  console.log(`User Service is running on http://localhost:${process.env.PORT}`);
});
