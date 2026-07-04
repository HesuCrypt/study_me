# Chatbot Responsive Dashboard Design

## Summary

Upgrade the Study Coach so it works well on any screen size while also gaining a dedicated full chatbot page. The final experience should keep the current floating coach available across the app for quick access, but introduce a larger chatbot dashboard for longer conversations, clearer reading, and better action review.

Both chat surfaces should share the same conversation history, selected mode, suggestion state, and persistence behavior so users can move between the floating coach and the full page without losing context.

## Goals

- Keep the floating chatbot available across the app.
- Add a dedicated chatbot module/page to the main app navigation.
- Make the chatbot experience responsive across mobile, tablet, and desktop.
- Share the same chat history and mode between the floating coach and the dedicated page.
- Preserve the current review-first workflow for AI-suggested task and calendar actions.
- Maintain the existing premium glassmorphism visual style while improving reading comfort and layout resilience.

## Non-Goals

- No change to the chatbot persona, prompt strategy, or personality modes.
- No change to the existing `/api/chat-coach` contract.
- No migration away from `localStorage` for chat persistence.
- No unrelated redesign of dashboard, calendar, or task modules.
- No removal of the floating chatbot entry point.

## User Decisions Captured

- The floating chatbot should remain available.
- A dedicated chatbot dashboard should be added.
- Both views should share the same history and state.
- The responsive experience should be optimized for any screen size instead of only desktop floating-panel usage.

## Architecture

### Two-Surface Chat Model

The chatbot will have two UI surfaces:

- `Floating Coach`: a compact, always-available global assistant
- `Chat Dashboard`: a full module/page for deep conversation and larger layouts

These are two views over the same underlying state rather than two separate chat systems.

### Shared State Strategy

The current `ChatCoach.tsx` holds UI state and conversation state together. To support both surfaces cleanly, shared chat behavior should be separated from the specific layout shell.

Recommended structure:

- keep shared chat state and message logic in a reusable layer
- keep the floating coach responsible only for compact launcher/sheet behavior
- keep the dedicated chatbot page responsible for full-page layout and larger responsive composition

This avoids duplicating fetch logic, persistence logic, auto-scroll behavior, and action review behavior.

### App Integration

The app currently routes modules through the `currentModule` state in `App.tsx` and the `ModuleId` union from `Dashboard.tsx`. The chatbot dashboard should become a first-class module in the same navigation model.

This means:

- extend `ModuleId` with a chatbot route, such as `chat`
- add a new module component for the dedicated chatbot page
- wire dashboard navigation so users can enter the full chatbot page intentionally
- keep the floating coach mounted globally in `App.tsx`

## Responsive UX Model

### Mobile

On small screens, the floating chatbot should behave more like a bottom sheet or near-fullscreen modal instead of a narrow desktop-sized floating card. The goal is to avoid cramped message layout, clipped content, and awkward keyboard overlap.

The dedicated chatbot page should use a stacked mobile-first layout:

- full-width message area
- sticky input area
- compact mode controls
- action review components integrated without crowding the message stream

### Tablet

On tablet widths, the floating chatbot can remain overlay-based but should use a wider, taller sheet with safer spacing and more usable message width.

The dedicated chatbot page can remain mostly single-column, but with more generous spacing and stronger visual hierarchy than mobile.

### Desktop

On desktop, the floating coach can remain a compact premium assistant panel for quick prompts.

The dedicated chatbot page should become the premium “cockpit” experience:

- larger conversation area
- better reading width
- clear sectioning for header, chat stream, quick prompts, and review actions
- stronger dashboard feel than the floating widget

## Component Design

### Shared Chat Content Layer

Create a reusable chat content layer that owns:

- messages
- current input
- send/loading flow
- mode selection
- suggested action state
- review/confirmation flow
- shared auto-scroll behavior

This layer should be reusable by both the floating and dedicated surfaces without depending on one specific container size.

### Floating Chat Surface

The floating coach should become a responsive shell around the shared chat content.

Expected behavior:

- launcher remains globally visible
- desktop uses a compact floating panel
- mobile uses a larger sheet-style presentation
- include an explicit action such as `Open Full Coach` to move into the dedicated chatbot page

### Dedicated Chat Dashboard

Add a new chatbot page component that presents the same shared conversation in a larger layout.

Recommended page sections:

- page header with title, subtitle, and back/navigation affordance
- mode switcher in a clearly visible but lightweight position
- primary message column with stable scrolling
- quick prompt row or panel
- action review area that feels integrated rather than cramped

The dedicated page should feel like a real module, not just the floating widget stretched larger.

## Data And Logic

No new backend fields or storage keys are required by default.

The existing chat persistence keys should remain the source of truth:

- chat history
- open state where still relevant for the floating coach
- last nudge timestamp
- selected mode

The main behavioral change is state reuse across two UI surfaces.

Recommended logic split:

- shared hook or controller for chat behavior and persistence
- reusable presentational chat panel/body
- floating shell component
- dedicated page component

This keeps boundaries clear and avoids turning `ChatCoach.tsx` into an oversized multi-layout file.

## Navigation

The dedicated chatbot page should be reachable from at least one explicit app surface.

Recommended entry points:

- dashboard card or CTA for Study Coach
- button inside the floating chatbot such as `Open Full Coach`

This ensures users can discover the full chatbot dashboard naturally without removing the convenience of the global launcher.

## Error Handling

Both surfaces must continue to use the existing friendly fallback behavior when chat requests fail.

Requirements:

- failure messaging remains consistent between floating and dedicated views
- state stays shared after an error
- review actions do not become detached from the conversation if the user changes surfaces

## Testing

Add focused coverage around:

- shared chat history between floating and dedicated views
- preserving selected mode across both surfaces
- navigation into the dedicated chatbot page
- responsive shell behavior at meaningful breakpoints where practical
- keeping action review and suggestion rendering functional in both surfaces

Testing does not need to simulate every CSS breakpoint perfectly, but should protect the structural behaviors:

- the dedicated chatbot page renders from app navigation
- floating and dedicated views read from the same persisted chat history
- moving between views does not reset the conversation

## Risks And Mitigations

### Risk: Shared State Gets Duplicated

Mitigation:

- centralize chat behavior in one reusable layer before building the second surface

### Risk: Responsive Layout Becomes Hard To Maintain

Mitigation:

- separate the floating shell from the dedicated page shell instead of stuffing many breakpoint branches into one component

### Risk: Dedicated Page Feels Like A Stretched Widget

Mitigation:

- give the dedicated page its own layout structure and hierarchy while reusing only the core chat behavior

### Risk: Action Review Flow Becomes Inconsistent Between Surfaces

Mitigation:

- keep suggestion and review state in the shared chat layer, not inside one specific shell

## Files In Scope

- Modify `src/App.tsx`
- Modify `src/components/Dashboard.tsx`
- Modify `src/components/ChatCoach.tsx`
- Create one dedicated chatbot page component under `src/components/`
- Create or extract shared chatbot logic/components under `src/components/chat-coach/` and/or `src/lib/`
- Update `src/components/ChatCoach.test.tsx`
- Add focused tests for the dedicated chatbot page and shared state behavior where needed
