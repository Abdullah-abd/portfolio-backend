import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { chatController } from "./controllers/chatController.js";
dotenv.config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
// console.log("Gemini Key:", process.env.GEMINI_API_KEY);
// Root route
app.get("/", (req, res) => {
  res.send("✅ Portfolio Chat Backend is running...");
});

// Chat route (using controller)
app.post("/chat", chatController);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
