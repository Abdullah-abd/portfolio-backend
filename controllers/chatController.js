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

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export const chatController = async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({
      status: "error",
      message: "⚠️ No message provided",
    });
  }

  // 🔹 1. QUERY CLASSIFIER
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

  // 🔹 2. CONTEXT BUILDER
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

  if (!context) {
    return res.json({
      status: "success",
      message: "Sorry, I didn’t understand. Please rephrase.",
      data: {},
    });
  }

  // 🔹 3. PROMPT
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

  // 🔹 SAFE PARSER
  const safeParseJSON = (text) => {
    if (!text) throw new Error("Empty AI response");

    let cleaned = text.trim();
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, "");
    cleaned = cleaned.replace(/```json|```/g, "").trim();

    return JSON.parse(cleaned);
  };

  // 🔥 MODELS (stable first)
  const MODELS = [
    "openai/gpt-4o-mini",
    "mistralai/Mistral-7B-Instruct-v0.2",
    "meta/Llama-4-Scout-17B-16E-Instruct",
  ];

  let lastError = null;

  // 🔥 4. MULTI-MODEL FALLBACK LOOP
  for (let model of MODELS) {
    try {
      console.log("⚡ Trying model:", model);

      await sleep(300); // avoid rate limit

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
            model: model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 700,
            temperature: 0.5,
          }),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content;

      if (!reply) {
        throw new Error("Empty reply");
      }

      const parsed = safeParseJSON(reply);

      // ✅ SUCCESS → return immediately
      return res.json({
        status: "success",
        question: message,
        message: parsed.message,
        data: parsed.data,
        metadata: {
          provider: model,
          timestamp: new Date().toISOString(),
          version: "4.0.0",
          queryType,
        },
      });
    } catch (err) {
      console.warn(`❌ Model failed: ${model}`, err.message);

      lastError = err;

      // 🚫 rate limit skip fast
      if (err.message.includes("Too many requests")) {
        continue;
      }

      // 🚫 JSON parse fail bhi skip
      if (err.message.includes("Unexpected token")) {
        continue;
      }

      continue;
    }
  }

  // 🔥 5. FINAL FALLBACK (VERY IMPORTANT)
  return res.json({
    status: "success",
    question: message,
    message:
      "I'm Abdullah. AI services are busy right now, but here’s a quick response based on my profile.",
    data: {
      profile: {},
      projects: [],
      education: [],
      experience: [],
      skills: [],
      certificates: [],
      testimonials: [],
      hobbies: [],
      general: baseContext.slice(0, 300),
    },
    metadata: {
      provider: "fallback",
      timestamp: new Date().toISOString(),
      version: "4.0.0",
      queryType,
      error: lastError?.message || "All models failed",
    },
  });
};
