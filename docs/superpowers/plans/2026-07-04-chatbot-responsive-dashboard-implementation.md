# Chatbot Responsive Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated chatbot dashboard and make the floating Study Coach responsive on every screen size while keeping both surfaces synced to the same conversation history, mode, and action-review state.

**Architecture:** Split the current all-in-one `ChatCoach.tsx` into a shared chat state layer plus two shells: a compact floating coach and a full-page chatbot dashboard. Extend app navigation with a new chatbot module, reuse the same `localStorage`-backed conversation state in both surfaces, and keep the existing `/api/chat-coach` request flow and review-first action workflow intact.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Tailwind CSS, motion/react

---

## File Structure

- Modify: `src/App.tsx`
  - Register a new chatbot module route and keep the floating coach globally mounted.
- Modify: `src/components/Dashboard.tsx`
  - Extend `ModuleId` and add an entry point into the dedicated chatbot dashboard.
- Modify: `src/components/ChatCoach.tsx`
  - Reduce it to a floating shell that consumes shared chatbot state and shared content UI.
- Create: `src/components/ChatDashboard.tsx`
  - Full-page chatbot dashboard module with responsive layout and shared chat content.
- Create: `src/components/chat-coach/ChatCoachPanel.tsx`
  - Reusable chat panel UI used by both floating and full-page shells.
- Create: `src/components/chat-coach/useChatCoachController.ts`
  - Shared controller for chat state, send flow, persistence, modes, suggested actions, and review flow.
- Modify: `src/components/ChatCoach.test.tsx`
  - Refocus tests on floating shell behavior and shared controller integration.
- Create: `src/components/ChatDashboard.test.tsx`
  - Verify dedicated page rendering, shared history, and shared mode continuity.

## Task 1: Introduce Dedicated Chatbot Routing Tests

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/ChatCoach.test.tsx`
- Create: `src/components/ChatDashboard.test.tsx`

- [ ] **Step 1: Write the failing dedicated-page tests**

Create `src/components/ChatDashboard.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';

describe('ChatDashboard', () => {
  it('opens the dedicated chatbot page from app navigation and keeps the floating launcher visible', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.click(screen.getByRole('button', { name: /open full coach/i }));

    expect(await screen.findByRole('heading', { name: /study coach cockpit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open study coach/i })).toBeInTheDocument();
  });

  it('reuses persisted history inside the dedicated chatbot page', async () => {
    localStorage.setItem(
      'study-me-chat-coach-history',
      JSON.stringify([
        {
          id: 'assistant-seeded',
          role: 'assistant',
          content: 'Seeded shared history',
          createdAt: '2026-07-04T12:00:00.000Z',
        },
      ])
    );

    render(<App />);

    expect(await screen.findByText(/Seeded shared history/i)).toBeInTheDocument();
  });
});
```

Update `src/components/ChatCoach.test.tsx` with a new failing test:

```tsx
it('shows an open full coach action inside the floating chatbot', async () => {
  const user = userEvent.setup();

  render(<ChatCoach currentModule="dashboard" />);

  await user.click(screen.getByRole('button', { name: /open study coach/i }));

  expect(screen.getByRole('button', { name: /open full coach/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the new dedicated chatbot tests to verify failure**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
```

Expected:

```text
FAIL  src/components/ChatDashboard.test.tsx
Unable to find an accessible element with the role "heading" and name /study coach cockpit/i
```

- [ ] **Step 3: Commit the routing test checkpoint**

Run:

```bash
git add src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
git commit -m "test(chatbot): cover dedicated dashboard entry points"
```

## Task 2: Add The Dedicated Chatbot Module Skeleton

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Dashboard.tsx`
- Create: `src/components/ChatDashboard.tsx`
- Test: `src/components/ChatDashboard.test.tsx`
- Test: `src/components/ChatCoach.test.tsx`

- [ ] **Step 1: Extend module routing**

Update `src/components/Dashboard.tsx`:

```ts
export type ModuleId =
  | 'dashboard'
  | 'subjects'
  | 'tasks'
  | 'exams'
  | 'languages'
  | 'finance'
  | 'diary'
  | 'calendar'
  | 'chat';
```

Update `src/App.tsx` imports:

```ts
import { ChatDashboard } from './components/ChatDashboard';
```

Add the module render branch:

```tsx
{currentModule === 'chat' && <ChatDashboard onNavigate={setCurrentModule} currentModule={currentModule} />}
```

- [ ] **Step 2: Create the minimal dedicated chatbot page**

Create `src/components/ChatDashboard.tsx`:

```tsx
import { ArrowLeft } from 'lucide-react';
import type { ModuleId } from './Dashboard';

interface ChatDashboardProps {
  onNavigate: (module: ModuleId) => void;
  currentModule: ModuleId;
}

export function ChatDashboard({ onNavigate }: ChatDashboardProps) {
  return (
    <div className="min-h-screen bg-white px-6 py-8 text-black md:px-10">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Flight Deck
        </button>
      </div>

      <section className="mx-auto mt-8 w-full max-w-6xl rounded-[32px] border border-black/10 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
        <header className="border-b border-black/5 px-6 py-6 md:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Study Coach</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Study Coach Cockpit</h1>
          <p className="mt-3 max-w-2xl text-sm text-neutral-500 md:text-base">
            Your full conversation dashboard for planning, review, and study actions.
          </p>
        </header>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Add a temporary entry point in the floating coach**

Inside `src/components/ChatCoach.tsx`, add a button near the mode switcher:

```tsx
<button
  type="button"
  onClick={onOpenFullCoach}
  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/85"
>
  <Sparkles className="h-3 w-3" />
  Open Full Coach
</button>
```

Also update the component props:

```ts
interface ChatCoachProps {
  currentModule: ModuleId;
  onOpenFullCoach?: () => void;
}
```

And default the callback:

```ts
export function ChatCoach({ currentModule, onOpenFullCoach = () => {} }: ChatCoachProps) {
```

Pass it from `src/App.tsx`:

```tsx
<ChatCoach currentModule={currentModule} onOpenFullCoach={() => setCurrentModule('chat')} />
```

- [ ] **Step 4: Run the dedicated chatbot tests to verify they pass**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
```

Expected:

```text
PASS  src/components/ChatCoach.test.tsx
PASS  src/components/ChatDashboard.test.tsx
```

- [ ] **Step 5: Commit the module skeleton**

Run:

```bash
git add src/App.tsx src/components/Dashboard.tsx src/components/ChatCoach.tsx src/components/ChatDashboard.tsx src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
git commit -m "feat(chatbot): add dedicated chatbot dashboard shell"
```

## Task 3: Extract Shared Chat Controller

**Files:**
- Create: `src/components/chat-coach/useChatCoachController.ts`
- Modify: `src/components/ChatCoach.tsx`
- Modify: `src/components/ChatDashboard.tsx`
- Modify: `src/components/ChatCoach.test.tsx`
- Modify: `src/components/ChatDashboard.test.tsx`

- [ ] **Step 1: Write the failing shared-state test**

Add this test to `src/components/ChatDashboard.test.tsx`:

```tsx
it('shares selected mode between the floating coach and the dedicated chatbot page', async () => {
  const user = userEvent.setup();

  render(<App />);

  await user.click(screen.getByRole('button', { name: /open study coach/i }));
  await user.click(screen.getByRole('button', { name: /strict/i }));
  await user.click(screen.getByRole('button', { name: /open full coach/i }));

  expect(await screen.findByRole('button', { name: /strict/i })).toHaveAttribute('aria-pressed', 'true');
});
```

Expected failure reason: the dedicated page does not yet render shared mode-aware chat UI.

- [ ] **Step 2: Create the shared controller hook**

Create `src/components/chat-coach/useChatCoachController.ts`:

```ts
import { useEffect, useMemo, useState } from 'react';
import { buildApiUrl, parseApiJson } from '../../lib/api';
import { loadCalendarEvents, saveCalendarEvents } from '../../lib/calendar';
import {
  buildCoachNudge,
  buildTaskFromSuggestion,
  createChatCoachMessage,
  getRecommendedCoachMode,
  isCalendarActionSuggestion,
  isTaskActionSuggestion,
  loadChatCoachHistory,
  loadChatCoachMode,
  loadLastCoachNudge,
  saveChatCoachHistory,
  saveChatCoachMode,
  saveLastCoachNudge,
  shouldTriggerCoachNudge,
  TASKS_STORAGE_KEY,
  trimChatCoachHistory,
  type ChatCoachMessage,
  type ChatCoachMode,
  type ChatCoachSuggestedAction,
} from '../../lib/chatCoach';
import type { ModuleId } from '../Dashboard';

interface ChatCoachResponse {
  reply: ChatCoachMessage;
  suggestedAction?: unknown;
}

export function useChatCoachController(currentModule: ModuleId) {
  const [messages, setMessages] = useState<ChatCoachMessage[]>(() => loadChatCoachHistory());
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [mode, setMode] = useState<ChatCoachMode>(() => loadChatCoachMode());
  const [suggestedAction, setSuggestedAction] = useState<ChatCoachSuggestedAction | null>(null);
  const [reviewAction, setReviewAction] = useState<ChatCoachSuggestedAction | null>(null);

  const latestUserText = [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';
  const recommendedMode = useMemo(
    () => getRecommendedCoachMode(currentModule, latestUserText || input),
    [currentModule, latestUserText, input]
  );

  useEffect(() => {
    saveChatCoachHistory(messages);
  }, [messages]);

  useEffect(() => {
    saveChatCoachMode(mode);
  }, [mode]);

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

    try {
      const response = await fetch(buildApiUrl('/api/chat-coach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextHistory, mode, currentModule }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const data = await parseApiJson<ChatCoachResponse>(
        response,
        'The study coach service is unavailable right now.'
      );

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

  const confirmAction = () => {
    if (!reviewAction) return;

    let confirmationText = 'Saved successfully.';

    if (isTaskActionSuggestion(reviewAction)) {
      const savedTasks = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) ?? '[]');
      const nextTasks = [...savedTasks, buildTaskFromSuggestion(reviewAction)];
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(nextTasks));
      confirmationText = 'Added to Daily Tasks.';
    }

    if (isCalendarActionSuggestion(reviewAction)) {
      const currentEvents = loadCalendarEvents();
      saveCalendarEvents([
        ...currentEvents,
        {
          id: Date.now().toString(),
          title: reviewAction.event.title,
          type: reviewAction.event.type,
          date: reviewAction.event.date,
          time: reviewAction.event.time,
          note: reviewAction.event.note,
        },
      ]);
      confirmationText = 'Added to Calendar.';
    }

    setMessages((current) =>
      trimChatCoachHistory([...current, createChatCoachMessage('assistant', confirmationText)])
    );
    setReviewAction(null);
    setSuggestedAction(null);
  };

  return {
    input,
    isSending,
    messages,
    mode,
    recommendedMode,
    reviewAction,
    suggestedAction,
    setInput,
    setMode,
    setReviewAction,
    sendMessage,
    confirmAction,
  };
}
```

- [ ] **Step 3: Update both surfaces to consume the shared controller**

In `src/components/ChatCoach.tsx`, remove duplicated chat state and replace it with:

```ts
const {
  input,
  isSending,
  messages,
  mode,
  recommendedMode,
  reviewAction,
  suggestedAction,
  setInput,
  setMode,
  setReviewAction,
  sendMessage,
  confirmAction,
} = useChatCoachController(currentModule);
```

In `src/components/ChatDashboard.tsx`, add the same shared controller call and render mode-aware content using it.

- [ ] **Step 4: Run the dedicated chatbot tests to verify shared-state behavior passes**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
```

Expected:

```text
PASS  src/components/ChatCoach.test.tsx
PASS  src/components/ChatDashboard.test.tsx
```

- [ ] **Step 5: Commit the shared controller extraction**

Run:

```bash
git add src/components/ChatCoach.tsx src/components/ChatDashboard.tsx src/components/chat-coach/useChatCoachController.ts src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
git commit -m "refactor(chatbot): share state across floating and dashboard views"
```

## Task 4: Extract Reusable Chat Panel UI

**Files:**
- Create: `src/components/chat-coach/ChatCoachPanel.tsx`
- Modify: `src/components/ChatCoach.tsx`
- Modify: `src/components/ChatDashboard.tsx`
- Modify: `src/components/ChatCoach.test.tsx`
- Modify: `src/components/ChatDashboard.test.tsx`

- [ ] **Step 1: Write the failing shared-panel continuity test**

Add this test to `src/components/ChatDashboard.test.tsx`:

```tsx
it('keeps the same seeded conversation visible when switching from floating to dedicated view', async () => {
  const user = userEvent.setup();

  localStorage.setItem(
    'study-me-chat-coach-history',
    JSON.stringify([
      {
        id: 'assistant-history',
        role: 'assistant',
        content: 'Continue from this shared thread.',
        createdAt: '2026-07-04T12:10:00.000Z',
      },
    ])
  );

  render(<App />);

  await user.click(screen.getByRole('button', { name: /open study coach/i }));
  await user.click(screen.getByRole('button', { name: /open full coach/i }));

  expect(await screen.findAllByText(/Continue from this shared thread./i)).not.toHaveLength(0);
});
```

- [ ] **Step 2: Create the reusable panel component**

Create `src/components/chat-coach/ChatCoachPanel.tsx`:

```tsx
import { type FormEvent, useEffect, useRef } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { ActionCard } from './ActionCard';
import { ConfirmationSheet } from './ConfirmationSheet';
import { ModeSwitcher } from './ModeSwitcher';
import { CHAT_COACH_QUICK_PROMPTS, type ChatCoachMessage, type ChatCoachMode, type ChatCoachSuggestedAction } from '../../lib/chatCoach';

interface ChatCoachPanelProps {
  input: string;
  isSending: boolean;
  messages: ChatCoachMessage[];
  mode: ChatCoachMode;
  recommendedMode: ChatCoachMode;
  reviewAction: ChatCoachSuggestedAction | null;
  suggestedAction: ChatCoachSuggestedAction | null;
  title?: string;
  subtitle: string;
  onInputChange: (value: string) => void;
  onModeChange: (mode: ChatCoachMode) => void;
  onReviewAction: (action: ChatCoachSuggestedAction | null) => void;
  onConfirmAction: () => void;
  onSendMessage: (content: string) => Promise<void> | void;
  headerSlot?: React.ReactNode;
  className?: string;
}

export function ChatCoachPanel({
  input,
  isSending,
  messages,
  mode,
  recommendedMode,
  reviewAction,
  suggestedAction,
  title = 'Cabin Briefing',
  subtitle,
  onInputChange,
  onModeChange,
  onReviewAction,
  onConfirmAction,
  onSendMessage,
  headerSlot,
  className = '',
}: ChatCoachPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      bottomAnchorRef.current?.scrollIntoView({ behavior: isSending ? 'smooth' : 'auto', block: 'end' });
      if (!bottomAnchorRef.current && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, isSending, suggestedAction, reviewAction]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSendMessage(input);
  };

  return (
    <div className={className}>
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-xs uppercase tracking-[0.32em] text-white/60">Study Coach</p>
        <h2 className="mt-2 text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-white/70">{subtitle}</p>
        <div className="mt-4">
          <ModeSwitcher activeMode={mode} recommendedMode={recommendedMode} onChange={onModeChange} />
        </div>
        {headerSlot}
      </div>

      <div ref={scrollContainerRef} className="max-h-80 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="rounded-3xl bg-white/10 p-4 text-sm text-white/85">
            Captain, welcome aboard. Tell me what you need help studying today.
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'ml-auto max-w-[85%] rounded-3xl bg-white px-4 py-3 text-sm text-black'
                : 'max-w-[85%] rounded-3xl bg-white/12 px-4 py-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
            }
          >
            {message.content}
          </div>
        ))}

        {suggestedAction && <ActionCard action={suggestedAction} onReview={() => onReviewAction(suggestedAction)} />}

        {isSending && (
          <div className="max-w-[85%] rounded-3xl bg-white/12 px-4 py-3 text-sm text-white/70">
            Preparing your next instruction...
          </div>
        )}

        <div ref={bottomAnchorRef} aria-hidden="true" className="h-px w-full" />
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        {reviewAction && (
          <div className="mb-4">
            <ConfirmationSheet action={reviewAction} onConfirm={onConfirmAction} onCancel={() => onReviewAction(null)} />
          </div>
        )}

        <div className="mb-3 flex flex-wrap gap-2">
          {CHAT_COACH_QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void onSendMessage(prompt)}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white/85"
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
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Ask for motivation, a study plan, or a calendar suggestion."
            rows={2}
            className="min-h-[76px] flex-1 resize-none rounded-3xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/55"
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
    </div>
  );
}
```

- [ ] **Step 3: Replace duplicated UI with the shared panel**

Update the floating shell to render:

```tsx
<ChatCoachPanel
  input={input}
  isSending={isSending}
  messages={messages}
  mode={mode}
  recommendedMode={recommendedMode}
  reviewAction={reviewAction}
  suggestedAction={suggestedAction}
  subtitle={isSending ? 'Preparing your next instruction...' : 'Premium study guidance, captain.'}
  onInputChange={setInput}
  onModeChange={setMode}
  onReviewAction={setReviewAction}
  onConfirmAction={confirmAction}
  onSendMessage={sendMessage}
  headerSlot={
    <button
      type="button"
      onClick={onOpenFullCoach}
      className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/85"
    >
      <Sparkles className="h-3 w-3" />
      Open Full Coach
    </button>
  }
/>
```

Update `ChatDashboard.tsx` to render the same panel with a dashboard-specific wrapper and no floating close button.

- [ ] **Step 4: Run the focused chatbot tests**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
```

Expected:

```text
PASS  src/components/ChatCoach.test.tsx
PASS  src/components/ChatDashboard.test.tsx
```

- [ ] **Step 5: Commit the shared panel extraction**

Run:

```bash
git add src/components/ChatCoach.tsx src/components/ChatDashboard.tsx src/components/chat-coach/ChatCoachPanel.tsx src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
git commit -m "refactor(chatbot): share panel ui across chat surfaces"
```

## Task 5: Make The Floating Chat Responsive

**Files:**
- Modify: `src/components/ChatCoach.tsx`
- Test: `src/components/ChatCoach.test.tsx`

- [ ] **Step 1: Write the failing floating responsiveness test**

Add this test to `src/components/ChatCoach.test.tsx`:

```tsx
it('renders the floating chatbot shell with a full-width mobile-safe layout class', async () => {
  const user = userEvent.setup();

  render(<ChatCoach currentModule="dashboard" />);

  await user.click(screen.getByRole('button', { name: /open study coach/i }));

  const shell = screen.getByRole('dialog', { name: /study coach panel/i });
  expect(shell.className).toMatch(/inset-x-3/);
});
```

- [ ] **Step 2: Update the floating shell layout**

Wrap the floating panel with a more responsive shell in `src/components/ChatCoach.tsx`:

```tsx
<motion.section
  role="dialog"
  aria-label="Study Coach Panel"
  initial={{ opacity: 0, y: 18, scale: 0.98 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: 18, scale: 0.98 }}
  className="fixed inset-x-3 bottom-3 top-auto z-50 overflow-hidden rounded-[28px] border border-slate-900/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.82))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[min(27rem,calc(100vw-2rem))]"
>
```

Also constrain the internal panel for mobile height:

```tsx
<ChatCoachPanel
  className="flex max-h-[min(82vh,40rem)] flex-col"
  ...
/>
```

- [ ] **Step 3: Run the floating coach tests**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx
```

Expected:

```text
PASS  src/components/ChatCoach.test.tsx
```

- [ ] **Step 4: Commit the responsive floating shell**

Run:

```bash
git add src/components/ChatCoach.tsx src/components/ChatCoach.test.tsx
git commit -m "feat(chatbot): make floating coach responsive"
```

## Task 6: Build The Dedicated Chatbot Dashboard Layout

**Files:**
- Modify: `src/components/ChatDashboard.tsx`
- Modify: `src/components/Dashboard.tsx`
- Test: `src/components/ChatDashboard.test.tsx`

- [ ] **Step 1: Write the failing dashboard CTA test**

Add this test to `src/components/ChatDashboard.test.tsx`:

```tsx
it('opens the chatbot dashboard from a dashboard entry point', async () => {
  const user = userEvent.setup();

  render(<App />);

  await user.click(screen.getByRole('button', { name: /open coach cockpit/i }));

  expect(await screen.findByRole('heading', { name: /study coach cockpit/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Add the dashboard entry point**

In `src/components/Dashboard.tsx`, add a CTA button near the top-level actions:

```tsx
<button
  type="button"
  onClick={() => onNavigate('chat')}
  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-black shadow-sm"
>
  <Plane className="h-4 w-4" />
  Open Coach Cockpit
</button>
```

- [ ] **Step 3: Expand `ChatDashboard.tsx` into the dedicated page**

Replace the temporary section with:

```tsx
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { ChatCoachPanel } from './chat-coach/ChatCoachPanel';
import { useChatCoachController } from './chat-coach/useChatCoachController';
import type { ModuleId } from './Dashboard';

interface ChatDashboardProps {
  onNavigate: (module: ModuleId) => void;
  currentModule: ModuleId;
}

export function ChatDashboard({ onNavigate, currentModule }: ChatDashboardProps) {
  const {
    input,
    isSending,
    messages,
    mode,
    recommendedMode,
    reviewAction,
    suggestedAction,
    setInput,
    setMode,
    setReviewAction,
    sendMessage,
    confirmAction,
  } = useChatCoachController(currentModule);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.06),transparent_50%),#ffffff] px-4 py-6 text-black sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Flight Deck
          </button>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
          <div className="overflow-hidden rounded-[32px] border border-slate-900/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.85))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.18)]">
            <ChatCoachPanel
              input={input}
              isSending={isSending}
              messages={messages}
              mode={mode}
              recommendedMode={recommendedMode}
              reviewAction={reviewAction}
              suggestedAction={suggestedAction}
              title="Study Coach Cockpit"
              subtitle="A full briefing space for study planning, focus, and action review."
              onInputChange={setInput}
              onModeChange={setMode}
              onReviewAction={setReviewAction}
              onConfirmAction={confirmAction}
              onSendMessage={sendMessage}
              className="flex min-h-[70vh] flex-col"
            />
          </div>

          <aside className="rounded-[32px] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight">Coach Overview</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-500">
              Continue your shared conversation here with more room for reading, planning, and action review.
            </p>
            <div className="mt-6 space-y-3 text-sm text-neutral-600">
              <div className="rounded-2xl bg-neutral-50 p-4">Shared history stays synced with the floating coach.</div>
              <div className="rounded-2xl bg-neutral-50 p-4">Mode changes apply everywhere.</div>
              <div className="rounded-2xl bg-neutral-50 p-4">Task and calendar suggestions still require confirmation before saving.</div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the dashboard tests**

Run:

```bash
npm test -- src/components/ChatDashboard.test.tsx
```

Expected:

```text
PASS  src/components/ChatDashboard.test.tsx
```

- [ ] **Step 5: Commit the dedicated dashboard**

Run:

```bash
git add src/components/Dashboard.tsx src/components/ChatDashboard.tsx src/components/ChatDashboard.test.tsx
git commit -m "feat(chatbot): add dedicated coach cockpit page"
```

## Task 7: Verify End-To-End Behavior

**Files:**
- Modify: `src/App.tsx` if a small integration fix is needed
- Modify: `src/components/ChatCoach.tsx` if a small integration fix is needed
- Modify: `src/components/ChatDashboard.tsx` if a small integration fix is needed
- Test: `src/components/ChatCoach.test.tsx`
- Test: `src/components/ChatDashboard.test.tsx`

- [ ] **Step 1: Run the focused chatbot tests together**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
```

Expected:

```text
PASS  src/components/ChatCoach.test.tsx
PASS  src/components/ChatDashboard.test.tsx
```

- [ ] **Step 2: Run project type-checking**

Run:

```bash
npm run lint
```

Expected:

```text
> react-example@0.0.0 lint
> tsc --noEmit
```

- [ ] **Step 3: Start the app for manual responsive verification**

Run:

```bash
npm run dev
```

Expected:

```text
Server running on http://localhost:3000
```

- [ ] **Step 4: Manually verify both surfaces**

Use this checklist:

```text
1. Open the floating coach on desktop and confirm it still works.
2. Shrink to a mobile viewport and confirm the floating shell becomes easier to use.
3. Click "Open Full Coach" and confirm the dedicated chatbot page opens.
4. Confirm existing history is visible in the dedicated page.
5. Change modes in one surface and verify the other surface reflects the same mode.
6. Send a message in the floating coach, then open the dedicated page and confirm the message is there.
7. Send a message in the dedicated page, then reopen the floating coach and confirm continuity.
8. Trigger a suggested action and verify the confirmation flow still works before saving.
```

- [ ] **Step 5: Commit any tiny integration polish if needed**

If no follow-up is required, skip this step.

If a tiny fix is required, run:

```bash
git add src/App.tsx src/components/ChatCoach.tsx src/components/ChatDashboard.tsx src/components/chat-coach/ChatCoachPanel.tsx src/components/chat-coach/useChatCoachController.ts src/components/Dashboard.tsx src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
git commit -m "fix(chatbot): polish responsive shared chat flow"
```

## Self-Review

- Spec coverage:
  - Floating coach remains global: covered in Tasks 2, 5, and 7.
  - Dedicated chatbot dashboard: covered in Tasks 2 and 6.
  - Shared history and shared mode: covered in Tasks 3 and 4.
  - Responsive behavior: covered in Task 5 and manual verification in Task 7.
  - Review-first action flow: retained in Tasks 3, 4, and 7.
- Placeholder scan:
  - No `TBD`, `TODO`, or vague “handle this” language remains.
- Type consistency:
  - `ChatDashboard`, `ChatCoachPanel`, and `useChatCoachController` are used consistently throughout the plan.
