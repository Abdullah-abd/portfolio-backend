// import dotenv from "dotenv";
// import fetch from "node-fetch"; // only if Node < 18
// import { profileData } from "../data/profileData.js";

// dotenv.config();

// export const chatController = async (req, res) => {
//   const { message } = req.body;

//   if (!message || message.trim() === "") {
//     return res.status(400).json({
//       status: "error",
//       message: "⚠️ No message provided",
//     });
//   }

//   // Build prompt with your RAG data
//   const prompt = `
// You are Abdullah's personal AI assistant. Speak as Abdullah, professional yet friendly, don't add too many special chars in response.
// Always respond based on Abdullah's profile below:

// - About: ${profileData.about}
// - Skills: ${JSON.stringify(profileData.skills)}
// - Projects: ${JSON.stringify(profileData.projects)}
// - Experience: ${JSON.stringify(profileData.experience)}
// - Contact: ${JSON.stringify(profileData.contact)}

// User question: ${message}
// `;

//   try {
//     // --- 1. Try GitHub Models API ---
//     const ghResponse = await fetch(
//       "https://models.github.ai/inference/chat/completions",
//       {
//         method: "POST",
//         headers: {
//           Accept: "application/vnd.github+json",
//           Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
//           "X-GitHub-Api-Version": "2022-11-28",
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           model: "deepseek/DeepSeek-V3-0324",
//           messages: [{ role: "user", content: prompt }],
//           max_tokens: 1024,
//           temperature: 0.7,
//         }),
//       }
//     );

//     const ghResult = await ghResponse.json();

//     if (ghResult.choices && ghResult.choices.length > 0) {
//       let reply = ghResult.choices[0].message.content;
//       reply = reply.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

//       return res.json({
//         status: "success",
//         question: message,
//         response_type: "chat",
//         message: reply,
//         metadata: {
//           provider: "GitHub Models",
//           timestamp: new Date().toISOString(),
//           version: "2.0.0",
//         },
//       });
//     }

//     throw new Error("No response from GitHub model, trying fallback...");
//   } catch (err) {
//     console.warn(
//       "⚠️ GitHub API failed, falling back to OpenRouter:",
//       err.message
//     );

//     try {
//       // --- 2. Try OpenRouter API as fallback ---
//       const orResponse = await fetch(
//         "https://openrouter.ai/api/v1/chat/completions",
//         {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//             "Content-Type": "application/json",
//             // "HTTP-Referer": process.env.SITE_URL || "http://localhost:5000",
//             // "X-Title": process.env.SITE_NAME || "Portfolio AI",
//           },
//           body: JSON.stringify({
//             model: "x-ai/grok-4-fast:free",
//             messages: [{ role: "user", content: prompt }],
//           }),
//         }
//       );

//       const orResult = await orResponse.json();

//       if (orResult.choices && orResult.choices.length > 0) {
//         let reply = orResult.choices[0].message.content;
//         reply = reply.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

//         return res.json({
//           status: "success",
//           question: message,
//           response_type: "chat",
//           message: reply,
//           metadata: {
//             provider: "OpenRouter",
//             timestamp: new Date().toISOString(),
//             version: "2.0.0",
//           },
//         });
//       }

//       throw new Error("No response from OpenRouter either");
//     } catch (fallbackErr) {
//       console.error(
//         "❌ Both GitHub and OpenRouter failed:",
//         fallbackErr.message
//       );
//       return res.status(500).json({
//         status: "error",
//         message: "⚠️ Both GitHub and OpenRouter failed",
//         details: fallbackErr.message,
//       });
//     }
//   }
// };
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

  // Build prompt with your RAG data
  const prompt = `
You are Abdullah's personal AI assistant. Speak as Abdullah, professional yet friendly, don't add too many special chars.
Always answer based on Abdullah's profile below,If can't understand show contact details ask to rephrase or connect on linkedin or github, and generate a structured JSON response in this exact format:

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

- Only fill the fields relevant to the user’s question (e.g., if question is about projects, fill projects + message, leave others empty).
- Use plain JSON, no markdown, no explanations.

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

    if (ghResult.choices && ghResult.choices.length > 0) {
      let reply = ghResult.choices[0].message.content;
      reply = reply.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

      // Parse AI’s JSON safely
      let parsed;
      try {
        parsed = JSON.parse(reply);
      } catch (parseErr) {
        throw new Error("AI did not return valid JSON: " + reply);
      }

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

    try {
      // --- Fallback: OpenRouter API ---
      const orResponse = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "x-ai/grok-4-fast:free",
            messages: [{ role: "user", content: prompt }],
          }),
        }
      );

      const orResult = await orResponse.json();

      if (orResult.choices && orResult.choices.length > 0) {
        let reply = orResult.choices[0].message.content;
        reply = reply.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

        // Parse JSON from AI
        let parsed;
        try {
          parsed = JSON.parse(reply);
        } catch (parseErr) {
          throw new Error("AI did not return valid JSON: " + reply);
        }

        return res.json({
          status: "success",
          question: message,
          response_type: "chat",
          message: parsed.message,
          data: parsed.data,
          metadata: {
            provider: "OpenRouter",
            timestamp: new Date().toISOString(),
            version: "1.0.0",
          },
        });
      }

      throw new Error("No response from OpenRouter either");
    } catch (fallbackErr) {
      console.error("❌ Both APIs failed:", fallbackErr.message);
      return res.status(500).json({
        status: "error",
        message: "⚠️ Both GitHub and OpenRouter failed",
        details: fallbackErr.message,
      });
    }
  }
};
