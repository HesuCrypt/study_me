import { GoogleGenAI } from '@google/genai';
import {
  CHAT_COACH_SYSTEM_PROMPT,
  extractSuggestedActionFromReply,
  toGeminiContents,
  type ChatCoachMessage,
} from '../src/lib/chatCoach';

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

  const messages = Array.isArray(body.messages) ? (body.messages as ChatCoachMessage[]) : [];
  const mode = body.mode === 'strict' || body.mode === 'exam' ? body.mode : 'gentle';
  const currentModule = typeof body.currentModule === 'string' ? body.currentModule : 'dashboard';

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const modeInstruction =
      mode === 'strict'
        ? 'Use a more direct, accountability-focused tone.'
        : mode === 'exam'
          ? 'Focus on review, quiz framing, recall, and exam urgency.'
          : 'Use a supportive and calm coaching tone.';

    const contextInstruction =
      currentModule === 'exams'
        ? 'The user is in the exams area, so prioritize review and test preparation.'
        : currentModule === 'calendar'
          ? 'The user is in the calendar area, so date-aware planning is useful.'
          : currentModule === 'tasks'
            ? 'The user is in the task area, so concrete next actions are useful.'
            : 'Keep the user on course with practical study guidance.';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
      throw new Error('Empty response from AI');
    }

    const parsed = extractSuggestedActionFromReply(replyText);

    res.status(200).json({
      reply: {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: parsed.content || replyText,
        createdAt: new Date().toISOString(),
      },
      suggestedAction: parsed.suggestedAction,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate chat response';
    res.status(500).json({ error: message });
  }
}
