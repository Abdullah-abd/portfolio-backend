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
If you can't understand the user's query, politely ask them to rephrase or share contact details (LinkedIn/GitHub).
You must always respond in **valid JSON only** in the following format:

{
  "message": "<human-friendly summary>",
  "data": {
    "profile": { "name": "", "email": "", "phone": "", "location": "", "github": "", "linkedin": "", "website": "", "summary": "" },
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

Only fill fields relevant to the user’s question (e.g. if about projects, fill 'projects' + 'message', others empty).
Do NOT use markdown or backticks in the output. Respond only in plain JSON.

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

  // --- Helper: Clean & Parse JSON Safely ---
  const safeParseJSON = (text) => {
    if (!text) throw new Error("Empty AI response");

    let cleaned = text.trim();

    // Remove <think>...</think> tags (used by some models)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    // Remove ```json and ``` fences if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```/, "");
      cleaned = cleaned.replace(/```$/, "").trim();
    }

    // Attempt to parse JSON
    try {
      return JSON.parse(cleaned);
    } catch (err) {
      console.error("⚠️ Failed to parse AI JSON. Raw text:\n", cleaned);
      throw new Error("AI did not return valid JSON");
    }
  };

  try {
    // --- Primary: GitHub Models API ---
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
      }
    );

    const ghResult = await ghResponse.json();

    if (ghResult.error) {
      throw new Error(ghResult.error.message || "GitHub returned an error");
    }

    if (ghResult.choices && ghResult.choices.length > 0) {
      const reply = ghResult.choices[0].message.content;
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
          version: "1.0.0",
        },
      });
    }

    throw new Error("No response from GitHub model, trying fallback...");
  } catch (err) {
    console.warn("⚠️ GitHub failed, trying OpenRouter:", err.message);

    // --- Fallback: OpenRouter API with 3 free models ---
    const fallbackModels = [
      "mistralai/mistral-small-3.1-24b-instruct:free",
      "alibaba/tongyi-deepresearch-30b-a3b:free",
      "meituan/longcat-flash-chat:free",
    ];

    for (const model of fallbackModels) {
      try {
        console.log(`🚀 Trying OpenRouter fallback model: ${model}`);

        const orResponse = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
            }),
          }
        );

        const orResult = await orResponse.json();
        console.log(`🔍 [${model}] OpenRouter raw response:`, orResult);

        if (orResult.error) {
          throw new Error(
            orResult.error.message || "OpenRouter returned an error"
          );
        }

        if (orResult.choices && orResult.choices.length > 0) {
          const reply = orResult.choices[0].message.content;
          const parsed = safeParseJSON(reply);

          return res.json({
            status: "success",
            question: message,
            response_type: "chat",
            message: parsed.message,
            data: parsed.data,
            metadata: {
              provider: `OpenRouter (${model})`,
              timestamp: new Date().toISOString(),
              version: "1.0.0",
            },
          });
        }

        throw new Error(`No response from OpenRouter model: ${model}`);
      } catch (mErr) {
        console.warn(`⚠️ ${model} failed:`, mErr.message);
      }
    }

    // --- If all fallbacks failed ---
    console.error("❌ All OpenRouter fallback models failed");
    return res.status(500).json({
      status: "error",
      message: "⚠️ All APIs failed (GitHub + OpenRouter fallbacks)",
      details: err.message,
    });
  }
};
