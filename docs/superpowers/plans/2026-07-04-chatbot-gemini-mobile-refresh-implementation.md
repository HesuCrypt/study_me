# Chatbot Gemini Mobile Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify both the floating Study Coach and the dedicated Study Coach page so mobile users get a cleaner, Gemini-like conversation flow while keeping the app's existing theme, shared chat state, and review-before-save behavior.

**Architecture:** Keep the existing shared `useChatCoachController()` in `App.tsx` as the single chat state source, then refactor the two rendered surfaces around reusable conversation pieces instead of duplicating stacked-card layouts. Build a shared thread component and a shared bottom composer dock, then apply a mobile-first layout in `ChatCoach.tsx` and `ChatDashboard.tsx` that uses minimal top chrome, a quieter welcome state, and a pinned bottom input area.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Tailwind CSS, motion/react, lucide-react

---

## File Structure

- Modify: `src/components/ChatCoach.tsx`
  - Replace the dense mobile floating panel with a mobile-first full-height coach surface that still collapses to a compact sheet on larger screens.
- Modify: `src/components/ChatDashboard.tsx`
  - Replace the current module-card-heavy mobile layout with a cleaner conversation-first screen and keep a stronger module treatment on larger breakpoints.
- Create: `src/components/chat-coach/ChatCoachThread.tsx`
  - Shared message list, empty-state hero, loading bubble, action card, and confirmation rendering.
- Create: `src/components/chat-coach/ChatComposerDock.tsx`
  - Shared quick-prompt rail plus pinned composer dock for both surfaces.
- Modify: `src/components/ChatCoach.test.tsx`
  - Add focused coverage for the simplified mobile shell and pinned composer behavior.
- Modify: `src/components/ChatDashboard.test.tsx`
  - Add focused coverage for the simplified dedicated page structure and the removal of the heavy support card from the primary mobile layout.

## Task 1: Lock The New Mobile UX With Failing Tests

**Files:**
- Modify: `src/components/ChatCoach.test.tsx`
- Modify: `src/components/ChatDashboard.test.tsx`

- [ ] **Step 1: Add the failing floating-coach layout tests**

Append these tests to `src/components/ChatCoach.test.tsx`:

```tsx
it('renders a simplified welcome state with a pinned composer when the floating coach opens', async () => {
  const user = userEvent.setup();

  render(<ChatCoach currentModule="dashboard" />);

  await user.click(screen.getByRole('button', { name: /open study coach/i }));

  expect(screen.getByRole('heading', { name: /what should we tackle today/i })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /study coach composer/i })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /study coach quick prompts/i })).toBeInTheDocument();
});

it('keeps the composer visible after the first assistant reply is rendered', async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      createJsonResponse({
        reply: {
          id: 'assistant-minimal-1',
          role: 'assistant',
          content: 'Start with your weakest topic for 20 focused minutes.',
          createdAt: '2026-07-04T18:00:00.000Z',
        },
      })
    )
  );

  render(<ChatCoach currentModule="dashboard" />);

  await user.click(screen.getByRole('button', { name: /open study coach/i }));
  await user.click(screen.getByRole('button', { name: /what should i study next/i }));

  expect(await screen.findByText(/start with your weakest topic/i)).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /study coach composer/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Add the failing dedicated-page simplification tests**

Append these tests to `src/components/ChatDashboard.test.tsx`:

```tsx
it('renders the dedicated page with a simplified conversation-first shell', async () => {
  const user = userEvent.setup();

  render(<App />);

  await user.click(screen.getByText(/^Study Coach$/i));

  expect(await screen.findByRole('heading', { name: /study coach/i })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /study coach conversation/i })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /study coach composer/i })).toBeInTheDocument();
});

it('does not render the old coach overview support card in the primary dedicated layout', async () => {
  const user = userEvent.setup();

  render(<App />);

  await user.click(screen.getByText(/^Study Coach$/i));

  expect(screen.queryByText(/coach overview/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run the focused chatbot tests to verify failure**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
```

Expected:

```text
FAIL  src/components/ChatCoach.test.tsx
Unable to find an accessible element with the role "heading" and name /what should we tackle today/i

FAIL  src/components/ChatDashboard.test.tsx
Expected the document not to contain text /coach overview/i
```

- [ ] **Step 4: Commit the failing-test checkpoint**

Run:

```bash
git add src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
git commit -m "test(chatbot): capture simplified mobile coach layout"
```

## Task 2: Extract A Shared Thread Component

**Files:**
- Create: `src/components/chat-coach/ChatCoachThread.tsx`
- Modify: `src/components/ChatCoach.tsx`
- Modify: `src/components/ChatDashboard.tsx`
- Test: `src/components/ChatCoach.test.tsx`
- Test: `src/components/ChatDashboard.test.tsx`

- [ ] **Step 1: Create the shared thread component**

Create `src/components/chat-coach/ChatCoachThread.tsx`:

```tsx
import { ActionCard } from './ActionCard';
import { ConfirmationSheet } from './ConfirmationSheet';
import type { ChatCoachSuggestedAction, ChatCoachMessage } from '../../lib/chatCoach';

interface ChatCoachThreadProps {
  messages: ChatCoachMessage[];
  isSending: boolean;
  suggestedAction: ChatCoachSuggestedAction | null;
  reviewAction: ChatCoachSuggestedAction | null;
  onReviewAction: (action: ChatCoachSuggestedAction | null) => void;
  onConfirmAction: () => void;
  bottomAnchorRef: React.RefObject<HTMLDivElement | null>;
  emptyTitle?: string;
  emptyBody?: string;
  surface: 'floating' | 'page';
}

export function ChatCoachThread({
  messages,
  isSending,
  suggestedAction,
  reviewAction,
  onReviewAction,
  onConfirmAction,
  bottomAnchorRef,
  emptyTitle = 'What should we tackle today?',
  emptyBody = 'Ask for a study plan, motivation, or a review suggestion and I will keep the path clear.',
  surface,
}: ChatCoachThreadProps) {
  const emptyShellClassName =
    surface === 'floating'
      ? 'flex min-h-[38vh] flex-col items-center justify-center px-6 text-center sm:min-h-0'
      : 'flex min-h-[44vh] flex-col items-center justify-center px-6 text-center lg:min-h-[28rem]';

  return (
    <div className="space-y-4">
      {messages.length === 0 && (
        <div className={emptyShellClassName}>
          <div className="max-w-md space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-current/45">Study Coach</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{emptyTitle}</h2>
            <p className="text-sm leading-6 text-current/65 sm:text-base">{emptyBody}</p>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={
            message.role === 'user'
              ? 'ml-auto max-w-[85%] rounded-[28px] bg-black px-4 py-3 text-sm text-white sm:max-w-[75%]'
              : 'max-w-[88%] rounded-[28px] border border-current/10 bg-white/80 px-4 py-3 text-sm text-current shadow-sm backdrop-blur sm:max-w-[75%]'
          }
        >
          {message.content}
        </div>
      ))}

      {suggestedAction && <ActionCard action={suggestedAction} onReview={() => onReviewAction(suggestedAction)} />}

      {reviewAction && (
        <ConfirmationSheet action={reviewAction} onConfirm={onConfirmAction} onCancel={() => onReviewAction(null)} />
      )}

      {isSending && (
        <div className="max-w-[88%] rounded-[28px] border border-current/10 bg-white/70 px-4 py-3 text-sm text-current/60 sm:max-w-[75%]">
          Thinking through your next study move...
        </div>
      )}

      <div ref={bottomAnchorRef} aria-hidden="true" className="h-px w-full" />
    </div>
  );
}
```

- [ ] **Step 2: Replace duplicated thread markup in both surfaces**

In `src/components/ChatCoach.tsx`, replace the current message list, action card, loading bubble, and confirmation block with:

```tsx
<div
  ref={scrollContainerRef}
  aria-label="Study Coach Conversation"
  role="region"
  className="flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-5"
>
  <ChatCoachThread
    messages={activeController.messages}
    isSending={activeController.isSending}
    suggestedAction={activeController.suggestedAction}
    reviewAction={activeController.reviewAction}
    onReviewAction={activeController.setReviewAction}
    onConfirmAction={activeController.confirmAction}
    bottomAnchorRef={bottomAnchorRef}
    surface="floating"
  />
</div>
```

In `src/components/ChatDashboard.tsx`, replace the current message list and review block with:

```tsx
<div
  ref={scrollContainerRef}
  aria-label="Study Coach Conversation"
  role="region"
  className="flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6 lg:px-8"
>
  <ChatCoachThread
    messages={activeController.messages}
    isSending={activeController.isSending}
    suggestedAction={activeController.suggestedAction}
    reviewAction={activeController.reviewAction}
    onReviewAction={activeController.setReviewAction}
    onConfirmAction={activeController.confirmAction}
    bottomAnchorRef={bottomAnchorRef}
    surface="page"
  />
</div>
```

- [ ] **Step 3: Run the focused tests**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
```

Expected:

```text
FAIL  src/components/ChatCoach.test.tsx
FAIL  src/components/ChatDashboard.test.tsx
```

The new thread component should compile, but the layout tests should still fail because the composer and surrounding shells are not simplified yet.

- [ ] **Step 4: Commit the shared-thread extraction**

Run:

```bash
git add src/components/chat-coach/ChatCoachThread.tsx src/components/ChatCoach.tsx src/components/ChatDashboard.tsx
git commit -m "refactor(chatbot): extract shared conversation thread"
```

## Task 3: Extract A Shared Bottom Composer Dock

**Files:**
- Create: `src/components/chat-coach/ChatComposerDock.tsx`
- Modify: `src/components/ChatCoach.tsx`
- Modify: `src/components/ChatDashboard.tsx`
- Test: `src/components/ChatCoach.test.tsx`
- Test: `src/components/ChatDashboard.test.tsx`

- [ ] **Step 1: Create the composer dock component**

Create `src/components/chat-coach/ChatComposerDock.tsx`:

```tsx
import { type FormEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { CHAT_COACH_QUICK_PROMPTS } from '../../lib/chatCoach';

interface ChatComposerDockProps {
  input: string;
  isSending: boolean;
  onInputChange: (value: string) => void;
  onSubmitMessage: (message: string) => Promise<void> | void;
  theme: 'dark' | 'light';
}

export function ChatComposerDock({
  input,
  isSending,
  onInputChange,
  onSubmitMessage,
  theme,
}: ChatComposerDockProps) {
  const dockClassName =
    theme === 'dark'
      ? 'border-t border-white/10 bg-[rgba(15,23,42,0.92)] text-white'
      : 'border-t border-black/8 bg-white/90 text-black';

  const promptClassName =
    theme === 'dark'
      ? 'border border-white/12 bg-white/8 text-white/85'
      : 'border border-black/10 bg-black/[0.03] text-black/75';

  const textareaClassName =
    theme === 'dark'
      ? 'border border-white/12 bg-white/8 text-white placeholder:text-white/45'
      : 'border border-black/10 bg-black/[0.03] text-black placeholder:text-black/35';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmitMessage(input);
  };

  return (
    <div role="region" aria-label="Study Coach Composer" className={`sticky bottom-0 px-4 pb-4 pt-3 backdrop-blur-xl sm:px-5 ${dockClassName}`}>
      <div role="region" aria-label="Study Coach Quick Prompts" className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {CHAT_COACH_QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void onSubmitMessage(prompt)}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium ${promptClassName}`}
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-3 w-3" />
              {prompt}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <label htmlFor="study-coach-composer" className="sr-only">
          Message Study Coach
        </label>
        <textarea
          id="study-coach-composer"
          aria-label="Message Study Coach"
          rows={1}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Ask for motivation, a study plan, or a calendar suggestion."
          className={`min-h-[64px] flex-1 resize-none rounded-[28px] px-4 py-4 text-sm outline-none ${textareaClassName}`}
        />
        <button
          type="submit"
          aria-label="Send Message"
          disabled={isSending}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Replace the old prompt-plus-form blocks**

In `src/components/ChatCoach.tsx`, replace the bottom prompt/form block with:

```tsx
<ChatComposerDock
  input={activeController.input}
  isSending={activeController.isSending}
  onInputChange={activeController.setInput}
  onSubmitMessage={activeController.sendMessage}
  theme="dark"
/>
```

In `src/components/ChatDashboard.tsx`, replace the bottom prompt/form block with:

```tsx
<ChatComposerDock
  input={activeController.input}
  isSending={activeController.isSending}
  onInputChange={activeController.setInput}
  onSubmitMessage={activeController.sendMessage}
  theme="light"
/>
```

- [ ] **Step 3: Run the focused chatbot tests**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
```

Expected:

```text
FAIL  src/components/ChatDashboard.test.tsx
```

At this point the composer-region assertions should pass, but the dedicated page should still fail until the large `Coach Overview` support card and heavy mobile header are removed.

- [ ] **Step 4: Commit the composer extraction**

Run:

```bash
git add src/components/chat-coach/ChatComposerDock.tsx src/components/ChatCoach.tsx src/components/ChatDashboard.tsx
git commit -m "refactor(chatbot): share bottom composer dock"
```

## Task 4: Simplify The Floating Study Coach Shell

**Files:**
- Modify: `src/components/ChatCoach.tsx`
- Test: `src/components/ChatCoach.test.tsx`

- [ ] **Step 1: Replace the floating shell with a mobile-first layout**

Update the `motion.section` in `src/components/ChatCoach.tsx`:

```tsx
<motion.section
  role="dialog"
  aria-label="Study Coach Panel"
  initial={{ opacity: 0, y: 18, scale: 0.98 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: 18, scale: 0.98 }}
  className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.88))] text-white sm:inset-x-auto sm:bottom-24 sm:right-6 sm:top-auto sm:h-[min(44rem,calc(100vh-8rem))] sm:w-[min(28rem,calc(100vw-2rem))] sm:rounded-[32px] sm:border sm:border-white/10 sm:shadow-[0_30px_90px_rgba(0,0,0,0.38)]"
>
```

Replace the current header with:

```tsx
<div className="px-4 pb-2 pt-5 sm:px-5 sm:pt-5">
  <div className="flex items-center justify-between">
    <p className="text-sm font-medium text-white/75">Study Coach</p>
    <button
      type="button"
      onClick={() => setIsOpen(false)}
      aria-label="Close Study Coach"
      className="rounded-full border border-white/12 bg-white/8 p-2 text-white/80"
    >
      <X className="h-4 w-4" />
    </button>
  </div>

  <div className="mt-4">
    <ModeSwitcher
      activeMode={activeController.mode}
      recommendedMode={activeController.recommendedMode}
      onChange={activeController.setMode}
    />
  </div>

  <button
    type="button"
    onClick={onOpenFullCoach}
    className="mt-3 inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
  >
    <Sparkles className="h-4 w-4" />
    Open Full Coach
  </button>
</div>
```

- [ ] **Step 2: Arrange the shell around the shared thread and composer**

The body of `ChatCoach.tsx` should become:

```tsx
<div className="flex min-h-0 flex-1 flex-col">
  <div
    ref={scrollContainerRef}
    aria-label="Study Coach Conversation"
    role="region"
    className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2 sm:px-5"
  >
    <ChatCoachThread
      messages={activeController.messages}
      isSending={activeController.isSending}
      suggestedAction={activeController.suggestedAction}
      reviewAction={activeController.reviewAction}
      onReviewAction={activeController.setReviewAction}
      onConfirmAction={activeController.confirmAction}
      bottomAnchorRef={bottomAnchorRef}
      surface="floating"
    />
  </div>

  <ChatComposerDock
    input={activeController.input}
    isSending={activeController.isSending}
    onInputChange={activeController.setInput}
    onSubmitMessage={activeController.sendMessage}
    theme="dark"
  />
</div>
```

- [ ] **Step 3: Run the floating-coach tests**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx
```

Expected:

```text
PASS  src/components/ChatCoach.test.tsx
```

- [ ] **Step 4: Commit the floating-shell refresh**

Run:

```bash
git add src/components/ChatCoach.tsx src/components/ChatCoach.test.tsx
git commit -m "feat(chatbot): simplify floating coach for mobile"
```

## Task 5: Simplify The Dedicated Study Coach Page

**Files:**
- Modify: `src/components/ChatDashboard.tsx`
- Modify: `src/components/ChatDashboard.test.tsx`

- [ ] **Step 1: Replace the heavy page shell with a conversation-first layout**

Update `src/components/ChatDashboard.tsx` to this structure:

```tsx
return (
  <div className="min-h-screen bg-[radial-gradient(circle_at_bottom,rgba(15,23,42,0.08),transparent_38%),#ffffff] text-black">
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-0 pt-4 sm:px-6 sm:pt-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-2 text-sm font-medium text-black/60 transition-colors hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Flight Deck
        </button>
        <p className="text-sm text-black/45">Study Coach</p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-black/8 bg-white/80 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:mt-6"
      >
        <div className="px-4 pb-2 pt-5 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Study Coach</h1>
            <p className="mt-2 text-sm leading-6 text-black/55 sm:text-base">
              Your shared study conversation, kept simple and ready whenever you need the next move.
            </p>
          </div>

          <div className="mt-4">
            <ModeSwitcher
              activeMode={activeController.mode}
              recommendedMode={activeController.recommendedMode}
              onChange={activeController.setMode}
            />
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          aria-label="Study Coach Conversation"
          role="region"
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2 sm:px-6 lg:px-8"
        >
          <ChatCoachThread
            messages={activeController.messages}
            isSending={activeController.isSending}
            suggestedAction={activeController.suggestedAction}
            reviewAction={activeController.reviewAction}
            onReviewAction={activeController.setReviewAction}
            onConfirmAction={activeController.confirmAction}
            bottomAnchorRef={bottomAnchorRef}
            surface="page"
            emptyBody="Ask for motivation, a review plan, or the next best topic to study and I will help you keep the day on course."
          />
        </div>

        <ChatComposerDock
          input={activeController.input}
          isSending={activeController.isSending}
          onInputChange={activeController.setInput}
          onSubmitMessage={activeController.sendMessage}
          theme="light"
        />
      </motion.section>
    </div>
  </div>
);
```

- [ ] **Step 2: Remove the old support-card assertions**

Update `src/components/ChatDashboard.test.tsx` so the module-layout test becomes:

```tsx
it('renders the dedicated page as a simplified conversation-first module', async () => {
  const user = userEvent.setup();

  render(<App />);

  await user.click(screen.getByText(/^Study Coach$/i));

  expect(await screen.findByRole('heading', { name: /^study coach$/i })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /study coach conversation/i })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /study coach composer/i })).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the dedicated-page tests**

Run:

```bash
npm test -- src/components/ChatDashboard.test.tsx
```

Expected:

```text
PASS  src/components/ChatDashboard.test.tsx
```

- [ ] **Step 4: Commit the page simplification**

Run:

```bash
git add src/components/ChatDashboard.tsx src/components/ChatDashboard.test.tsx
git commit -m "feat(chatbot): simplify dedicated study coach page"
```

## Task 6: Verify End-To-End Behavior

**Files:**
- Modify: `src/components/ChatCoach.tsx` if tiny polish is required
- Modify: `src/components/ChatDashboard.tsx` if tiny polish is required
- Modify: `src/components/chat-coach/ChatCoachThread.tsx` if tiny polish is required
- Modify: `src/components/chat-coach/ChatComposerDock.tsx` if tiny polish is required
- Test: `src/components/ChatCoach.test.tsx`
- Test: `src/components/ChatDashboard.test.tsx`

- [ ] **Step 1: Run all focused chatbot tests**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
```

Expected:

```text
PASS  src/components/ChatCoach.test.tsx
PASS  src/components/ChatDashboard.test.tsx
```

- [ ] **Step 2: Run the project type check**

Run:

```bash
npm run lint
```

Expected:

```text
> react-example@0.0.0 lint
> tsc --noEmit
```

- [ ] **Step 3: Start the app for manual mobile verification**

Run:

```bash
npm run dev
```

Expected:

```text
Server running on http://localhost:3000
```

- [ ] **Step 4: Manually verify both surfaces with a mobile viewport**

Use this checklist:

```text
1. Open the floating coach on a narrow mobile viewport.
2. Confirm it fills the screen cleanly and no longer feels like stacked cards.
3. Confirm the empty state leads with welcome copy and leaves the composer dock pinned at the bottom.
4. Send a quick prompt and confirm the reply appears without hiding the composer.
5. Tap "Open Full Coach" and confirm the dedicated page keeps the same conversation history.
6. Confirm the dedicated page no longer shows the old right-side support card as the main mobile presentation.
7. Confirm the mode switcher still works in both surfaces.
8. Trigger a suggested task or calendar action and confirm the review-first save flow still works.
```

- [ ] **Step 5: Commit any tiny follow-up polish**

If a small follow-up is needed, run:

```bash
git add src/components/ChatCoach.tsx src/components/ChatDashboard.tsx src/components/chat-coach/ChatCoachThread.tsx src/components/chat-coach/ChatComposerDock.tsx src/components/ChatCoach.test.tsx src/components/ChatDashboard.test.tsx
git commit -m "fix(chatbot): polish simplified mobile coach flow"
```

If no follow-up is needed, skip this step.

## Self-Review

- Spec coverage:
  - Floating coach remains global: covered in Tasks 2, 3, 4, and 6.
  - Dedicated chatbot page remains available from the module card: preserved in Task 5 and existing app navigation.
  - Shared history and shared mode: preserved because this plan keeps `App.tsx` and `useChatCoachController.ts` as the shared state layer.
  - Mobile Gemini-like simplification: covered in Tasks 1, 4, 5, and 6.
  - Existing theme retained: covered by the `dark` and `light` theme variants in Tasks 3, 4, and 5.
  - Review-before-save action flow: preserved in the shared thread component in Task 2 and verified in Task 6.
- Placeholder scan:
  - No `TBD`, `TODO`, or vague “handle later” steps remain.
- Type consistency:
  - `ChatCoachThread` and `ChatComposerDock` are named consistently across tasks, and both continue to consume the existing `ChatCoachController` shape.
