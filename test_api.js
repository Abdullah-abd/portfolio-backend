import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("API key not found in .env file.");
  process.exit(1);
}

async function listModels() {
  try {
    // Correct way to initialize with an object
    const genAI = new GoogleGenerativeAI({ apiKey: API_KEY });

    // Correct way to list models
    const models = await genAI.models.list();

    console.log("Successfully connected to the API!");
    console.log("Available models:");
    for (const model of models) {
      console.log(`- ${model.name}`);
    }
  } catch (err) {
    console.error("❌ Error connecting to API:", err.message);
    console.error("Full error details:", err);
  }
}

listModels();
