import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import sessionRoutes from "./routes/session";
import dialogueRoutes from "./routes/dialogue";
import playerRoutes from "./routes/player";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/session", sessionRoutes);
app.use("/api/dialogue", dialogueRoutes);
app.use("/api/player", playerRoutes);

app.listen(PORT, () => {
  console.log(`Cyberverse backend (Firebase) running on http://localhost:${PORT}`);
});
