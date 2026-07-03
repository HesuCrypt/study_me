import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

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
