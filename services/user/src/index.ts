import express from "express";
import dotenv from "dotenv";
dotenv.config();
const app = express();

app.listen(process.env.PORT || 8000, () => {
  console.log(`User Service is running on http://localhost:${process.env.PORT}`);
});
