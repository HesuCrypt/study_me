# Chatbot Auto-Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the floating Study Coach pinned to the newest message so users always see the latest loading state and AI reply without manually scrolling down.

**Architecture:** Keep the change local to `src/components/ChatCoach.tsx` by adding a scroll container ref, a bottom anchor ref, and a single `scrollToLatest()` helper that runs whenever visible chat content changes. Validate the behavior in `src/components/ChatCoach.test.tsx` by mocking `scrollIntoView` and asserting it fires when the panel opens and when new conversation content is appended.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library

---

## File Structure

- Modify: `src/components/ChatCoach.tsx`
  - Add the scroll refs, helper, effect, and bottom anchor element.
- Modify: `src/components/ChatCoach.test.tsx`
  - Add focused scroll behavior tests using a mocked `scrollIntoView`.

### Task 1: Add Failing Scroll Behavior Tests

**Files:**
- Modify: `src/components/ChatCoach.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add these imports at the top if they are not already present:

```ts
import { act, render, screen, waitFor } from '@testing-library/react';
```

Add the scroll mock setup inside the existing `beforeEach` block:

```ts
const scrollIntoViewMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoViewMock,
  });
  scrollIntoViewMock.mockClear();
});
```

Add these two tests near the other `ChatCoach` behavior tests:

```ts
it('scrolls to the latest message when the chatbot opens', async () => {
  const user = userEvent.setup();

  localStorage.setItem(
    'study-me-chat-coach-history',
    JSON.stringify([
      {
        id: 'assistant-old',
        role: 'assistant',
        content: 'Older message',
        createdAt: '2026-07-04T12:00:00.000Z',
      },
      {
        id: 'assistant-new',
        role: 'assistant',
        content: 'Newest message',
        createdAt: '2026-07-04T12:01:00.000Z',
      },
    ])
  );

  render(<ChatCoach currentModule="dashboard" />);

  await user.click(screen.getByRole('button', { name: /open study coach/i }));

  await waitFor(() => {
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });
});

it('scrolls again when a new loading state and assistant reply are appended', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn().mockResolvedValue(
    createJsonResponse({
      reply: {
        id: 'assistant-scroll',
        role: 'assistant',
        content: 'Here is your latest reply, captain.',
        createdAt: '2026-07-04T12:02:00.000Z',
      },
    })
  );

  vi.stubGlobal('fetch', fetchMock);

  render(<ChatCoach currentModule="dashboard" />);

  await user.click(screen.getByRole('button', { name: /open study coach/i }));
  scrollIntoViewMock.mockClear();

  await user.type(screen.getByLabelText(/message study coach/i), 'Help me focus');
  await user.click(screen.getByRole('button', { name: /send message/i }));

  await waitFor(() => {
    expect(screen.getByText(/Here is your latest reply, captain./i)).toBeInTheDocument();
  });

  expect(scrollIntoViewMock).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the chatbot test file to verify it fails**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx
```

Expected:

```text
FAIL  src/components/ChatCoach.test.tsx
Expected "spy" to have been called at least once
```

- [ ] **Step 3: Commit the failing test checkpoint**

Run:

```bash
git add src/components/ChatCoach.test.tsx
git commit -m "test(chatbot): cover auto-scroll behavior"
```

### Task 2: Implement Auto-Scroll In ChatCoach

**Files:**
- Modify: `src/components/ChatCoach.tsx`
- Test: `src/components/ChatCoach.test.tsx`

- [ ] **Step 1: Add the refs and scroll helper**

Update the React import:

```ts
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
```

Inside `ChatCoach`, add the refs near the other state declarations:

```ts
const scrollContainerRef = useRef<HTMLDivElement | null>(null);
const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
```

Add the helper below the existing `subtitle` memo:

```ts
const scrollToLatest = (behavior: ScrollBehavior = 'smooth') => {
  if (bottomAnchorRef.current) {
    bottomAnchorRef.current.scrollIntoView({ behavior, block: 'end' });
    return;
  }

  if (scrollContainerRef.current) {
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }
};
```

- [ ] **Step 2: Add the effect that follows visible chat content**

Add this effect below the existing `subtitle` memo or just before `appendAssistantFallback`:

```ts
useEffect(() => {
  if (!isOpen) {
    return;
  }

  const behavior: ScrollBehavior = isSending ? 'smooth' : 'auto';
  const frame = window.requestAnimationFrame(() => {
    scrollToLatest(behavior);
  });

  return () => window.cancelAnimationFrame(frame);
}, [isOpen, messages, isSending, suggestedAction, reviewAction]);
```

This keeps the panel pinned to the newest content after React paints the updated message list, loading bubble, action card, or review sheet.

- [ ] **Step 3: Attach the refs in the JSX**

Update the scrollable message container:

```tsx
<div ref={scrollContainerRef} className="max-h-80 space-y-3 overflow-y-auto px-5 py-4">
```

Append a bottom anchor at the end of the message content, after the loading bubble:

```tsx
<div ref={bottomAnchorRef} aria-hidden="true" className="h-px w-full" />
```

The message area should look like this at the end:

```tsx
{isSending && (
  <div className="max-w-[85%] rounded-3xl bg-white/12 px-4 py-3 text-sm text-white/70">
    Preparing your next instruction...
  </div>
)}

<div ref={bottomAnchorRef} aria-hidden="true" className="h-px w-full" />
```

- [ ] **Step 4: Run the chatbot test file to verify it passes**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx
```

Expected:

```text
PASS  src/components/ChatCoach.test.tsx
```

- [ ] **Step 5: Run type-checking**

Run:

```bash
npm run lint
```

Expected:

```text
> react-example@0.0.0 lint
> tsc --noEmit
```

- [ ] **Step 6: Commit the implementation**

Run:

```bash
git add src/components/ChatCoach.tsx src/components/ChatCoach.test.tsx
git commit -m "fix(chatbot): keep study coach pinned to latest reply"
```

### Task 3: Verify The UX End-To-End

**Files:**
- Modify: `src/components/ChatCoach.tsx` if small follow-up polish is needed
- Test: `src/components/ChatCoach.test.tsx`

- [ ] **Step 1: Run the targeted chatbot test file again**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx
```

Expected:

```text
PASS  src/components/ChatCoach.test.tsx
```

- [ ] **Step 2: Start the app locally for manual verification**

Run:

```bash
npm run dev
```

Expected:

```text
Server running on http://localhost:3000
```

- [ ] **Step 3: Manually verify the scroll behavior**

Check this list in the browser:

```text
1. Open the Study Coach with existing chat history.
2. Confirm the newest message is visible immediately.
3. Send a new message.
4. Confirm your sent message stays visible at the bottom.
5. Confirm "Preparing your next instruction..." stays visible.
6. Confirm the assistant reply appears without needing manual scrolling.
7. If an action card appears, confirm it is also visible near the bottom.
```

- [ ] **Step 4: Commit any tiny verification-only adjustments if needed**

If no follow-up change is needed, skip this step.

If a tiny follow-up is needed, run:

```bash
git add src/components/ChatCoach.tsx src/components/ChatCoach.test.tsx
git commit -m "fix(chatbot): polish auto-scroll timing"
```

## Self-Review

- Spec coverage:
  - Auto-scroll on open: covered in Task 1 test and Task 2 effect.
  - Auto-scroll on send/loading/reply: covered in Task 1 second test and Task 2 effect dependencies.
  - Keep scope local to `ChatCoach.tsx`: covered in Task 2.
  - Focused testing: covered in Tasks 1 and 3.
- Placeholder scan:
  - No `TODO`, `TBD`, or vague implementation-only instructions remain.
- Type consistency:
  - `scrollContainerRef`, `bottomAnchorRef`, and `scrollToLatest()` are used consistently across the plan.
