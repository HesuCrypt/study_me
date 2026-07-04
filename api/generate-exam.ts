import { GoogleGenAI } from '@google/genai';

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: (body?: string) => void;
};

const parseBody = (body: unknown) => {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  if (body && typeof body === 'object') {
    return body as Record<string, unknown>;
  }

  return null;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    return;
  }

  const body = parseBody(req.body);
  if (!body) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const questionCount =
    typeof body.questionCount === 'number' && Number.isFinite(body.questionCount)
      ? body.questionCount
      : 5;
  const difficulty = typeof body.difficulty === 'string' ? body.difficulty : 'Medium';

  if (!topic) {
    res.status(400).json({ error: 'Topic is required' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from AI');
    }

    res.status(200).json(JSON.parse(responseText));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate exam';
    res.status(500).json({ error: message });
  }
}
