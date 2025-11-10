/**
 * 🧠 MD NEET-PG Question Generator Backend
 * ----------------------------------------
 * Generates NEET-PG / AIIMS / USMLE-level MCQs using Google Gemini API.
 * Does NOT save questions; returns JSON directly to frontend.
 */

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const app = express();

dotenv.config();

// Middleware
app.use(express.json());
app.use(cors()); // ✅ Enable CORS for all origins
// --------------------
// 🔧 Configuration
// --------------------
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GL_API_KEY || "YOUR_GEMINI_API_KEY_HERE";
const MODEL = process.env.MODEL || "gemini-2.0-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
  console.warn("⚠️ Warning: GL_API_KEY not set. Set it in your .env file.");
}

app.use(express.json());

// --------------------
// ✅ Root route
// --------------------
app.get("/", (req, res) => {
  res.send("🧠 MD NEET-PG Question Generator Backend is running!");
});

// --------------------
// 🧩 Generate MCQs Endpoint
// --------------------
app.post("/generate", async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Please provide a topic name." });
    }

    // 🧠 Prompt sent to Gemini
    const prompt = `
You are an expert NEET-PG question setter and medical educator.

Generate 2 high-quality multiple-choice questions (MCQs) for the topic: "${topic}".

Requirements:
- Difficulty: NEET-PG / AIIMS / USMLE-level.
- Include a mix of conceptual, clinical, and case-based questions.
- Include both medium (30%) and hard (70%) conceptual mixes (100% hard-creative).
- Each question must have 4 options (A–D).
- Include a detailed explanation for the correct answer.
- Output MUST be strictly valid JSON in the following structure:

{
  "topic": "${topic}",
  "questions": [
    {
      "serial": 1,
      "question": "Question text",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correct_answer": {
        "option": "A",
        "text": "Correct option text"
      },
      "explanation": "Detailed explanation with reasoning for correct and incorrect answers."
    },
    ...
  ]
}

Do NOT include any text outside the JSON (no markdown, no commentary).
`;

    // --------------------
    // 🌐 Call Gemini API
    // --------------------
    const response = await fetch(
      `${API_BASE}/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    // Handle API errors gracefully
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({ error: "No content returned from model." });
    }

    // --------------------
    // 🧩 Parse JSON safely
    // --------------------
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      // If model includes extra text, attempt to extract JSON
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        parsed = JSON.parse(text.substring(start, end + 1));
      } else {
        throw new Error("Model response not in JSON format.");
      }
    }

    // --------------------
    // ✅ Send Response
    // --------------------
    res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error("❌ Error generating questions:", error);
    res.status(500).json({ error: error.message });
  }
});

// --------------------
// 🚀 Start Server
// --------------------
app.listen(PORT, () => {
  console.log(`✅ Backend running at: http://localhost:${PORT}`);
});
