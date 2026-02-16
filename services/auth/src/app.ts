import express from "express";
import authRouter from "./routes/auth.route.js";
import { connectKafka } from "./producer.js";

const app = express();
app.use(express.json());

connectKafka()

app.use("/api/auth", authRouter);

export default app;
