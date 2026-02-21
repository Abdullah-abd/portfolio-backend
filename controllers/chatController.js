import dotenv from "dotenv";
import fetch from "node-fetch";
import {
  baseContext,
  educationContext,
  experienceContext,
  generalContext,
  hobbiesContext,
  projectsContext,
  skillsContext,
} from "../data/profileData.js";

dotenv.config();

export const chatController = async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({
      status: "error",
      message: "⚠️ No message provided",
    });
  }

  // 1. QUERY CLASSIFIER
  const classifyQuery = (msg) => {
    const text = msg.toLowerCase();

    if (!text || text.trim().length < 2) return "invalid";

    if (text.includes("project")) return "projects";
    if (text.includes("skill") || text.includes("tech")) return "skills";
    if (text.includes("experience") || text.includes("work"))
      return "experience";
    if (text.includes("education") || text.includes("study"))
      return "education";
    if (text.includes("hobby") || text.includes("interest")) return "hobbies";

    if (["hi", "hello", "hey"].includes(text)) return "greeting";

    return "general";
  };

  // 2. CONTEXT BUILDER
  const buildContext = (type) => {
    let context = baseContext;

    switch (type) {
      case "projects":
        context += projectsContext;
        break;
      case "skills":
        context += skillsContext;
        break;
      case "experience":
        context += experienceContext;
        break;
      case "education":
        context += educationContext;
        break;
      case "hobbies":
        context += hobbiesContext;
        break;
      case "general":
        context += generalContext;
        break;
      case "greeting":
        break;
      case "invalid":
        return null;
    }

    return context;
  };

  const queryType = classifyQuery(message);
  const context = buildContext(queryType);

  // invalid case
  if (!context) {
    return res.json({
      status: "success",
      message: "Sorry, I didn’t understand. Please rephrase.",
      data: {},
    });
  }

  // 3. FINAL PROMPT
  const prompt = `
You are Abdullah's personal AI assistant. Speak as Abdullah — professional, confident, and friendly.

STRICT RULES:
- Return ONLY valid JSON
- No markdown, no extra text
- Always valid JSON
- No trailing commas

RESPONSE FORMAT:
{
  "message": "short human-like summary",
  "data": {
    "profile": {},
    "projects": [],
    "education": [],
    "experience": [],
    "skills": [],
    "certificates": [],
    "testimonials": [],
    "hobbies": [],
    "general": ""
  }
}

INSTRUCTIONS:
- Answer ONLY what user asked
- Fill ONLY relevant fields
- Keep others empty
- Use first-person tone

CONTEXT:
${context}

USER QUESTION:
${message}
`;

  // SAFE PARSER
  const safeParseJSON = (text) => {
    if (!text) throw new Error("Empty AI response");

    let cleaned = text.trim();

    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, "");
    cleaned = cleaned.replace(/```json|```/g, "").trim();

    return JSON.parse(cleaned);
  };
  const MODELS = [
    "deepseek/DeepSeek-V3-0324",
    "openai/gpt-4o-mini",
    "mistralai/Mistral-7B-Instruct-v0.2",
  ];
  try {
    const response = await fetch(
      "https://models.github.ai/inference/chat/completions",
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          MODELS,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
          temperature: 0.5,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Model ${model} failed: ${text}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error(`Model ${model} returned empty response`);
    }

    const parsed = safeParseJSON(reply);

    return res.json({
      status: "success",
      question: message,
      message: parsed.message,
      data: parsed.data,
      metadata: {
        provider: "GitHub Models",
        timestamp: new Date().toISOString(),
        version: "3.0.0",
        queryType,
      },
    });
  } catch (err) {
    console.error("❌ Chat Error:", err.message);

    return res.status(500).json({
      status: "error",
      message: "AI service temporarily unavailable",
      details: err.message,
    });
  }
};
