# Chat Coach Premium Upgrade Design

## Summary

Upgrade the existing floating study coach into a more premium and more useful assistant. The new version should introduce a full glassmorphism-style panel redesign, a dual personality-mode system with both manual selection and smart recommendations, and confirmation-based quick actions that can turn coach suggestions into saved tasks or calendar events.

This upgrade should build on the current architecture instead of replacing it. The coach remains a global floating component, still uses the existing `/api/chat-coach` backend route, and still stores state locally. The new work expands the UI, the mode logic, and the action flow while keeping user data changes explicit and reviewable.

## Goals

- Redesign the coach into a richer premium glassmorphism experience.
- Add three coach modes:
  - `Gentle`
  - `Strict`
  - `Exam Mode`
- Support both:
  - manual mode switching
  - smart mode recommendations based on app context and conversation intent
- Add structured quick actions for:
  - adding a task
  - adding a calendar event
- Require a confirmation sheet before any task or calendar save.
- Keep the current floating, all-pages availability.
- Preserve the local-first architecture and existing chatbot behavior as the baseline.

## Non-Goals

- No autonomous writes without user confirmation.
- No direct editing or deletion of existing tasks or events from the coach in this version.
- No full planner dashboard embedded inside the chat panel.
- No voice input or voice output.
- No cloud sync or backend persistence for coach state.
- No replacement of the existing task or calendar pages.

## User Decisions Captured

- Personality modes: `Both`
  - manual switcher
  - smart recommendations
- Quick actions: `Review sheet first`
- Visual scope: `Full premium redesign`

## Product Behavior

### Premium Visual Direction

The coach should look more premium and more atmospheric than the current monochrome utility panel.

Design characteristics:

- frosted glass surface
- soft blur and translucent layering
- subtle gradients and highlights
- richer header treatment
- more polished button states
- smoother open, close, and sheet transitions

The result should still fit the app’s clean editorial look, but feel more elevated and Apple-style rather than flat utility UI.

### Personality Modes

The coach should support three distinct modes:

- `Gentle`
  - encouraging
  - calm
  - supportive
  - less confrontational
- `Strict`
  - more direct
  - more accountability-oriented
  - more forceful about staying on task
- `Exam Mode`
  - focused on review, recall, quiz framing, and study urgency

The coach keeps the same flight-attendant identity in all three modes, but the response style changes with the selected mode.

### Manual Plus Smart Recommendations

The mode system should behave in two ways:

- the user can always manually choose the active mode in the panel
- the app can recommend a better-fit mode based on context

The recommendation should never silently override the active mode. It should appear as a subtle suggestion, such as:

- a chip
- a small note near the mode selector
- a suggested-mode callout in the panel header

Example recommendation logic:

- `Exam Mode` when the user is in exam creation or asking for quiz help
- `Strict` when the user is procrastinating or asking for discipline
- `Gentle` for general planning, encouragement, or recovery after overwhelm

## Quick Actions

### Action Types

The coach can surface structured actions when appropriate:

- `Add to Tasks`
- `Add to Calendar`

These actions should be optional enhancements to the normal chat flow, not a required part of every response.

### Confirmation Sheet Requirement

No action should save immediately.

Tapping an action opens a review sheet first:

- for tasks:
  - suggested task text
- for calendar:
  - title
  - type
  - date
  - time
  - note

The user can:

- confirm
- cancel

The first implementation should keep the review sheet read-only. It is a confirmation surface, not an in-chat editing form.

## Data Integration

### Tasks

The task quick action should save into the same local storage key used by the existing task module:

- `study-me-tasks`

It should follow the current task shape already used in `DailyTasks.tsx`:

```ts
interface Task {
  id: string;
  text: string;
  completed: boolean;
}
```

### Calendar

The calendar quick action should save into the existing calendar storage flow and event shape already used by the calendar module.

It should produce data compatible with:

```ts
interface CalendarEvent {
  id: string;
  title: string;
  type: 'exam' | 'birthday' | 'reminder' | 'task' | 'other';
  date: string;
  time: string;
  note: string;
}
```

### Coach State

Extend local state persistence to cover:

- selected mode

Keep recommended mode and pending review-sheet payload in transient React state only for this version.

The current history, open-state, and nudge persistence should remain intact.

## Architecture

### Frontend Structure

Keep `ChatCoach.tsx` as the global shell, but split responsibilities more clearly so the component does not become too large.

Recommended unit structure:

- `ChatCoach.tsx`
  - floating launcher
  - panel shell
  - mode selector
  - message flow
  - action sheet orchestration
- helper extensions in `chatCoach.ts`
  - mode types
  - recommendation helpers
  - action payload types
  - local storage helpers for mode state
- focused UI subcomponents:
  - mode selector
  - action card
  - confirmation sheet

The exact split can stay lightweight, but boundaries should remain clear.

### Backend Structure

Reuse the current `POST /api/chat-coach` route.

Extend the request shape to include:

- active mode
- current module

The backend should use this information to alter prompt instructions and tone, while preserving the same base flight-attendant identity.

### Prompting Strategy

The existing shared prompt foundation should remain central.

The route should layer mode-specific instructions on top of the base system behavior:

- `Gentle`
  - supportive and calm
- `Strict`
  - direct and accountability-focused
- `Exam Mode`
  - quiz-oriented and review-driven

The prompt should still prevent the AI from claiming it has already changed tasks or calendar data without explicit confirmation and UI support.

## UX Design

### Launcher

The floating button should become more expressive while staying compact.

Possible improvements:

- subtle gradient or glass highlight
- premium shadow treatment
- stronger unread/nudge indicator
- smoother hover and open transitions

### Panel Layout

The upgraded panel should include:

- premium header
- mode switcher
- smart recommendation surface
- chat history
- quick prompts
- structured action cards when present
- confirmation sheet overlay or embedded review panel
- input composer

The panel should feel layered and premium, but still remain easy to scan and use quickly.

### Mode Switcher

The switcher should be clearly visible and fast to use.

Recommended form:

- segmented control for `Gentle`, `Strict`, `Exam Mode`

The currently active mode should be obvious at a glance.

### Smart Recommendation Surface

Recommendations should be subtle and assistive, not bossy.

Examples:

- `Recommended: Exam Mode for this session`
- `Strict mode may help you stay on track`

The user should be able to ignore the recommendation without friction.

### Action Cards

When the assistant suggests a saveable item, it should render a compact structured card beneath the relevant message.

Examples:

- task card:
  - label
  - suggested text
  - `Review Task` button
- calendar card:
  - title
  - type
  - date/time summary
  - `Review Event` button

### Confirmation Sheet

The sheet should feel like a premium mini form rather than a plain alert box.

For tasks:

- task text preview
- confirm button
- cancel button

For calendar:

- title
- type
- date
- time
- note
- confirm button
- cancel button

The sheet can appear:

- inside the panel as an expanded review layer
- or as an overlay anchored to the panel

Either is acceptable as long as it feels integrated and premium.

## Data Flow

### Chat Flow

1. User opens the coach
2. User chooses a mode or follows a recommendation
3. User sends a message
4. Frontend sends:
   - recent history
   - active mode
   - current module
5. Backend responds with:
   - assistant reply text
   - a structured suggested action payload only when a saveable task or calendar suggestion is clearly appropriate
6. Frontend renders the message
7. If an action payload exists, frontend renders an action card

### Task Action Flow

1. Assistant returns a task suggestion payload
2. User taps `Review Task`
3. Confirmation sheet opens with the suggested task text
4. User confirms
5. Frontend appends a new task to `study-me-tasks`
6. Frontend posts a local assistant confirmation message after a successful save

### Calendar Action Flow

1. Assistant returns a calendar suggestion payload
2. User taps `Review Event`
3. Confirmation sheet opens with event details
4. User confirms
5. Frontend saves the event through the existing calendar storage logic
6. Frontend posts a local assistant confirmation message after a successful save

## AI Response Shape

The route should continue supporting plain text replies, and the response format should also support structured action suggestions when the assistant proposes a concrete saveable item.

Recommended response shape:

```ts
interface ChatCoachApiResponse {
  reply: ChatCoachMessage;
  suggestedAction?: TaskActionSuggestion | CalendarActionSuggestion;
}
```

Recommended action payload shapes:

```ts
interface TaskActionSuggestion {
  kind: 'task';
  label: string;
  taskText: string;
}

interface CalendarActionSuggestion {
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
```

If the AI response does not contain a valid action payload, the coach should simply render the message text and continue normally.

## Error Handling

- If the AI route fails, keep the current fallback message behavior.
- If an action payload is malformed, ignore the action and render only the assistant text.
- If saving a task fails, show a lightweight inline error and do not mutate storage.
- If saving a calendar event fails, show a lightweight inline error and do not mutate storage.
- If mode persistence fails to parse, recover to the default mode cleanly.

## Testing Strategy

### Automated Tests

Add focused tests for:

- mode switching and persistence
- smart mode recommendation logic
- premium coach rendering still opening and closing correctly
- action card rendering from structured responses
- task confirmation saving into `study-me-tasks`
- calendar confirmation saving into calendar storage
- ignoring malformed action payloads safely
- preserving current chat history behavior and existing nudges

### Manual Verification

Verify the following:

- the coach still appears on every page
- the redesigned panel opens and closes smoothly
- the mode switcher updates the coach state
- recommendations appear when context changes
- chat replies change tone according to selected mode
- task review sheets require confirmation before saving
- calendar review sheets require confirmation before saving
- added tasks show up in `Daily Tasks`
- added events show up in `Calendar`
- current exam-generation behavior still works after backend prompt changes

## Risks

- If the premium layout becomes too visually busy, usability will drop.
- If smart mode recommendations are too aggressive, they will feel annoying.
- If the structured AI payload is too loose, action rendering will become unreliable.
- If the confirmation sheet is clumsy, quick actions will feel slower rather than safer.
- If `ChatCoach.tsx` absorbs too much logic, future iteration will become harder.

## Recommended First Upgrade

For this upgrade release:

- full premium coach redesign
- manual mode switcher
- smart mode recommendation surface
- backend mode-aware prompt adjustments
- structured task and calendar action suggestions
- confirmation sheet before any save

This delivers the biggest user-visible improvement while keeping the existing architecture intact and trustworthy.
