# Chatbot Responsive Dashboard Design

## Summary

Upgrade the Study Coach so it feels like a first-class app module while also keeping the floating coach available for quick access. The final experience should add a dedicated chatbot page that visually fits the rest of the app, especially the Exams module style, and should expose that page from a proper dashboard card instead of a small header button.

Both chat surfaces should share the same conversation history, selected mode, suggestion state, and persistence behavior so users can move between the floating coach and the full page without losing context.

## Goals

- Keep the floating chatbot available across the app.
- Add a dedicated chatbot module/page to the main app navigation.
- Add a proper `Study Coach` dashboard card near the `Diary` card.
- Share the same chat history and mode between the floating coach and the dedicated page.
- Preserve the current review-first workflow for AI-suggested task and calendar actions.
- Keep the floating chatbot available globally without making mobile-specific shell behavior the main design focus.
- Make the dedicated chatbot page feel closer to existing module pages such as Exams.

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
- The top header button for chatbot entry should be removed.
- The chatbot should be entered from a proper dashboard card placed near `Diary`.
- The dedicated chatbot page should use a cleaner card/module layout similar to `ExamCreator`.

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
- wire dashboard navigation so users can enter the full chatbot page from a real dashboard card
- keep the floating coach mounted globally in `App.tsx`
- remove the temporary top header CTA button for chatbot entry

## UX Direction

### Dashboard Entry

The dashboard should expose the chatbot the same way other modules are exposed: as a proper module card in the main feature grid. The current top header button should be removed entirely.

Requirements:

- add a `Study Coach` card to the module grid
- place it close to `Diary` so it reads as a peer module
- match the existing dashboard card language and interactions
- route the card to the dedicated chatbot page

### Floating Coach

The floating coach remains available everywhere as the quick-access assistant.

Requirements:

- keep the launcher globally visible
- keep compact quick-chat behavior
- keep `Open Full Coach` as a path into the dedicated chatbot page
- avoid making special mobile-only shell behavior the centerpiece of the feature

### Dedicated Chat Page

The dedicated chatbot page should look and feel like a real app module, not a stretched floating widget and not a special mobile sheet.

The target reference is closer to `ExamCreator` than to an overlay:

- clear module header with back navigation
- page title and subtitle
- main chat card for the conversation area
- optional secondary info/support card beside or below it
- structured spacing and surfaces consistent with the app's module pages

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

The floating coach should remain a compact global shell around the shared chat content.

Expected behavior:

- launcher remains globally visible
- desktop uses a compact floating panel
- include an explicit action such as `Open Full Coach` to move into the dedicated chatbot page

### Dedicated Chat Dashboard

Add a new chatbot page component that presents the same shared conversation in a card-based module layout.

Recommended page sections:

- module header with title, subtitle, and back/navigation affordance
- primary chat card with stable scrolling and message input
- mode switcher integrated into the main chat card
- quick prompt row inside the main card
- action review area that feels integrated into the card instead of floating separately
- optional secondary support/info card that complements the main conversation area

The dedicated page should feel like a real module page in the system, similar in presentation quality to Exams.

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
- reusable presentational chat panel/body where helpful
- floating shell component
- dedicated page component

This keeps boundaries clear and avoids turning `ChatCoach.tsx` into an oversized multi-layout file while still allowing the dedicated page to have its own module-style structure.

## Navigation

The dedicated chatbot page should be reachable from at least one explicit app surface.

Recommended entry points:

- dashboard `Study Coach` module card
- button inside the floating chatbot such as `Open Full Coach`

The top dashboard header button should not be used as a chatbot entry point.

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
- navigation from the new `Study Coach` dashboard card
- absence of the removed top header CTA
- keeping action review and suggestion rendering functional in both surfaces

Testing should protect the structural behaviors:

- the dedicated chatbot page renders from app navigation
- the dedicated chatbot page opens from the dashboard card near the module grid
- floating and dedicated views read from the same persisted chat history
- moving between views does not reset the conversation

## Risks And Mitigations

### Risk: Shared State Gets Duplicated

Mitigation:

- centralize chat behavior in one reusable layer before building the second surface

### Risk: Dedicated Entry Feels Inconsistent With Other Modules

Mitigation:

- remove the header CTA and use the same dashboard card language as the rest of the modules

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
- Update the dashboard module grid to include `Study Coach` near `Diary`
- Add focused tests for the dedicated chatbot page and shared state behavior where needed
