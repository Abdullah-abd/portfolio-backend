import dotenv from "dotenv";
import fetch from "node-fetch"; // only if Node < 18
import { profileData } from "../data/profileData.js";

dotenv.config();

export const chatController = async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({
      status: "error",
      message: "⚠️ No message provided",
    });
  }

  // --- Build dynamic prompt ---
  const prompt = `
You are Abdullah's personal AI assistant. Speak as Abdullah — professional yet friendly.
Always answer based on Abdullah's profile below.
You must ALWAYS respond in valid JSON only.

Format:
{
  "message": "<summary>",
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

Profile data:
- Contact: ${JSON.stringify(profileData.profile)}
- About: ${profileData.about}
- Skills: ${JSON.stringify(profileData.skills)}
- Projects: ${JSON.stringify(profileData.projects)}
- Experience: ${JSON.stringify(profileData.experience)}
- Education: ${JSON.stringify(profileData.education)}
- Certificates: ${JSON.stringify(profileData.certificates)}
- Testimonials: ${JSON.stringify(profileData.testimonials)}
- Hobbies: ${JSON.stringify(profileData.hobbies)}
- General: ${profileData.general}

User question: ${message}
`;

  // --- Safe JSON Parser ---
  const safeParseJSON = (text) => {
    if (!text) throw new Error("Empty AI response");

    let cleaned = text.trim();

    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, "");
    cleaned = cleaned.replace(/```json|```/g, "").trim();

    return JSON.parse(cleaned);
  };

  try {
    // --- GitHub Models API ---
    const ghResponse = await fetch(
      "https://models.github.ai/inference/chat/completions",
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek/DeepSeek-V3-0324",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      },
    );

    // ✅ CRITICAL FIX: Check status first
    if (!ghResponse.ok) {
      const text = await ghResponse.text();
      console.error("GitHub API Error:", text);
      throw new Error(`GitHub API failed: ${text}`);
    }

    const ghResult = await ghResponse.json();

    // ✅ Safe access
    const reply = ghResult?.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error("No content from GitHub model");
    }

    const parsed = safeParseJSON(reply);

    return res.json({
      status: "success",
      question: message,
      response_type: "chat",
      message: parsed.message,
      data: parsed.data,
      metadata: {
        provider: "GitHub Models",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
      },
    });
  } catch (err) {
    console.error("❌ GitHub Chat Error:", err.message);

    return res.status(500).json({
      status: "error",
      message: "AI service temporarily unavailable",
      details: err.message,
    });
  }
};
