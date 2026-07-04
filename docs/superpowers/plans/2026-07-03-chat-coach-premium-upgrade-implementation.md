# Chat Coach Premium Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing floating chat coach with a premium glassmorphism UI, manual and recommended coach modes, and confirmation-based task/calendar quick actions while preserving the local-first architecture.

**Architecture:** Keep the current global `ChatCoach` entry point and `/api/chat-coach` backend route, but split the growing coach logic into focused helper and UI files. Extend the shared coach helpers with mode state, recommendation logic, and action payload parsing, then add a confirmation-sheet flow that writes to the existing task and calendar local storage contracts only after explicit user confirmation.

**Tech Stack:** React 19, TypeScript, Express, Gemini via `@google/genai`, `motion/react`, `lucide-react`, browser `localStorage`, Vitest, Testing Library

---

## File Map

- Modify: `src/lib/chatCoach.ts`
  - Add coach mode types, mode persistence helpers, recommendation logic, action payload types, request/response helpers, and task storage helpers
- Create: `src/components/chat-coach/ModeSwitcher.tsx`
  - Segmented control for `Gentle`, `Strict`, `Exam Mode`
- Create: `src/components/chat-coach/ActionCard.tsx`
  - Structured task/calendar suggestion card UI
- Create: `src/components/chat-coach/ConfirmationSheet.tsx`
  - Read-only confirmation surface for task and calendar saves
- Modify: `src/components/ChatCoach.tsx`
  - Premium shell redesign, mode selector integration, recommendation surface, action rendering, and confirmation-sheet orchestration
- Modify: `src/components/ChatCoach.test.tsx`
  - Expand UI tests for modes, action cards, and confirmation flow
- Modify: `src/lib/chatCoach.test.ts`
  - Expand helper tests for mode persistence, recommendation logic, and action payload parsing
- Modify: `server.ts`
  - Accept active mode and current module, adjust prompt behavior, and optionally return structured action payloads
- Create: `docs/superpowers/plans/2026-07-03-chat-coach-premium-upgrade-implementation.md`
  - This plan

## Implementation Notes

- Keep the existing message shape:

```ts
export interface ChatCoachMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}
```

- Add exact coach modes:

```ts
export type ChatCoachMode = 'gentle' | 'strict' | 'exam';
```

- Persist the selected mode with a dedicated key:

```ts
export const CHAT_COACH_MODE_KEY = 'study-me-chat-coach-mode';
```

- Keep recommended mode and pending review-sheet payload in React state only
- Keep the confirmation sheet read-only in v1 of this upgrade
- Use the existing task storage key `study-me-tasks`
- Use the existing calendar helpers from `src/lib/calendar.ts` for event saves
- Preserve the existing fallback message behavior if the route fails

### Task 1: Extend Shared Chat Coach Helpers

**Files:**
- Modify: `src/lib/chatCoach.ts`
- Modify: `src/lib/chatCoach.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Update `src/lib/chatCoach.test.ts` by adding these tests below the current suite content:

```ts
import {
  CHAT_COACH_MODE_KEY,
  buildTaskFromSuggestion,
  createSuggestedTaskAction,
  createSuggestedCalendarAction,
  getRecommendedCoachMode,
  isCalendarActionSuggestion,
  isTaskActionSuggestion,
  loadChatCoachMode,
  saveChatCoachMode,
  type CalendarActionSuggestion,
  type TaskActionSuggestion,
} from './chatCoach';

it('stores and restores the selected coach mode', () => {
  saveChatCoachMode('strict');

  expect(localStorage.getItem(CHAT_COACH_MODE_KEY)).toBe('strict');
  expect(loadChatCoachMode()).toBe('strict');
});

it('falls back to gentle mode when persisted mode is invalid', () => {
  localStorage.setItem(CHAT_COACH_MODE_KEY, 'captain-mode');
  expect(loadChatCoachMode()).toBe('gentle');
});

it('recommends exam mode for exam pages and quiz prompts', () => {
  expect(getRecommendedCoachMode('exams', 'quiz me on this topic')).toBe('exam');
  expect(getRecommendedCoachMode('dashboard', 'help me review for finals')).toBe('exam');
});

it('recommends strict mode for procrastination prompts', () => {
  expect(getRecommendedCoachMode('dashboard', 'i keep procrastinating')).toBe('strict');
});

it('recommends gentle mode for planning support', () => {
  expect(getRecommendedCoachMode('tasks', 'help me plan tonight')).toBe('gentle');
});

it('detects a valid task action payload', () => {
  const payload: TaskActionSuggestion = {
    kind: 'task',
    label: 'Add to Tasks',
    taskText: 'Review evacuation commands',
  };

  expect(isTaskActionSuggestion(payload)).toBe(true);
  expect(isCalendarActionSuggestion(payload)).toBe(false);
});

it('detects a valid calendar action payload', () => {
  const payload: CalendarActionSuggestion = {
    kind: 'calendar',
    label: 'Add to Calendar',
    event: {
      title: 'Cabin crew exam',
      type: 'exam',
      date: '2099-07-04',
      time: '09:00',
      note: 'Bring reviewer',
    },
  };

  expect(isCalendarActionSuggestion(payload)).toBe(true);
  expect(isTaskActionSuggestion(payload)).toBe(false);
});

it('builds a new task from a task suggestion', () => {
  const task = buildTaskFromSuggestion({
    kind: 'task',
    label: 'Add to Tasks',
    taskText: 'Review airport codes',
  });

  expect(task.text).toBe('Review airport codes');
  expect(task.completed).toBe(false);
});

it('creates structured helpers for action suggestions', () => {
  expect(createSuggestedTaskAction('Review service sequence')).toEqual({
    kind: 'task',
    label: 'Add to Tasks',
    taskText: 'Review service sequence',
  });

  expect(
    createSuggestedCalendarAction({
      title: 'Mock exam',
      type: 'exam',
      date: '2099-08-01',
      time: '14:00',
      note: 'Terminal procedures',
    })
  ).toEqual({
    kind: 'calendar',
    label: 'Add to Calendar',
    event: {
      title: 'Mock exam',
      type: 'exam',
      date: '2099-08-01',
      time: '14:00',
      note: 'Terminal procedures',
    },
  });
});
```

- [ ] **Step 2: Run the helper test file to verify it fails**

Run: `npm test -- src/lib/chatCoach.test.ts`
Expected: FAIL with missing export errors for mode and action helpers

- [ ] **Step 3: Implement the minimal helper changes**

Update `src/lib/chatCoach.ts` to add these new types and helpers after the existing message types:

```ts
export type ChatCoachMode = 'gentle' | 'strict' | 'exam';

export interface StoredTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskActionSuggestion {
  kind: 'task';
  label: string;
  taskText: string;
}

export interface CalendarActionSuggestion {
  kind: 'calendar';
  label: string;
  event: {
    title: string;
    type: 'exam' | 'birthday' | 'reminder' | 'task' | 'other';
    date: string;
    time: string;
    note: string;
  };
}

export type ChatCoachSuggestedAction = TaskActionSuggestion | CalendarActionSuggestion;

export const CHAT_COACH_MODE_KEY = 'study-me-chat-coach-mode';
export const TASKS_STORAGE_KEY = 'study-me-tasks';

export const loadChatCoachMode = (): ChatCoachMode => {
  const saved = localStorage.getItem(CHAT_COACH_MODE_KEY);
  return saved === 'strict' || saved === 'exam' || saved === 'gentle' ? saved : 'gentle';
};

export const saveChatCoachMode = (mode: ChatCoachMode) => {
  localStorage.setItem(CHAT_COACH_MODE_KEY, mode);
};

export const getRecommendedCoachMode = (
  currentModule: string,
  latestUserMessage: string
): ChatCoachMode => {
  const text = latestUserMessage.toLowerCase();

  if (
    currentModule === 'exams' ||
    /quiz|review|exam|test|recall|finals/.test(text)
  ) {
    return 'exam';
  }

  if (/procrastinat|lazy|discipline|strict|push me/.test(text)) {
    return 'strict';
  }

  return 'gentle';
};

export const isTaskActionSuggestion = (
  value: unknown
): value is TaskActionSuggestion => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as TaskActionSuggestion;
  return candidate.kind === 'task' && typeof candidate.label === 'string' && typeof candidate.taskText === 'string';
};

export const isCalendarActionSuggestion = (
  value: unknown
): value is CalendarActionSuggestion => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as CalendarActionSuggestion;
  return (
    candidate.kind === 'calendar' &&
    typeof candidate.label === 'string' &&
    !!candidate.event &&
    typeof candidate.event.title === 'string' &&
    typeof candidate.event.type === 'string' &&
    typeof candidate.event.date === 'string' &&
    typeof candidate.event.time === 'string' &&
    typeof candidate.event.note === 'string'
  );
};

export const createSuggestedTaskAction = (taskText: string): TaskActionSuggestion => ({
  kind: 'task',
  label: 'Add to Tasks',
  taskText,
});

export const createSuggestedCalendarAction = (
  event: CalendarActionSuggestion['event']
): CalendarActionSuggestion => ({
  kind: 'calendar',
  label: 'Add to Calendar',
  event,
});

export const buildTaskFromSuggestion = (
  suggestion: TaskActionSuggestion
): StoredTask => ({
  id: Date.now().toString(),
  text: suggestion.taskText.trim(),
  completed: false,
});
```

- [ ] **Step 4: Re-run the helper test file to verify it passes**

Run: `npm test -- src/lib/chatCoach.test.ts`
Expected: PASS for the existing tests plus the new mode/action tests

- [ ] **Step 5: Commit the helper-layer upgrade**

```bash
git add src/lib/chatCoach.ts src/lib/chatCoach.test.ts
git commit -m "feat(chatbot): add premium coach helper logic"
```

### Task 2: Add Premium Coach UI Building Blocks

**Files:**
- Create: `src/components/chat-coach/ModeSwitcher.tsx`
- Create: `src/components/chat-coach/ActionCard.tsx`
- Create: `src/components/chat-coach/ConfirmationSheet.tsx`
- Create: `src/components/chat-coach/ModeSwitcher.test.tsx`
- Create: `src/components/chat-coach/ActionCard.test.tsx`
- Create: `src/components/chat-coach/ConfirmationSheet.test.tsx`

- [ ] **Step 1: Write the failing UI building-block tests**

Create `src/components/chat-coach/ModeSwitcher.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModeSwitcher } from './ModeSwitcher';

describe('ModeSwitcher', () => {
  it('renders all three modes and notifies on change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ModeSwitcher activeMode="gentle" recommendedMode="exam" onChange={onChange} />);

    expect(screen.getByRole('button', { name: /gentle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /strict/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exam mode/i })).toBeInTheDocument();
    expect(screen.getByText(/recommended: exam mode/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /strict/i }));
    expect(onChange).toHaveBeenCalledWith('strict');
  });
});
```

Create `src/components/chat-coach/ActionCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionCard } from './ActionCard';

describe('ActionCard', () => {
  it('renders task suggestion content and review button', async () => {
    const user = userEvent.setup();
    const onReview = vi.fn();

    render(
      <ActionCard
        action={{ kind: 'task', label: 'Add to Tasks', taskText: 'Review meal service steps' }}
        onReview={onReview}
      />
    );

    expect(screen.getByText(/review meal service steps/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /review task/i }));
    expect(onReview).toHaveBeenCalled();
  });
});
```

Create `src/components/chat-coach/ConfirmationSheet.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmationSheet } from './ConfirmationSheet';

describe('ConfirmationSheet', () => {
  it('shows read-only task confirmation content and confirm button', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmationSheet
        action={{ kind: 'task', label: 'Add to Tasks', taskText: 'Review passenger announcements' }}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText(/review passenger announcements/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm save/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the new building-block tests to verify they fail**

Run: `npm test -- src/components/chat-coach/ModeSwitcher.test.tsx src/components/chat-coach/ActionCard.test.tsx src/components/chat-coach/ConfirmationSheet.test.tsx`
Expected: FAIL with missing component module errors

- [ ] **Step 3: Implement the minimal UI building blocks**

Create `src/components/chat-coach/ModeSwitcher.tsx`:

```tsx
import type { ChatCoachMode } from '../../lib/chatCoach';

interface ModeSwitcherProps {
  activeMode: ChatCoachMode;
  recommendedMode: ChatCoachMode;
  onChange: (mode: ChatCoachMode) => void;
}

const LABELS: Record<ChatCoachMode, string> = {
  gentle: 'Gentle',
  strict: 'Strict',
  exam: 'Exam Mode',
};

export function ModeSwitcher({ activeMode, recommendedMode, onChange }: ModeSwitcherProps) {
  return (
    <div>
      <div className="inline-flex rounded-full border border-white/30 bg-white/10 p-1 backdrop-blur-xl">
        {(['gentle', 'strict', 'exam'] as ChatCoachMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`rounded-full px-3 py-2 text-xs font-medium transition ${
              activeMode === mode ? 'bg-white text-black' : 'text-white/80'
            }`}
            aria-label={LABELS[mode]}
          >
            {LABELS[mode]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-white/70">Recommended: {LABELS[recommendedMode]}</p>
    </div>
  );
}
```

Create `src/components/chat-coach/ActionCard.tsx`:

```tsx
import {
  isCalendarActionSuggestion,
  type ChatCoachSuggestedAction,
} from '../../lib/chatCoach';

interface ActionCardProps {
  action: ChatCoachSuggestedAction;
  onReview: () => void;
}

export function ActionCard({ action, onReview }: ActionCardProps) {
  return (
    <div className="mt-3 rounded-3xl border border-white/20 bg-white/10 p-4 text-sm text-white shadow-lg backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">{action.label}</p>
      {isCalendarActionSuggestion(action) ? (
        <>
          <p className="mt-2 font-medium">{action.event.title}</p>
          <p className="mt-1 text-white/70">
            {action.event.type} · {action.event.date} at {action.event.time}
          </p>
          <button type="button" onClick={onReview} className="mt-3 rounded-full bg-white px-4 py-2 text-black">
            Review Event
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 font-medium">{action.taskText}</p>
          <button type="button" onClick={onReview} className="mt-3 rounded-full bg-white px-4 py-2 text-black">
            Review Task
          </button>
        </>
      )}
    </div>
  );
}
```

Create `src/components/chat-coach/ConfirmationSheet.tsx`:

```tsx
import {
  isCalendarActionSuggestion,
  type ChatCoachSuggestedAction,
} from '../../lib/chatCoach';

interface ConfirmationSheetProps {
  action: ChatCoachSuggestedAction;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationSheet({ action, onConfirm, onCancel }: ConfirmationSheetProps) {
  return (
    <div className="rounded-[28px] border border-white/30 bg-black/70 p-5 text-white shadow-2xl backdrop-blur-2xl">
      <p className="text-xs uppercase tracking-[0.24em] text-white/60">Review Before Save</p>
      {isCalendarActionSuggestion(action) ? (
        <div className="mt-4 space-y-2 text-sm">
          <p><span className="text-white/60">Title:</span> {action.event.title}</p>
          <p><span className="text-white/60">Type:</span> {action.event.type}</p>
          <p><span className="text-white/60">Date:</span> {action.event.date}</p>
          <p><span className="text-white/60">Time:</span> {action.event.time}</p>
          <p><span className="text-white/60">Note:</span> {action.event.note}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm">{action.taskText}</p>
      )}
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onConfirm} className="rounded-full bg-white px-4 py-2 text-black">
          Confirm Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-white/30 px-4 py-2 text-white">
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Re-run the building-block tests to verify they pass**

Run: `npm test -- src/components/chat-coach/ModeSwitcher.test.tsx src/components/chat-coach/ActionCard.test.tsx src/components/chat-coach/ConfirmationSheet.test.tsx`
Expected: PASS for all three new component tests

- [ ] **Step 5: Commit the coach UI building blocks**

```bash
git add src/components/chat-coach/ModeSwitcher.tsx src/components/chat-coach/ActionCard.tsx src/components/chat-coach/ConfirmationSheet.tsx src/components/chat-coach/ModeSwitcher.test.tsx src/components/chat-coach/ActionCard.test.tsx src/components/chat-coach/ConfirmationSheet.test.tsx
git commit -m "feat(chatbot): add premium coach ui building blocks"
```

### Task 3: Expand ChatCoach Integration Tests

**Files:**
- Modify: `src/components/ChatCoach.test.tsx`

- [ ] **Step 1: Write the failing integration tests for modes and confirmation actions**

Append these tests to `src/components/ChatCoach.test.tsx`:

```tsx
it('persists the selected mode and sends it with the chat request', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      reply: {
        id: 'assistant-3',
        role: 'assistant',
        content: 'Let us move with strict precision, captain.',
        createdAt: '2026-07-03T12:03:00.000Z',
      },
    }),
  });

  vi.stubGlobal('fetch', fetchMock);

  render(<ChatCoach currentModule="dashboard" />);

  await user.click(screen.getByRole('button', { name: /open study coach/i }));
  await user.click(screen.getByRole('button', { name: /strict/i }));
  await user.type(screen.getByLabelText(/message study coach/i), 'Push me to study');
  await user.click(screen.getByRole('button', { name: /send message/i }));

  expect(localStorage.getItem('study-me-chat-coach-mode')).toBe('strict');
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/chat-coach',
    expect.objectContaining({
      body: expect.stringContaining('"mode":"strict"'),
    })
  );
});

it('renders a task action card and saves after confirmation', async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: {
          id: 'assistant-4',
          role: 'assistant',
          content: 'Let us lock in one concrete task.',
          createdAt: '2026-07-03T12:04:00.000Z',
        },
        suggestedAction: {
          kind: 'task',
          label: 'Add to Tasks',
          taskText: 'Review emergency equipment checks',
        },
      }),
    })
  );

  render(<ChatCoach currentModule="tasks" />);

  await user.click(screen.getByRole('button', { name: /open study coach/i }));
  await user.click(screen.getByRole('button', { name: /motivate me to study/i }));
  await user.click(await screen.findByRole('button', { name: /review task/i }));
  await user.click(screen.getByRole('button', { name: /confirm save/i }));

  const savedTasks = JSON.parse(localStorage.getItem('study-me-tasks') ?? '[]');
  expect(savedTasks[0].text).toBe('Review emergency equipment checks');
  expect(await screen.findByText(/added to daily tasks/i)).toBeInTheDocument();
});

it('renders a calendar action card and saves after confirmation', async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: {
          id: 'assistant-5',
          role: 'assistant',
          content: 'I prepared your review session as a calendar event.',
          createdAt: '2026-07-03T12:05:00.000Z',
        },
        suggestedAction: {
          kind: 'calendar',
          label: 'Add to Calendar',
          event: {
            title: 'Mock exam review',
            type: 'exam',
            date: '2099-07-05',
            time: '15:30',
            note: 'Cabin procedures',
          },
        },
      }),
    })
  );

  render(<ChatCoach currentModule="calendar" />);

  await user.click(screen.getByRole('button', { name: /open study coach/i }));
  await user.click(screen.getByRole('button', { name: /help me plan tonight/i }));
  await user.click(await screen.findByRole('button', { name: /review event/i }));
  await user.click(screen.getByRole('button', { name: /confirm save/i }));

  const savedEvents = JSON.parse(localStorage.getItem('study-me-calendar-events') ?? '[]');
  expect(savedEvents[0].title).toBe('Mock exam review');
  expect(await screen.findByText(/added to calendar/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the expanded coach integration test file to verify it fails**

Run: `npm test -- src/components/ChatCoach.test.tsx`
Expected: FAIL because mode UI and structured action handling are not implemented yet

- [ ] **Step 3: Implement the premium integration in `ChatCoach.tsx`**

Update `src/components/ChatCoach.tsx` to adopt this structure:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import type { ModuleId } from './Dashboard';
import { ActionCard } from './chat-coach/ActionCard';
import { ConfirmationSheet } from './chat-coach/ConfirmationSheet';
import { ModeSwitcher } from './chat-coach/ModeSwitcher';
import { saveCalendarEvents, loadCalendarEvents } from '../lib/calendar';
import {
  buildCoachNudge,
  buildTaskFromSuggestion,
  createChatCoachMessage,
  getRecommendedCoachMode,
  isCalendarActionSuggestion,
  isTaskActionSuggestion,
  loadChatCoachHistory,
  loadChatCoachMode,
  loadChatCoachOpenState,
  loadLastCoachNudge,
  saveChatCoachHistory,
  saveChatCoachMode,
  saveChatCoachOpenState,
  saveLastCoachNudge,
  shouldTriggerCoachNudge,
  trimChatCoachHistory,
  type ChatCoachMessage,
  type ChatCoachMode,
  type ChatCoachSuggestedAction,
} from '../lib/chatCoach';

interface ChatCoachProps {
  currentModule: ModuleId;
}

interface ChatCoachResponse {
  reply: ChatCoachMessage;
  suggestedAction?: ChatCoachSuggestedAction;
}

export function ChatCoach({ currentModule }: ChatCoachProps) {
  const [isOpen, setIsOpen] = useState(() => loadChatCoachOpenState());
  const [messages, setMessages] = useState<ChatCoachMessage[]>(() => loadChatCoachHistory());
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasUnreadNudge, setHasUnreadNudge] = useState(false);
  const [idleSignal, setIdleSignal] = useState(0);
  const [mode, setMode] = useState<ChatCoachMode>(() => loadChatCoachMode());
  const [suggestedAction, setSuggestedAction] = useState<ChatCoachSuggestedAction | null>(null);
  const [reviewAction, setReviewAction] = useState<ChatCoachSuggestedAction | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const latestUserText = [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';
  const recommendedMode = useMemo(
    () => getRecommendedCoachMode(currentModule, latestUserText || input),
    [currentModule, latestUserText, input]
  );

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
    saveChatCoachMode(mode);
  }, [mode]);

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
    if (currentModule !== 'dashboard') {
      return;
    }
    const timer = queueNudge(1200);
    return () => {
      if (timer) window.clearTimeout(timer);
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
      if (timer) window.clearTimeout(timer);
    };
  }, [idleSignal, isOpen]);

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
    setSuggestedAction(null);
  };

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    const userMessage = createChatCoachMessage('user', trimmed);
    const nextHistory = trimChatCoachHistory([...messages, userMessage]);

    setMessages(nextHistory);
    setInput('');
    setIsSending(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/chat-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextHistory, mode, currentModule }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const data = (await response.json()) as ChatCoachResponse;
      setMessages((current) => trimChatCoachHistory([...current, data.reply]));
      setSuggestedAction(
        isTaskActionSuggestion(data.suggestedAction) || isCalendarActionSuggestion(data.suggestedAction)
          ? data.suggestedAction
          : null
      );
    } catch (error) {
      console.error('Failed to send coach message', error);
      appendAssistantFallback();
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmAction = () => {
    if (!reviewAction) return;

    let confirmationText = 'Saved successfully.';

    if (isTaskActionSuggestion(reviewAction)) {
      const savedTasks = JSON.parse(localStorage.getItem('study-me-tasks') ?? '[]');
      const nextTasks = [...savedTasks, buildTaskFromSuggestion(reviewAction)];
      localStorage.setItem('study-me-tasks', JSON.stringify(nextTasks));
      confirmationText = 'Added to Daily Tasks.';
    }

    if (isCalendarActionSuggestion(reviewAction)) {
      const currentEvents = loadCalendarEvents();
      const nextEvents = [
        ...currentEvents,
        {
          id: Date.now().toString(),
          title: reviewAction.event.title,
          type: reviewAction.event.type,
          date: reviewAction.event.date,
          time: reviewAction.event.time,
          note: reviewAction.event.note,
        },
      ];
      saveCalendarEvents(nextEvents);
      confirmationText = 'Added to Calendar.';
    }

    setStatusMessage(confirmationText);

    setMessages((current) =>
      trimChatCoachHistory([
        ...current,
        createChatCoachMessage('assistant', confirmationText),
      ])
    );
    setReviewAction(null);
    setSuggestedAction(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Study Coach"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/80 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl"
      >
        <MessageCircle className="h-5 w-5" />
        {hasUnreadNudge && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-white ring-2 ring-black" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className="fixed bottom-24 right-6 z-50 w-[min(27rem,calc(100vw-2rem))] overflow-hidden rounded-[32px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl"
          >
            <div className="border-b border-white/15 px-5 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/60">Study Coach</p>
                  <h2 className="mt-2 text-lg font-semibold">Cabin Briefing</h2>
                  <p className="mt-1 text-sm text-white/70">Premium study guidance, captain.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Study Coach"
                  className="rounded-full border border-white/15 bg-white/5 p-2 text-white/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <ModeSwitcher activeMode={mode} recommendedMode={recommendedMode} onChange={setMode} />
              </div>
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <div className="rounded-3xl bg-white/10 p-4 text-sm text-white/80">
                  Captain, welcome aboard. Tell me what you need help studying today.
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-3xl bg-white px-4 py-3 text-sm text-black'
                      : 'max-w-[85%] rounded-3xl bg-white/10 px-4 py-3 text-sm text-white'
                  }
                >
                  {message.content}
                </div>
              ))}

              {suggestedAction && <ActionCard action={suggestedAction} onReview={() => setReviewAction(suggestedAction)} />}
              {statusMessage && <p className="text-sm text-white/70">{statusMessage}</p>}
            </div>

            <div className="border-t border-white/15 px-5 py-4">
              {reviewAction && (
                <div className="mb-4">
                  <ConfirmationSheet action={reviewAction} onConfirm={handleConfirmAction} onCancel={() => setReviewAction(null)} />
                </div>
              )}

              <div className="mb-3 flex flex-wrap gap-2">
                {['Motivate me to study', 'What should I study next?', 'Help me plan tonight', 'Quiz me on this topic'].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/80"
                    aria-label={prompt}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-3 w-3" />
                      {prompt}
                    </span>
                  </button>
                ))}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(input);
                }}
                className="flex items-end gap-3"
              >
                <label htmlFor="chat-coach-input" className="sr-only">
                  Message Study Coach
                </label>
                <textarea
                  id="chat-coach-input"
                  aria-label="Message Study Coach"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask for motivation, a study plan, or a calendar suggestion."
                  rows={2}
                  className="min-h-[76px] flex-1 resize-none rounded-3xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
                />
                <button
                  type="submit"
                  aria-label="Send Message"
                  disabled={isSending}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black disabled:opacity-50"
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

- [ ] **Step 4: Re-run the expanded integration test file to verify it passes**

Run: `npm test -- src/components/ChatCoach.test.tsx`
Expected: PASS for the existing tests plus the new mode and confirmation-flow tests

- [ ] **Step 5: Commit the integrated premium coach shell**

```bash
git add src/components/ChatCoach.tsx src/components/ChatCoach.test.tsx
git commit -m "feat(chatbot): add premium coach shell"
```

### Task 4: Make The Backend Mode-Aware And Action-Aware

**Files:**
- Modify: `server.ts`

- [ ] **Step 1: Add failing backend-oriented UI assertions to `ChatCoach.test.tsx`**

Add this test after the new mode test:

```tsx
it('ignores malformed action payloads and only renders the reply text', async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: {
          id: 'assistant-6',
          role: 'assistant',
          content: 'Stay on course, captain.',
          createdAt: '2026-07-03T12:06:00.000Z',
        },
        suggestedAction: {
          kind: 'task',
          label: 'Add to Tasks',
        },
      }),
    })
  );

  render(<ChatCoach currentModule="dashboard" />);

  await user.click(screen.getByRole('button', { name: /open study coach/i }));
  await user.click(screen.getByRole('button', { name: /motivate me to study/i }));

  expect(await screen.findByText(/Stay on course, captain/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /review task/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the coach integration test file to verify the malformed payload test fails**

Run: `npm test -- src/components/ChatCoach.test.tsx`
Expected: FAIL because the route/UI path does not yet validate structured action payloads consistently

- [ ] **Step 3: Update `server.ts` to accept mode and current module**

Replace the current chat route block in `server.ts` with:

```ts
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

      const lines = replyText.split("\n").map((line) => line.trim()).filter(Boolean);
      const actionLine = [...lines].reverse().find((line) => line.startsWith("ACTION_TASK:") || line.startsWith("ACTION_CALENDAR:"));
      const cleanContent = lines.filter((line) => line !== actionLine).join("\n").trim();

      let suggestedAction: unknown;

      if (actionLine?.startsWith("ACTION_TASK:")) {
        const taskText = actionLine.replace("ACTION_TASK:", "").trim();
        if (taskText) {
          suggestedAction = {
            kind: "task",
            label: "Add to Tasks",
            taskText,
          };
        }
      }

      if (actionLine?.startsWith("ACTION_CALENDAR:")) {
        const raw = actionLine.replace("ACTION_CALENDAR:", "").trim();
        const [title, type, date, time, note] = raw.split("|").map((value) => value?.trim() ?? "");
        if (title && type && date && time) {
          suggestedAction = {
            kind: "calendar",
            label: "Add to Calendar",
            event: {
              title,
              type,
              date,
              time,
              note,
            },
          };
        }
      }

      res.json({
        reply: {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: cleanContent || replyText,
          createdAt: new Date().toISOString(),
        },
        suggestedAction,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to generate chat response" });
    }
  });
```

- [ ] **Step 4: Re-run the coach integration test file to verify it passes**

Run: `npm test -- src/components/ChatCoach.test.tsx`
Expected: PASS including the malformed payload safeguard test

- [ ] **Step 5: Commit the backend upgrade**

```bash
git add server.ts src/components/ChatCoach.test.tsx
git commit -m "feat(chatbot): add mode-aware coach responses"
```

### Task 5: Run Full Verification And Finish

**Files:**
- Modify: `src/lib/chatCoach.ts`
- Modify: `src/lib/chatCoach.test.ts`
- Create: `src/components/chat-coach/ModeSwitcher.tsx`
- Create: `src/components/chat-coach/ActionCard.tsx`
- Create: `src/components/chat-coach/ConfirmationSheet.tsx`
- Create: `src/components/chat-coach/ModeSwitcher.test.tsx`
- Create: `src/components/chat-coach/ActionCard.test.tsx`
- Create: `src/components/chat-coach/ConfirmationSheet.test.tsx`
- Modify: `src/components/ChatCoach.tsx`
- Modify: `src/components/ChatCoach.test.tsx`
- Modify: `server.ts`

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`
Expected: PASS for the existing calendar, dashboard, and coach tests plus the new premium upgrade tests

- [ ] **Step 2: Run the full type-check**

Run: `npm run lint`
Expected: `tsc --noEmit` exits successfully

- [ ] **Step 3: Perform the final manual smoke check**

Run the dev server:

```bash
npm run dev
```

Verify manually in the browser:

- the coach still appears on every page
- the premium panel opens with the redesigned frosted-glass look
- switching between `Gentle`, `Strict`, and `Exam Mode` updates the selected mode
- a recommendation hint appears when context changes between `Dashboard`, `Tasks`, `Calendar`, and `Exams`
- sending a message can return a normal reply without breaking the UI
- a task suggestion shows a `Review Task` flow and only saves after confirmation
- a calendar suggestion shows a `Review Event` flow and only saves after confirmation
- saved tasks appear in `Daily Tasks`
- saved events appear in `Calendar`
- the exam generator still works after the route prompt changes

- [ ] **Step 4: Commit the finished premium upgrade**

```bash
git add src/lib/chatCoach.ts src/lib/chatCoach.test.ts src/components/chat-coach/ModeSwitcher.tsx src/components/chat-coach/ActionCard.tsx src/components/chat-coach/ConfirmationSheet.tsx src/components/chat-coach/ModeSwitcher.test.tsx src/components/chat-coach/ActionCard.test.tsx src/components/chat-coach/ConfirmationSheet.test.tsx src/components/ChatCoach.tsx src/components/ChatCoach.test.tsx server.ts
git commit -m "feat(chatbot): add premium coach upgrade"
```
