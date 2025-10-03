import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { chatController } from "./controllers/chatController.js";
dotenv.config();

const app = express();

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
const PORT = process.env.PORT || 5000;

// Use 0.0.0.0 instead of localhost
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
