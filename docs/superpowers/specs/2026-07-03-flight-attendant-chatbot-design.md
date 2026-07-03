# Flight Attendant Chatbot Design

## Summary

Add a floating AI chatbot to the Study Me app that appears on every page and acts like a supportive flight attendant who keeps redirecting the user toward studying. The assistant should feel polished, gently proactive, and useful across motivation, study questions, planning, task guidance, and calendar guidance.

This first version keeps the feature lightweight by using a single floating chat panel, local chat history storage, and one new backend AI endpoint that mirrors the existing server-side pattern used by the exam generator.

## Goals

- Add a floating chatbot that is available on every page in the app.
- Give the chatbot a clear flight-attendant personality that consistently nudges the user back toward studying.
- Support both reactive chat and gentle proactive nudges.
- Let the chatbot help with:
  - motivation
  - study questions
  - study-next suggestions
  - task guidance
  - calendar guidance
- Persist recent chat history and UI state locally.
- Reuse the existing AI backend approach already present in the app.

## Non-Goals

- No voice input or voice output.
- No multi-agent workflow.
- No autonomous editing of tasks or calendar items without explicit user confirmation.
- No replacement of the existing exam generator flow.
- No long-term cloud sync of chat history.
- No aggressive interruption pattern that frequently blocks the user.

## User Decisions Captured

- Placement: `Floating on every page`
- Proactivity: `Gentle nudges`
- Capability level: `Full AI assistant`

## Product Behavior

### Core Personality

The chatbot should sound like a polished flight attendant:

- warm
- professional
- gently firm
- encouraging
- focused on keeping the user on course

The assistant should consistently guide the conversation back to studying, progress, focus, tasks, or plans when possible.

Example tone:

- "Captain, let’s get back on course."
- "Before we relax, let’s clear one small study task first."
- "Quick check-in: what are we studying next?"

### Availability

The chatbot appears as a floating button anchored to the bottom-right corner of the app and remains accessible across all modules.

Clicking the button opens a compact chat panel. The panel should be dismissible and reopenable without losing recent local history.

### Assistance Scope

The assistant can help with:

- motivation and accountability
- answering study questions
- suggesting what to study next
- helping break tasks into manageable next steps
- helping the user think through calendar plans and priorities

The assistant should not silently mutate user data. If the user asks it to create or adjust tasks/calendar items in a future version, that action should require explicit confirmation and separate scoped implementation.

## Architecture

### Frontend Structure

Create a reusable global chatbot UI component that is rendered once at the app root so it stays available on every page.

Recommended structure:

- `ChatCoachShell`
  - floating launcher button
  - open/closed state
  - unread or nudge indicator if needed
- `ChatCoachPanel`
  - header
  - message list
  - quick prompts
  - input box
  - send action
- optional small helper module for local storage and message formatting

The floating shell should live high enough in the tree that it is not remounted when the user navigates between modules.

### App Integration

Update `src/App.tsx` to render the chatbot shell alongside the module content so it stays available everywhere.

### Backend Structure

Add one new API route to `server.ts`, recommended:

- `POST /api/chat-coach`

This route should:

- accept recent conversation context
- inject a system prompt that defines the flight-attendant personality and study-first behavior
- call Gemini in the same general server-side style as the exam generator
- return a single assistant reply

## Data Model

### Frontend Chat Message Shape

```ts
interface ChatCoachMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}
```

### Local Storage

Recommended keys:

- `study-me-chat-coach-history`
- `study-me-chat-coach-open`
- `study-me-chat-coach-last-nudge`

Notes:

- History can be capped to a small recent window such as the latest 20 to 40 messages.
- UI state should be resilient to reloads.
- Nudge timing should also be tracked locally so reminders stay gentle rather than repetitive.

## UX Design

### Floating Button

The launcher should:

- sit fixed near the bottom-right corner
- visually fit the app’s black/white premium editorial aesthetic
- suggest personality without becoming cartoonish
- remain visible but not intrusive

Possible states:

- closed
- open
- subtle nudge indicator

### Chat Panel

The panel should include:

- assistant title
- short subtitle or status line
- conversation history
- quick prompt buttons
- message input
- send button

The panel should feel compact and premium rather than like a full messaging app.

### Quick Prompts

Provide a few default prompts to help the user start quickly, such as:

- "Motivate me to study"
- "What should I study next?"
- "Help me plan tonight"
- "Quiz me on this topic"

### Gentle Nudges

Proactive nudges should be lightweight and infrequent.

Recommended triggers for the first version:

- app open
- returning to dashboard
- extended idle period while the app is open

Nudges should:

- be short
- avoid stacking repeatedly
- never fully block the user’s workflow

## AI Prompting Behavior

### System Prompt Requirements

The server-side system prompt should establish that the assistant:

- is a study coach with a polished flight-attendant tone
- is encouraging but gently firm
- keeps bringing the user back to studying, focus, tasks, and progress
- gives practical next steps instead of vague inspiration
- avoids sounding harsh, shaming, or hostile
- avoids pretending to have changed app data unless the app explicitly supports and confirms such actions

### Response Style

Responses should:

- be concise by default
- be useful and actionable
- sound like a calm, high-standard coach
- redirect off-topic conversations back to learning or productive action when reasonable

## Data Flow

### User Message Flow

1. User opens the panel
2. User enters a message or taps a quick prompt
3. Frontend appends the user message to local state
4. Frontend sends recent chat history to `/api/chat-coach`
5. Server injects the system prompt and requests a Gemini response
6. Frontend appends the assistant reply
7. Frontend persists the updated history locally

### Nudge Flow

1. App checks whether nudge conditions are met
2. If enough time has passed, frontend inserts a lightweight assistant message locally
3. Frontend updates `study-me-chat-coach-last-nudge`

The first version can make nudges local-only rather than AI-generated to keep costs and complexity low while preserving personality.

## Error Handling

- If the API call fails, show a friendly fallback message in the chat panel.
- If chat history fails to parse from local storage, recover with an empty conversation.
- If the AI response is empty or invalid, show a brief fallback apology and suggest retrying.
- If the panel is closed during an in-flight request, preserve the returned message so it appears when reopened.

## Testing Strategy

### Automated Tests

Add focused tests for:

- local storage helpers or chat state initialization
- floating chatbot visibility across app-level rendering
- sending a message and rendering the assistant response using mocked fetch
- quick prompt behavior
- gentle nudge suppression logic so reminders do not spam

### Manual Verification

Verify the following:

- chatbot launcher appears on every page
- panel opens and closes correctly
- user can send a message and receive a reply
- quick prompts populate and send correctly
- history persists across refresh
- nudges appear gently and not too often
- chatbot keeps the flight-attendant personality and study-first behavior
- exam generator still works after the new API route is added

## Risks

- If nudges are too frequent, the chatbot will feel annoying instead of supportive.
- If the personality prompt is too strong, replies may feel repetitive or gimmicky.
- If the chatbot tries to act like it can modify tasks/calendar directly before that support exists, the experience will become misleading.
- If the root-level component is not placed carefully, navigation could reset the panel unexpectedly.

## Recommended First Version

For the initial release:

- floating chatbot on every page
- compact panel
- local history
- quick prompts
- one backend AI route
- local gentle nudges

This gives the user the full assistant feel without over-expanding the first implementation.
