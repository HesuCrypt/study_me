# Chatbot Card Entry Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chatbot's awkward top dashboard button with a proper Study Coach module card near Diary and restyle the dedicated chatbot page so it feels like the app's other module pages, especially Exams.

**Architecture:** Keep the existing shared chatbot controller and floating coach behavior, but simplify the app entry and page presentation. The dashboard becomes the main structured entry through a new `Study Coach` module card in the module grid, while the dedicated chatbot page is refactored from a premium cockpit layout into a cleaner card-based module layout that matches the surrounding app design language.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Tailwind CSS, motion/react

---

## File Structure

- Modify: `src/components/Dashboard.tsx`
  - Remove the `Open Coach Cockpit` header button and add a new `Study Coach` card in the module grid near `Diary`.
- Modify: `src/components/ChatDashboard.tsx`
  - Restyle the dedicated chatbot page into a cleaner module-style card layout closer to `ExamCreator`.
- Modify: `src/components/ChatDashboard.test.tsx`
  - Replace header-button navigation coverage with dashboard-card navigation coverage and add page layout assertions.
- Modify: `src/components/ChatCoach.test.tsx`
  - Remove the mobile-shell specific test that is no longer central to the feature direction.

## Task 1: Replace The Header CTA With A Dashboard Module Card

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/components/ChatDashboard.test.tsx`

- [ ] **Step 1: Write the failing dashboard-card tests**

Update `src/components/ChatDashboard.test.tsx`:

```tsx
  it('opens the chatbot dashboard from the new Study Coach module card', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /study coach/i }));

    expect(await screen.findByRole('heading', { name: /study coach cockpit/i })).toBeInTheDocument();
  });

  it('does not render the removed open coach cockpit header button on the dashboard', () => {
    render(<App />);

    expect(screen.queryByRole('button', { name: /open coach cockpit/i })).not.toBeInTheDocument();
  });
```

Remove the old test that clicks the `Open Coach Cockpit` header button.

- [ ] **Step 2: Run the dedicated chatbot tests to verify failure**

Run:

```bash
npm test -- src/components/ChatDashboard.test.tsx
```

Expected:

```text
FAIL  src/components/ChatDashboard.test.tsx
Unable to find an accessible element with the role "button" and name /study coach/i
```

- [ ] **Step 3: Remove the header CTA and add the Study Coach card**

Update the dashboard header actions in `src/components/Dashboard.tsx` by deleting:

```tsx
          <button
            type="button"
            onClick={() => onNavigate('chat')}
            className="inline-flex h-14 items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 text-sm font-semibold text-black shadow-sm transition-all hover:-translate-y-1 hover:border-black hover:shadow-lg"
          >
            <Plane className="h-4 w-4" />
            Open Coach Cockpit
          </button>
```

Add the chatbot module entry inside the existing module array near `Diary`:

```tsx
              {[
                { id: 'subjects', title: 'Subjects', desc: 'Tourism & Aviation', icon: BookOpen },
                { id: 'tasks', title: 'Daily Tasks', desc: 'Checklist', icon: Calendar },
                { id: 'exams', title: 'Mock Exams', desc: 'Quiz Generator', icon: BookMarked },
                { id: 'calendar', title: 'Calendar', desc: 'Events & Notes', icon: Bell },
                { id: 'finance', title: 'Finance', desc: 'Layover Budget', icon: Wallet },
                { id: 'diary', title: 'Diary', desc: 'Personal Notes', icon: Plane },
                { id: 'chat', title: 'Study Coach', desc: 'AI Briefing', icon: MessageCircle },
              ].map((item, idx) => (
```

Also update imports:

```tsx
import { Plane, Calendar, CheckCircle2, ChevronRight, BookOpen, Wallet, BookMarked, Activity, Focus, Play, Pause, RotateCcw, Bell, AlertCircle, Clock, Download, Upload, Settings, X, MessageCircle } from 'lucide-react';
```

- [ ] **Step 4: Run the dashboard-card tests to verify they pass**

Run:

```bash
npm test -- src/components/ChatDashboard.test.tsx
```

Expected:

```text
PASS  src/components/ChatDashboard.test.tsx
```

- [ ] **Step 5: Commit the dashboard entry refresh**

Run:

```bash
git add src/components/Dashboard.tsx src/components/ChatDashboard.test.tsx
git commit -m "feat(chatbot): move coach entry into dashboard cards"
```

## Task 2: Remove The Mobile-Shell-Specific Regression Test

**Files:**
- Modify: `src/components/ChatCoach.test.tsx`

- [ ] **Step 1: Delete the obsolete mobile-shell test**

Remove this test from `src/components/ChatCoach.test.tsx`:

```tsx
  it('renders the floating chatbot shell with a full-width mobile-safe layout class', async () => {
    const user = userEvent.setup();

    render(<ChatCoach currentModule="dashboard" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));

    const shell = screen.getByRole('dialog', { name: /study coach panel/i });
    expect(shell.className).toMatch(/inset-x-3/);
  });
```

- [ ] **Step 2: Run the floating chatbot tests**

Run:

```bash
npm test -- src/components/ChatCoach.test.tsx
```

Expected:

```text
PASS  src/components/ChatCoach.test.tsx
```

- [ ] **Step 3: Commit the test cleanup**

Run:

```bash
git add src/components/ChatCoach.test.tsx
git commit -m "test(chatbot): remove mobile shell specific assertion"
```

## Task 3: Restyle The Dedicated Chatbot Page Into A Module Layout

**Files:**
- Modify: `src/components/ChatDashboard.tsx`
- Modify: `src/components/ChatDashboard.test.tsx`

- [ ] **Step 1: Write the failing module-layout test**

Add this test to `src/components/ChatDashboard.test.tsx`:

```tsx
  it('renders the chatbot page as a module-style layout with a main chat card and support card', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /study coach/i }));

    expect(await screen.findByText(/study coach module/i)).toBeInTheDocument();
    expect(screen.getByText(/coach overview/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the dedicated chatbot tests to verify failure**

Run:

```bash
npm test -- src/components/ChatDashboard.test.tsx
```

Expected:

```text
FAIL  src/components/ChatDashboard.test.tsx
Unable to find an element with the text /study coach module/i
```

- [ ] **Step 3: Refine `ChatDashboard.tsx` into an Exams-style module page**

Update the page header area in `src/components/ChatDashboard.tsx`:

```tsx
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-12"
      >
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Flight Deck
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-neutral-400">
          <MessageCircle className="w-4 h-4" />
          Study Coach Module
        </div>
      </motion.div>
```

Replace the main page wrapper with a cleaner module structure:

```tsx
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-20 min-h-screen flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col"
      >
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Study Coach</h1>
            <p className="text-neutral-500">Your AI briefing space for study planning, focus, and review.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_20rem] gap-6">
          <section className="border border-neutral-200 bg-white shadow-sm overflow-hidden">
            {/* existing chat content goes here, restyled for light module surface */}
          </section>

          <aside className="border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight">Coach Overview</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-500">
              Continue your shared conversation here with more room for reading, planning, and action review.
            </p>
          </aside>
        </div>
      </motion.div>
    </div>
```

Inside the main chat card:

- keep the shared controller usage exactly as-is
- convert the dark cockpit styling to a cleaner module card style
- keep the mode switcher, chat history, quick prompts, review sheet, and send form
- preserve all current behavior and labels used by the tests

- [ ] **Step 4: Run the dedicated chatbot tests to verify the new module layout passes**

Run:

```bash
npm test -- src/components/ChatDashboard.test.tsx
```

Expected:

```text
PASS  src/components/ChatDashboard.test.tsx
```

- [ ] **Step 5: Commit the dedicated page restyle**

Run:

```bash
git add src/components/ChatDashboard.tsx src/components/ChatDashboard.test.tsx
git commit -m "feat(chatbot): restyle coach page as module card layout"
```

## Task 4: Verify Shared Chat Behavior Still Works

**Files:**
- Modify: `src/components/ChatDashboard.tsx` if any small fix is needed
- Modify: `src/components/ChatDashboard.test.tsx` if any small fix is needed
- Modify: `src/components/ChatCoach.tsx` if any small fix is needed
- Modify: `src/components/ChatCoach.test.tsx` if any small fix is needed

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

- [ ] **Step 2: Run TypeScript linting**

Run:

```bash
npm run lint
```

Expected:

```text
> react-example@0.0.0 lint
> tsc --noEmit
```

- [ ] **Step 3: Manually verify the app flow**

Use this checklist:

```text
1. Open the dashboard and confirm the top "Open Coach Cockpit" button is gone.
2. Confirm a new "Study Coach" module card appears near "Diary".
3. Click the new Study Coach card and confirm the dedicated chatbot page opens.
4. Confirm the page feels like the Exams module rather than a full-screen cockpit.
5. Confirm the floating coach still opens from anywhere.
6. Send a message in the dedicated page and confirm the assistant reply renders.
7. Change modes in one surface and confirm the other surface reflects the same mode.
8. Trigger a suggestion and confirm the review-before-save flow still works.
```

- [ ] **Step 4: Commit any tiny integration polish if needed**

If no follow-up is required, skip this step.

If a tiny fix is required, run:

```bash
git add src/components/Dashboard.tsx src/components/ChatDashboard.tsx src/components/ChatDashboard.test.tsx src/components/ChatCoach.test.tsx src/components/ChatCoach.tsx
git commit -m "fix(chatbot): polish card-based coach entry and layout"
```

## Self-Review

- Spec coverage:
  - Removed top header chatbot CTA: covered in Task 1.
  - Added `Study Coach` card near `Diary`: covered in Task 1.
  - Dedicated page uses a cleaner module/card layout like Exams: covered in Task 3.
  - Floating coach remains available: preserved and verified in Task 4.
  - Shared history, shared modes, and review-first flow remain intact: covered in Tasks 3 and 4.
- Placeholder scan:
  - No `TBD`, `TODO`, or vague references remain.
- Type consistency:
  - `Study Coach`, `ChatDashboard`, and the existing shared controller names are used consistently throughout the plan.
