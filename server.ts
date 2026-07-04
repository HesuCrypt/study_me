import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  CHAT_COACH_SYSTEM_PROMPT,
  extractSuggestedActionFromReply,
  toGeminiContents,
  type ChatCoachMessage,
} from "./src/lib/chatCoach";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/generate-exam", async (req, res) => {
    try {
      const { topic, questionCount = 5, difficulty = "Medium" } = req.body;
      
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const prompt = `Generate a mock exam about "${topic}" for a tourism student or flight attendant. 
      The difficulty level of the questions should be: ${difficulty}.
      It should contain exactly ${questionCount} questions.
      Return the output as a strict JSON object with this structure, and do not include markdown formatting like \`\`\`json:
      {
        "title": "A generated title for the exam",
        "questions": [
          { 
            "question": "Question text here",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answer": "The exact text of the correct option"
          }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
      });
      
      const responseText = response.text;
      if (!responseText) throw new Error("Empty response from AI");
      
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to generate exam" });
    }
  });

  app.post("/api/chat-coach", async (req, res) => {
    try {
      const {
        messages = [],
        mode = "gentle",
        currentModule = "dashboard",
      } = req.body as {
        messages?: ChatCoachMessage[];
        mode?: "gentle" | "strict" | "exam";
        currentModule?: string;
      };

      if (!Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages must be an array" });
      }

      const modeInstruction =
        mode === "strict"
          ? "Use a more direct, accountability-focused tone."
          : mode === "exam"
            ? "Focus on review, quiz framing, recall, and exam urgency."
            : "Use a supportive and calm coaching tone.";

      const contextInstruction =
        currentModule === "exams"
          ? "The user is in the exams area, so prioritize review and test preparation."
          : currentModule === "calendar"
            ? "The user is in the calendar area, so date-aware planning is useful."
            : currentModule === "tasks"
              ? "The user is in the task area, so concrete next actions are useful."
              : "Keep the user on course with practical study guidance.";

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: toGeminiContents(messages),
        config: {
          systemInstruction: `${CHAT_COACH_SYSTEM_PROMPT} ${modeInstruction} ${contextInstruction}

When appropriate, you may append one line starting with ACTION_TASK: or ACTION_CALENDAR:

ACTION_TASK format:
ACTION_TASK: task text here

ACTION_CALENDAR format:
ACTION_CALENDAR: title | type | YYYY-MM-DD | HH:MM | note

Only include one action line, and only when suggesting a concrete item the user may want to save.`,
        },
      });

      const replyText = response.text?.trim();
      if (!replyText) {
        throw new Error("Empty response from AI");
      }

      const parsed = extractSuggestedActionFromReply(replyText);

      res.json({
        reply: {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: parsed.content || replyText,
          createdAt: new Date().toISOString(),
        },
        suggestedAction: parsed.suggestedAction,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to generate chat response" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
