# Chatbot Responsive Dashboard Design

## Summary

Upgrade the Study Coach so it feels like a first-class app module while also keeping the floating coach available for quick access. The final experience should add a dedicated chatbot page that visually fits the rest of the app, expose that page from a proper dashboard card instead of a small header button, and simplify both mobile chat surfaces so they feel closer to a Gemini-style conversation experience.

Both chat surfaces should share the same conversation history, selected mode, suggestion state, and persistence behavior so users can move between the floating coach and the full page without losing context. On mobile, the floating coach and the dedicated page should feel cleaner, calmer, and more conversation-first, while still staying within the app's existing theme.

## Goals

- Keep the floating chatbot available across the app.
- Add a dedicated chatbot module/page to the main app navigation.
- Add a proper `Study Coach` dashboard card near the `Diary` card.
- Share the same chat history and mode between the floating coach and the dedicated page.
- Preserve the current review-first workflow for AI-suggested task and calendar actions.
- Keep the floating chatbot available globally.
- Make the dedicated chatbot page feel closer to existing module pages such as Exams on larger screens.
- Simplify the mobile UX for both chatbot surfaces so they feel closer to the Gemini-style reference: minimal top chrome, generous breathing room, and a pinned bottom input dock.
- Keep the chatbot aligned with the app's current theme rather than copying Gemini's dark palette directly.

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
- The dedicated chatbot page should use a cleaner card/module layout similar to `ExamCreator` on larger screens.
- On mobile, both the floating coach and the dedicated page should feel simpler and more like Gemini's interaction pattern.
- The UI should stay consistent with the app's existing theme.
- The mobile chatbot should prioritize a minimal first screen rather than opening into a dense stack of controls.

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
- keep `Open Full Coach` as a path into the dedicated chatbot page
- on desktop, preserve the compact floating-panel feel
- on mobile, open into a simpler focused conversation view rather than a dense stacked-card sheet
- keep the same theme language as the rest of the app

### Dedicated Chat Page

The dedicated chatbot page should look and feel like a real app module, not a stretched floating widget.

The target direction varies slightly by breakpoint:

- on larger screens, the reference is closer to `ExamCreator` than to an overlay
- on mobile, the reference is closer to Gemini's simple conversation-first flow, while still using the app's theme

Large-screen expectations:

- clear module header with back navigation
- page title and subtitle
- main chat card for the conversation area
- optional secondary info/support card beside or below it
- structured spacing and surfaces consistent with the app's module pages

Mobile expectations:

- very light top chrome
- large breathing room in the initial state
- one primary conversation area
- bottom-pinned input dock that anchors the experience
- much less visual separation between prompts, controls, and conversation

### Mobile Interaction Model

Both chatbot surfaces should share a simpler mobile interaction pattern inspired by Gemini:

- open into a minimal first screen
- present one clear primary action area: the bottom input dock
- reduce stacked cards, dividers, and competing panels
- let the conversation thread become dominant after messages exist
- keep prompts and modes available, but visually quieter and more compact

This is an interaction simplification, not a literal visual clone. The chatbot should still look native to the app.

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

It should also support two presentation states cleanly:

- an initial low-clutter state with welcome copy, quiet controls, and bottom input emphasis
- an active conversation state where messages become the dominant visual element

### Floating Chat Surface

The floating coach should remain a compact global shell around the shared chat content.

Expected behavior:

- launcher remains globally visible
- desktop uses a compact floating panel
- mobile uses a simplified full-height or near-full-height conversation shell
- include an explicit action such as `Open Full Coach` to move into the dedicated chatbot page

Mobile shell guidelines:

- reduce heavy bordered sections
- keep the header minimal
- keep mode controls accessible but quieter
- avoid showing too many independent cards at once
- keep the input dock visually anchored at the bottom

### Dedicated Chat Dashboard

Add a new chatbot page component that presents the same shared conversation in a card-based module layout.

Recommended page sections:

- large-screen layout:
- module header with title, subtitle, and back/navigation affordance
- primary chat card with stable scrolling and message input
- mode switcher integrated into the main chat card
- quick prompt row inside the main card
- action review area that feels integrated into the card instead of floating separately
- optional secondary support/info card that complements the main conversation area

- mobile layout:
- simplified top bar
- welcome-led initial state when the thread is empty or light
- messages presented with clearer focus and less framing clutter
- quick prompts near the input instead of as a dominant separate section
- pinned input dock as the primary stable control
- support content moved below the conversation or softened so it does not compete with the thread

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

On mobile, navigation into the dedicated page should feel like moving into a full chat experience, not expanding a denser version of the floating widget.

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
- simplified mobile layout states for the floating coach
- simplified mobile layout states for the dedicated page
- bottom input dock remaining available in mobile conversation flows

Testing should protect the structural behaviors:

- the dedicated chatbot page renders from app navigation
- the dedicated chatbot page opens from the dashboard card near the module grid
- floating and dedicated views read from the same persisted chat history
- moving between views does not reset the conversation
- mobile layouts do not regress into the old stacked-card presentation when key controls render

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

### Risk: Mobile UI Still Feels Dense

Mitigation:

- explicitly design around a minimal first screen and a pinned bottom input dock
- demote prompts and auxiliary controls so the thread and composer stay primary

### Risk: Gemini Inspiration Conflicts With Existing Theme

Mitigation:

- borrow interaction structure rather than copying Gemini's exact palette or brand styling
- keep typography, surfaces, and accents aligned with the current app theme

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
