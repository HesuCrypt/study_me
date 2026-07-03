# Flight Attendant Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating AI study coach that appears on every page, stores chat state locally, sends messages through a new Gemini-backed `/api/chat-coach` endpoint, and delivers gentle study nudges without changing user data automatically.

**Architecture:** Keep the feature local-first and consistent with the current app by splitting it into a shared chat helper module, a single floating React component rendered at the app root, and one new Express API route in `server.ts`. Put persistence, prompt text, quick prompts, and nudge timing in a pure helper file so both the UI and server stay small and the most fragile logic can be covered by unit tests.

**Tech Stack:** React 19, TypeScript, Vite, Express, Gemini via `@google/genai`, `motion/react`, `lucide-react`, `localStorage`, Vitest, Testing Library

---

## File Map

- Create: `src/lib/chatCoach.ts`
  - Shared message types, storage keys, quick prompts, system prompt, local persistence helpers, nudge helpers, and Gemini payload conversion
- Create: `src/lib/chatCoach.test.ts`
  - Unit tests for storage recovery, history trimming, nudge throttling, and Gemini content conversion
- Create: `src/components/ChatCoach.tsx`
  - Floating launcher, compact chat panel, quick prompts, input, send flow, loading state, fallback error handling, and local-only nudges
- Create: `src/components/ChatCoach.test.tsx`
  - Component tests for message sending, quick prompts, fallback behavior, and app-level visibility
- Modify: `src/App.tsx`
  - Mount the floating coach once at the root and pass `currentModule` so nudges can react to dashboard returns without remounting
- Modify: `server.ts`
  - Add `POST /api/chat-coach` using the same Gemini model style as the existing exam generator
- Create: `docs/superpowers/plans/2026-07-03-flight-attendant-chatbot-implementation.md`
  - This plan

## Implementation Notes

- Keep message shape aligned with the approved spec:

```ts
export interface ChatCoachMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}
```

- Use these exact local storage keys:

```ts
export const CHAT_COACH_HISTORY_KEY = 'study-me-chat-coach-history';
export const CHAT_COACH_OPEN_KEY = 'study-me-chat-coach-open';
export const CHAT_COACH_LAST_NUDGE_KEY = 'study-me-chat-coach-last-nudge';
```

- Keep nudges local-only in v1 so the app does not spend tokens for passive reminders
- Cap local history to the latest 24 messages before saving or sending to the API
- Do not let the assistant claim it changed tasks or calendar data
- Reuse `gemini-2.5-flash` to stay consistent with the current exam generator route
- Implement all three approved nudge triggers in the UI:
  - initial app open
  - returning to the dashboard
  - extended idle time while the app remains open

### Task 1: Create Shared Chat Coach Helpers

**Files:**
- Create: `src/lib/chatCoach.ts`
- Create: `src/lib/chatCoach.test.ts`

- [ ] **Step 1: Write the failing unit tests**

Create `src/lib/chatCoach.test.ts` with:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CHAT_COACH_HISTORY_KEY,
  CHAT_COACH_LAST_NUDGE_KEY,
  CHAT_COACH_OPEN_KEY,
  CHAT_COACH_QUICK_PROMPTS,
  buildCoachNudge,
  createChatCoachMessage,
  loadChatCoachHistory,
  loadChatCoachOpenState,
  loadLastCoachNudge,
  saveChatCoachHistory,
  saveChatCoachOpenState,
  saveLastCoachNudge,
  shouldTriggerCoachNudge,
  toGeminiContents,
  trimChatCoachHistory,
} from './chatCoach';

describe('chatCoach helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('recovers from broken history JSON', () => {
    localStorage.setItem(CHAT_COACH_HISTORY_KEY, '{broken json');
    expect(loadChatCoachHistory()).toEqual([]);
  });

  it('persists trimmed history only', () => {
    const messages = Array.from({ length: 30 }, (_, index) =>
      createChatCoachMessage('user', `message ${index + 1}`, `2026-07-03T00:${String(index).padStart(2, '0')}:00.000Z`)
    );

    saveChatCoachHistory(messages);

    const saved = loadChatCoachHistory();
    expect(saved).toHaveLength(24);
    expect(saved[0].content).toBe('message 7');
    expect(saved[23].content).toBe('message 30');
  });

  it('stores open state and last nudge timestamps', () => {
    saveChatCoachOpenState(true);
    saveLastCoachNudge('2026-07-03T10:00:00.000Z');

    expect(localStorage.getItem(CHAT_COACH_OPEN_KEY)).toBe('true');
    expect(localStorage.getItem(CHAT_COACH_LAST_NUDGE_KEY)).toBe('2026-07-03T10:00:00.000Z');
    expect(loadChatCoachOpenState()).toBe(true);
    expect(loadLastCoachNudge()).toBe('2026-07-03T10:00:00.000Z');
  });

  it('throttles nudges within the minimum interval', () => {
    const now = new Date('2026-07-03T19:00:00.000Z');
    expect(shouldTriggerCoachNudge(now, null)).toBe(true);
    expect(shouldTriggerCoachNudge(now, '2026-07-03T18:45:00.000Z')).toBe(false);
    expect(shouldTriggerCoachNudge(now, '2026-07-03T17:45:00.000Z')).toBe(true);
  });

  it('builds a flight-attendant style nudge message', () => {
    const nudge = buildCoachNudge(new Date('2026-07-03T19:00:00.000Z'));
    expect(nudge.role).toBe('assistant');
    expect(nudge.content).toMatch(/captain|study|course/i);
  });

  it('drops system messages when building Gemini contents', () => {
    const contents = toGeminiContents([
      createChatCoachMessage('system', 'internal'),
      createChatCoachMessage('user', 'Help me study'),
      createChatCoachMessage('assistant', 'Let us review boarding procedures.'),
    ]);

    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'Help me study' }] },
      { role: 'model', parts: [{ text: 'Let us review boarding procedures.' }] },
    ]);
  });

  it('exposes the default quick prompts', () => {
    expect(CHAT_COACH_QUICK_PROMPTS).toEqual([
      'Motivate me to study',
      'What should I study next?',
      'Help me plan tonight',
      'Quiz me on this topic',
    ]);
  });

  it('trims history in memory without mutating the original array', () => {
    const messages = Array.from({ length: 26 }, (_, index) =>
      createChatCoachMessage('assistant', `reply ${index + 1}`, `2026-07-03T00:${String(index).padStart(2, '0')}:00.000Z`)
    );

    const trimmed = trimChatCoachHistory(messages);

    expect(messages).toHaveLength(26);
    expect(trimmed).toHaveLength(24);
    expect(trimmed[0].content).toBe('reply 3');
  });
});
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run: `npm test -- src/lib/chatCoach.test.ts`
Expected: FAIL with `Cannot find module './chatCoach'` or missing export errors

- [ ] **Step 3: Write the minimal helper implementation**

Create `src/lib/chatCoach.ts` with:

```ts
export type ChatCoachRole = 'user' | 'assistant' | 'system';

export interface ChatCoachMessage {
  id: string;
  role: ChatCoachRole;
  content: string;
  createdAt: string;
}

export const CHAT_COACH_HISTORY_KEY = 'study-me-chat-coach-history';
export const CHAT_COACH_OPEN_KEY = 'study-me-chat-coach-open';
export const CHAT_COACH_LAST_NUDGE_KEY = 'study-me-chat-coach-last-nudge';
export const CHAT_COACH_HISTORY_LIMIT = 24;

export const CHAT_COACH_QUICK_PROMPTS = [
  'Motivate me to study',
  'What should I study next?',
  'Help me plan tonight',
  'Quiz me on this topic',
] as const;

export const CHAT_COACH_SYSTEM_PROMPT = `You are Study Me's AI coach. Speak like a polished flight attendant: warm, professional, gently firm, and encouraging. Keep guiding the user back to studying, focus, tasks, revision, or practical next steps. Be concise by default. Never shame the user. Never claim to have modified tasks, calendar entries, or app data unless the UI explicitly confirms that action.`;

export const createChatCoachMessage = (
  role: ChatCoachRole,
  content: string,
  createdAt = new Date().toISOString()
): ChatCoachMessage => ({
  id: `${role}-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  createdAt,
});

export const trimChatCoachHistory = (
  messages: ChatCoachMessage[],
  limit = CHAT_COACH_HISTORY_LIMIT
) => {
  return messages.slice(-limit);
};

export const loadChatCoachHistory = (): ChatCoachMessage[] => {
  const saved = localStorage.getItem(CHAT_COACH_HISTORY_KEY);
  if (!saved) return [];

  try {
    return trimChatCoachHistory(JSON.parse(saved) as ChatCoachMessage[]);
  } catch (error) {
    console.error('Failed to parse chat coach history', error);
    return [];
  }
};

export const saveChatCoachHistory = (messages: ChatCoachMessage[]) => {
  localStorage.setItem(CHAT_COACH_HISTORY_KEY, JSON.stringify(trimChatCoachHistory(messages)));
};

export const loadChatCoachOpenState = () => {
  return localStorage.getItem(CHAT_COACH_OPEN_KEY) === 'true';
};

export const saveChatCoachOpenState = (isOpen: boolean) => {
  localStorage.setItem(CHAT_COACH_OPEN_KEY, String(isOpen));
};

export const loadLastCoachNudge = () => {
  return localStorage.getItem(CHAT_COACH_LAST_NUDGE_KEY);
};

export const saveLastCoachNudge = (createdAt: string) => {
  localStorage.setItem(CHAT_COACH_LAST_NUDGE_KEY, createdAt);
};

export const shouldTriggerCoachNudge = (
  now: Date,
  lastNudgeAt: string | null,
  minIntervalMs = 1000 * 60 * 45
) => {
  if (!lastNudgeAt) return true;
  const lastTime = new Date(lastNudgeAt).getTime();
  if (Number.isNaN(lastTime)) return true;
  return now.getTime() - lastTime >= minIntervalMs;
};

export const buildCoachNudge = (now = new Date()) => {
  const hour = now.getHours();
  const content =
    hour < 12
      ? 'Captain, let us start strong. Pick one study task and begin now.'
      : hour < 18
        ? 'Quick check-in, captain: what is the next lesson or reviewer we should finish today?'
        : 'Evening check, captain. Before we relax, let us clear one small study task first.';

  return createChatCoachMessage('assistant', content, now.toISOString());
};

export const toGeminiContents = (messages: ChatCoachMessage[]) => {
  return trimChatCoachHistory(messages)
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
};
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run: `npm test -- src/lib/chatCoach.test.ts`
Expected: PASS for all helper tests

- [ ] **Step 5: Commit the helper module**

```bash
git add src/lib/chatCoach.ts src/lib/chatCoach.test.ts
git commit -m "feat(chatbot): add shared coach helpers"
```

### Task 2: Add The Chat Coach API Route

**Files:**
- Modify: `server.ts`

- [ ] **Step 1: Add the new request handler in `server.ts`**

Update `server.ts` by adding the new import and route:

```ts
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { CHAT_COACH_SYSTEM_PROMPT, toGeminiContents, type ChatCoachMessage } from "./src/lib/chatCoach";

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
      const { messages = [] } = req.body as { messages?: ChatCoachMessage[] };

      if (!Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages must be an array" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: toGeminiContents(messages),
        config: {
          systemInstruction: CHAT_COACH_SYSTEM_PROMPT,
        },
      });

      const replyText = response.text?.trim();
      if (!replyText) {
        throw new Error("Empty response from AI");
      }

      res.json({
        reply: {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: replyText,
          createdAt: new Date().toISOString(),
        },
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
```

- [ ] **Step 2: Run the type-check after adding the route**

Run: `npm run lint`
Expected: `tsc --noEmit` exits successfully

- [ ] **Step 3: Manually verify the new API route**

Run the dev server in one terminal:

```bash
npm run dev
```

Expected: `Server running on http://localhost:3000`

Then in a second terminal run:

```bash
curl -s http://localhost:3000/api/chat-coach \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"1","role":"user","content":"Motivate me to study aviation safety.","createdAt":"2026-07-03T12:00:00.000Z"}]}'
```

Expected: JSON with a `reply` object whose `role` is `"assistant"` and whose `content` is non-empty

- [ ] **Step 4: Commit the backend route**

```bash
git add server.ts
git commit -m "feat(chatbot): add coach chat api"
```

### Task 3: Build The Floating Chat Coach UI

**Files:**
- Create: `src/components/ChatCoach.tsx`
- Create: `src/components/ChatCoach.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `src/components/ChatCoach.test.tsx` with:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { ChatCoach } from './ChatCoach';

describe('ChatCoach', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('opens from the launcher, sends a quick prompt, and renders the assistant reply', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Captain, start with 20 minutes on your reviewer and report back.',
          createdAt: '2026-07-03T12:01:00.000Z',
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<ChatCoach currentModule="dashboard" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.click(screen.getByRole('button', { name: /motivate me to study/i }));

    expect(await screen.findByText(/Captain, start with 20 minutes/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat-coach',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('shows a friendly fallback message when the request fails', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<ChatCoach currentModule="dashboard" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.type(screen.getByLabelText(/message study coach/i), 'Help me plan tonight');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/We hit a little turbulence/i)).toBeInTheDocument();
  });

  it('stays visible after app navigation because it is mounted at the root', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: {
          id: 'assistant-2',
          role: 'assistant',
          content: 'What should we review next, captain?',
          createdAt: '2026-07-03T12:02:00.000Z',
        },
      }),
    }));

    render(<App />);

    const launcher = screen.getByRole('button', { name: /open study coach/i });
    expect(launcher).toBeInTheDocument();

    await user.click(screen.getByText('Calendar'));

    await waitFor(() => {
      expect(screen.getByText(/Track exams, birthdays, reminders/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /open study coach/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the component test to verify it fails**

Run: `npm test -- src/components/ChatCoach.test.tsx`
Expected: FAIL with `Cannot find module './ChatCoach'` or root-visibility assertions failing

- [ ] **Step 3: Write the minimal floating coach implementation**

Create `src/components/ChatCoach.tsx` with:

```tsx
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import type { ModuleId } from './Dashboard';
import {
  CHAT_COACH_QUICK_PROMPTS,
  buildCoachNudge,
  createChatCoachMessage,
  loadChatCoachHistory,
  loadChatCoachOpenState,
  loadLastCoachNudge,
  saveChatCoachHistory,
  saveChatCoachOpenState,
  saveLastCoachNudge,
  shouldTriggerCoachNudge,
  trimChatCoachHistory,
  type ChatCoachMessage,
} from '../lib/chatCoach';

interface ChatCoachProps {
  currentModule: ModuleId;
}

interface ChatCoachResponse {
  reply: ChatCoachMessage;
}

export function ChatCoach({ currentModule }: ChatCoachProps) {
  const [isOpen, setIsOpen] = useState(() => loadChatCoachOpenState());
  const [messages, setMessages] = useState<ChatCoachMessage[]>(() => loadChatCoachHistory());
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasUnreadNudge, setHasUnreadNudge] = useState(false);
  const [idleSignal, setIdleSignal] = useState(0);

  const queueNudge = (delay: number) => {
    const now = new Date();
    const lastNudge = loadLastCoachNudge();

    if (!shouldTriggerCoachNudge(now, lastNudge)) {
      return undefined;
    }

    return window.setTimeout(() => {
      const nudge = buildCoachNudge(new Date());
      setMessages((current) => trimChatCoachHistory([...current, nudge]));
      saveLastCoachNudge(nudge.createdAt);
      if (!isOpen) {
        setHasUnreadNudge(true);
      }
    }, delay);
  };

  useEffect(() => {
    saveChatCoachOpenState(isOpen);
    if (isOpen) {
      setHasUnreadNudge(false);
    }
  }, [isOpen]);

  useEffect(() => {
    saveChatCoachHistory(messages);
  }, [messages]);

  useEffect(() => {
    if (currentModule !== 'dashboard') {
      return;
    }

    const timer = queueNudge(1200);
    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [currentModule, isOpen]);

  useEffect(() => {
    let idleTimer = window.setTimeout(() => setIdleSignal((value) => value + 1), 1000 * 60 * 12);

    const resetIdleTimer = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setIdleSignal((value) => value + 1), 1000 * 60 * 12);
    };

    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetIdleTimer));

    return () => {
      window.clearTimeout(idleTimer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetIdleTimer));
    };
  }, []);

  useEffect(() => {
    if (idleSignal === 0) {
      return;
    }

    const timer = queueNudge(0);
    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [idleSignal, isOpen]);

  const subtitle = useMemo(() => {
    return isSending ? 'Preparing your next instruction...' : 'Flight deck study coach';
  }, [isSending]);

  const appendAssistantFallback = () => {
    setMessages((current) =>
      trimChatCoachHistory([
        ...current,
        createChatCoachMessage(
          'assistant',
          'We hit a little turbulence, captain. Try again and we will get your study plan back on course.'
        ),
      ])
    );
  };

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    const userMessage = createChatCoachMessage('user', trimmed);
    const nextHistory = trimChatCoachHistory([...messages, userMessage]);

    setMessages(nextHistory);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextHistory }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const data = (await response.json()) as ChatCoachResponse;
      setMessages((current) => trimChatCoachHistory([...current, data.reply]));
    } catch (error) {
      console.error('Failed to send coach message', error);
      appendAssistantFallback();
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await sendMessage(input);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Study Coach"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-black text-white shadow-lg flex items-center justify-center"
      >
        <MessageCircle className="h-5 w-5" />
        {hasUnreadNudge && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-white ring-2 ring-black" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="fixed bottom-24 right-6 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Study Coach</p>
                <h2 className="mt-1 text-lg font-semibold">Cabin Briefing</h2>
                <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Study Coach"
                className="rounded-full border border-neutral-200 p-2 text-neutral-500 hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <div className="rounded-3xl bg-neutral-50 p-4 text-sm text-neutral-600">
                  Captain, welcome aboard. Tell me what you need help studying today.
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-3xl bg-black px-4 py-3 text-sm text-white'
                      : 'max-w-[85%] rounded-3xl bg-neutral-100 px-4 py-3 text-sm text-neutral-800'
                  }
                >
                  {message.content}
                </div>
              ))}

              {isSending && (
                <div className="max-w-[85%] rounded-3xl bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
                  Preparing your next instruction...
                </div>
              )}
            </div>

            <div className="border-t border-neutral-200 px-5 py-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {CHAT_COACH_QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-full border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:border-black hover:text-black"
                    aria-label={prompt}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-3 w-3" />
                      {prompt}
                    </span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="flex items-end gap-3">
                <label htmlFor="chat-coach-input" className="sr-only">
                  Message Study Coach
                </label>
                <textarea
                  id="chat-coach-input"
                  aria-label="Message Study Coach"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask for motivation, a study plan, or your next task."
                  rows={2}
                  className="min-h-[72px] flex-1 resize-none rounded-3xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-black"
                />
                <button
                  type="submit"
                  aria-label="Send Message"
                  disabled={isSending}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 4: Run the component test to verify it passes**

Run: `npm test -- src/components/ChatCoach.test.tsx`
Expected: PASS for quick prompt, fallback, and root-visibility tests

- [ ] **Step 5: Commit the floating UI**

```bash
git add src/components/ChatCoach.tsx src/components/ChatCoach.test.tsx
git commit -m "feat(chatbot): add floating study coach ui"
```

### Task 4: Mount The Coach At The App Root

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update `src/App.tsx` so the coach is rendered once and never tied to a single module page**

Replace `src/App.tsx` with:

```tsx
import { useState } from 'react';
import { Dashboard, ModuleId } from './components/Dashboard';
import { Diary } from './components/Diary';
import { DailyTasks } from './components/DailyTasks';
import { ExamCreator } from './components/ExamCreator';
import { Languages } from './components/Languages';
import { Subjects } from './components/Subjects';
import { Finance } from './components/Finance';
import { Calendar } from './components/Calendar';
import { ChatCoach } from './components/ChatCoach';

export default function App() {
  const [currentModule, setCurrentModule] = useState<ModuleId>('dashboard');

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {currentModule === 'dashboard' && <Dashboard onNavigate={setCurrentModule} />}
      {currentModule === 'diary' && <Diary onNavigate={setCurrentModule} />}
      {currentModule === 'tasks' && <DailyTasks onNavigate={setCurrentModule} />}
      {currentModule === 'exams' && <ExamCreator onNavigate={setCurrentModule} />}
      {currentModule === 'languages' && <Languages onNavigate={setCurrentModule} />}
      {currentModule === 'subjects' && <Subjects onNavigate={setCurrentModule} />}
      {currentModule === 'finance' && <Finance onNavigate={setCurrentModule} />}
      {currentModule === 'calendar' && <Calendar onNavigate={setCurrentModule} />}

      <ChatCoach currentModule={currentModule} />
    </div>
  );
}
```

- [ ] **Step 2: Re-run the app-level visibility test**

Run: `npm test -- src/components/ChatCoach.test.tsx`
Expected: PASS with the `stays visible after app navigation` test proving root-level mounting

- [ ] **Step 3: Commit the app integration**

```bash
git add src/App.tsx
git commit -m "feat(chatbot): mount coach globally"
```

### Task 5: Run Full Verification And Finish

**Files:**
- Modify: `src/lib/chatCoach.ts`
- Modify: `src/components/ChatCoach.tsx`
- Modify: `src/components/ChatCoach.test.tsx`
- Modify: `src/App.tsx`
- Modify: `server.ts`

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: PASS for existing calendar/dashboard tests plus the new chat coach tests

- [ ] **Step 2: Run the full type-check**

Run: `npm run lint`
Expected: `tsc --noEmit` exits successfully

- [ ] **Step 3: Perform the final manual smoke check**

Run the dev server:

```bash
npm run dev
```

Verify manually in the browser:

- the launcher appears on the dashboard
- the launcher is still present after navigating to `Calendar`, `Finance`, and `Diary`
- opening the panel shows quick prompts
- sending a message returns a coach reply
- reloading the page preserves recent messages
- nudges do not spam immediately after one has already appeared
- leaving the app idle long enough produces at most one gentle nudge until the throttle window passes
- `/api/generate-exam` still works from the exam creator

- [ ] **Step 4: Commit the final verified feature**

```bash
git add src/lib/chatCoach.ts src/lib/chatCoach.test.ts src/components/ChatCoach.tsx src/components/ChatCoach.test.tsx src/App.tsx server.ts
git commit -m "feat(chatbot): add flight attendant study coach"
```
