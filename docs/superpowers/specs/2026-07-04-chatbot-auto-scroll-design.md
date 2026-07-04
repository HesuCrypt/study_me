# Chatbot Auto-Scroll Design

## Summary

Fix the floating Study Coach chat panel so it always stays pinned to the latest message instead of opening or updating at the top of the conversation. The goal is to remove the need to manually scroll down every time the user sends a message or waits for an AI reply.

This design keeps the change intentionally narrow: improve scroll behavior inside the existing `ChatCoach` component without changing the chatbot layout, message content, API flow, or storage behavior.

## Goals

- Keep the newest chat content visible at all times.
- Auto-scroll when the chatbot opens.
- Auto-scroll when the user sends a message.
- Auto-scroll when the loading state appears.
- Auto-scroll when the AI reply is appended.
- Preserve the current premium glassmorphism chat UI and existing chatbot behavior.

## Non-Goals

- No redesign of the chatbot panel.
- No changes to chatbot copy, personality modes, or action-card behavior.
- No API changes for `/api/chat-coach`.
- No new persisted settings for scroll behavior.
- No "smart" conditional scrolling that tries to preserve older scroll position.

## User Decisions Captured

- The chatbot should always jump to the latest message.
- The fix should prioritize the newest AI reply being immediately visible.
- The scroll behavior should feel automatic and remove the need for manual scrolling after each interaction.

## Architecture

### Scroll Ownership

Keep all scroll logic inside `src/components/ChatCoach.tsx` because the issue is local to the chat panel and does not need a shared utility.

The scrollable message container already exists as the chat body. The fix should formalize that container as the single owner of conversation scrolling.

### Recommended Implementation

Add two refs in `ChatCoach.tsx`:

- one ref for the scrollable message container
- one ref for a bottom sentinel element rendered after the latest message, loading bubble, and action card content

Create one small helper such as `scrollToLatest()` that scrolls the panel to the bottom. The preferred behavior is smooth scrolling during ongoing conversation updates and immediate bottom alignment when the panel first opens.

An effect should trigger the helper whenever the visible conversation content changes, including:

- `isOpen`
- `messages`
- `isSending`
- `suggestedAction`
- `reviewAction`

This ensures the panel follows all user-visible additions, not just text messages.

## Data And Logic

No new storage keys or backend fields are introduced.

The fix is entirely view-level:

- render the scroll body with a ref
- render a bottom anchor element after the final visible content in the message area
- call `scrollToLatest()` after React commits content updates

Recommended logic shape:

```ts
const scrollContainerRef = useRef<HTMLDivElement | null>(null);
const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
```

The helper can prefer the sentinel-based approach:

```ts
bottomAnchorRef.current?.scrollIntoView({ behavior, block: 'end' });
```

If the sentinel is unavailable, a container fallback can still safely pin the scroll position:

```ts
scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
```

The effect should run after message-area content updates so the latest rendered reply, loading bubble, or review sheet is visible before the user has to interact again.

## UX Behavior

### On Open

When the user opens the Study Coach, the panel should land on the latest part of the conversation instead of the oldest messages.

### On Send

As soon as the user submits a message, the conversation should remain pinned to the bottom so the sent message stays visible.

### While Waiting

When the "Preparing your next instruction..." loading bubble appears, it should also stay in view at the bottom of the chat.

### On Reply

When the AI response arrives, the panel should automatically scroll to show the new reply immediately.

### On Suggested Actions

If a task or calendar suggestion card appears after the AI reply, it should also remain visible without forcing the user to scroll manually.

## Testing

Add focused coverage around the scroll behavior in the chatbot UI.

Recommended validation:

- render `ChatCoach` with a long enough history to require scrolling
- open the panel and verify the newest content is the visible target
- send a message and verify the latest content remains pinned to the bottom
- verify the loading bubble and final assistant reply trigger the same bottom-aligned behavior

If a DOM-level scroll assertion is awkward in jsdom, it is acceptable to mock `scrollIntoView` and assert it is called when the relevant state changes.

## Risks And Mitigations

### Risk: Auto-Scroll Fires Before Content Paints

Mitigation:

- trigger scrolling from an effect tied to rendered state changes instead of trying to manage it inside each event handler only

### Risk: Missing Some Content Types

Mitigation:

- include `messages`, `isSending`, `suggestedAction`, and `reviewAction` in the effect dependencies so all bottom-appended chat content participates

### Risk: Over-Engineering A Simple UX Fix

Mitigation:

- keep the implementation local to `ChatCoach.tsx`
- avoid extracting shared hooks or adding user-configurable scroll modes

## Files In Scope

- Modify `src/components/ChatCoach.tsx`
- Optionally modify `src/components/ChatCoach.test.tsx` if focused coverage is added
