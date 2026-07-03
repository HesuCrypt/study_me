# Calendar Dashboard Design

## Summary

Add a dedicated calendar module to the Study Me app so the user can store important dated items such as exams, birthdays, reminders, and general notes with a time. The feature includes a full month view, selected-day event details, event creation/editing/deletion, and a compact dashboard summary that highlights today's events and upcoming items.

This change also removes the `Language Study` card from the dashboard only. The existing `Languages` module remains available in the app and is not removed.

## Goals

- Add a new calendar page to the app as its own module.
- Let the user create events with `title`, `type`, `date`, `time`, and `note`.
- Show a month calendar with clear markers for dates that contain events.
- Show selected-day events and a broader upcoming list on the calendar page.
- Show `today` and `upcoming` calendar information on the dashboard.
- Keep all data local using the same `localStorage` pattern already used elsewhere in the app.

## Non-Goals

- No sync with Google Calendar, Apple Calendar, or any external service.
- No notifications, alarms, or background reminders.
- No recurring events.
- No drag-and-drop rescheduling.
- No removal of the `Languages` page itself.

## User Decisions Captured

- Placement: `Dashboard + page`
- Dashboard change: remove only the `Language Study` card from the dashboard
- Calendar layout: `Month + event list`
- Event fields: `Title + type + date + time + note`
- Dashboard summary style: `Upcoming + today highlight`

## Architecture

### New Module

Create a new `Calendar` module component in `src/components/Calendar.tsx`.

Responsibilities:

- Render the month view.
- Manage selected date state.
- Provide the add/edit event form.
- Render selected-day events.
- Render an upcoming events list.
- Persist calendar data to `localStorage`.

### App Integration

Update `src/App.tsx` and the shared `ModuleId` type so the app can navigate to the new calendar module.

Expected changes:

- Add `'calendar'` to `ModuleId`
- Import and render the new `Calendar` component in `App.tsx`
- Make the dashboard able to navigate to the new module

### Dashboard Integration

Update `src/components/Dashboard.tsx` to:

- Load calendar events from local storage
- Compute today's events
- Compute the next upcoming events sorted by date and time
- Render a compact dashboard card or panel showing:
  - a `today` highlight area
  - a short `upcoming` list
- Remove the existing `Language Study` card from the dashboard only

## Data Model

Store calendar items under a dedicated local storage key, recommended:

- `study-me-calendar-events`

Event shape:

```ts
interface CalendarEvent {
  id: string;
  title: string;
  type: 'exam' | 'birthday' | 'reminder' | 'task' | 'other';
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note: string;
}
```

Notes:

- `date` uses the existing app convention of storing normalized date strings.
- `time` remains a plain string from a native time input.
- `type` is included because the user explicitly selected it during brainstorming.
- `id` can continue using the current app pattern based on `Date.now().toString()`.

## Calendar Page UX

### Header

The page header follows the existing app pattern:

- Back button to dashboard
- Module label
- Month navigation controls
- Add event action

### Month Grid

The month grid shows:

- Current month and year
- Days of the week
- Empty leading/trailing cells where needed
- A cell for each date in the month
- A subtle visual marker or count for dates with events
- A highlighted state for the selected date
- A highlighted state for today

Clicking a day selects it and updates the details section below.

### Event Form

The add/edit form should include:

- `Title`
- `Type`
- `Date`
- `Time`
- `Note`

Behavior:

- The form can appear inline or in a modal-like panel inside the same component.
- When adding from a selected date, prefill the date field with the selected day.
- Support both create and edit flows using the same form state.
- Validate required fields before saving.

Required fields:

- `title`
- `type`
- `date`
- `time`

Optional field:

- `note`

### Selected-Day List

Below the calendar grid, show all events for the selected date.

Each event row should show:

- title
- type
- time
- note preview if present
- edit action
- delete action

If no events exist for the selected date, show a clear empty state.

### Upcoming List

Also show an `Upcoming` section on the calendar page that lists the next few future events.

Behavior:

- Sort by date ascending, then time ascending
- Exclude events in the past
- Show enough items to be useful without overcrowding, such as the next 5 events

## Dashboard UX

### Today Highlight

Show a compact dashboard section for today's events:

- If there are events today, show the soonest events with time and title
- If there are no events today, show a calm empty state such as "No events today"

### Upcoming Summary

Show a short list of upcoming events:

- sorted by nearest date/time
- limited to a small number such as 3 to 5
- clickable or paired with a button that navigates to the full calendar page

### Language Card Removal

Remove the `Language Study` card from the dashboard layout only.

Do not:

- remove the `Languages` component file
- remove routing/navigation for the `Languages` module
- delete any language-study data

## Data Flow

### Calendar Module

1. On mount, read `study-me-calendar-events` from `localStorage`
2. Parse and hydrate the events array
3. On add/edit/delete, update React state
4. Persist the updated array back to `localStorage`
5. Recompute derived lists:
   - selected-day events
   - current-month event markers
   - upcoming events

### Dashboard

1. On mount, read the same `study-me-calendar-events` key
2. Parse and hydrate the events array
3. Derive:
   - today's events
   - nearest upcoming events
4. Render summary content

The initial implementation can keep calendar state local to each page and reread from `localStorage` when needed. A shared global store is unnecessary for this scope.

## Error Handling

- If stored calendar data is missing, default to an empty array.
- If stored calendar data fails to parse, log an error and recover with an empty array.
- If required form fields are missing, prevent save and show a lightweight inline validation state.
- If an event is deleted while currently selected for editing, reset the form cleanly.

## Testing Strategy

### Manual Verification

Verify the following:

- navigate from dashboard to the new calendar module
- add an event with title, type, date, time, and note
- see the event marker appear on the correct calendar day
- select a day and view that day's events
- edit an existing event and confirm changes persist
- delete an event and confirm it is removed from both the calendar page and dashboard summary
- confirm today's events appear in the dashboard `today` section
- confirm future events appear in the dashboard `upcoming` section in correct order
- confirm the `Language Study` card is no longer shown on the dashboard
- confirm the `Languages` module still works if accessed through existing app navigation
- reload the page and confirm events persist

### Automated Tests

No new automated test suite is required for this slice unless the repo already has a nearby testing pattern worth extending. Manual verification is sufficient for the first implementation because the app currently follows local-state and local-storage driven UI patterns without an existing test harness in the visible code.

## Implementation Notes

- Reuse existing styling patterns from `Dashboard.tsx`, `DailyTasks.tsx`, and `Subjects.tsx`
- Keep the feature visually aligned with the app's current black/white editorial style
- Prefer native date and time inputs for simplicity
- Use small helper functions inside the calendar component for:
  - month generation
  - event sorting
  - date comparison
  - upcoming filtering

## Risks

- Mixed date parsing can become inconsistent if some logic uses `Date` with timezone-sensitive parsing and some logic uses string comparisons. Implementation should normalize dates carefully.
- Dashboard and calendar page both reading local storage independently can briefly drift if one view is not refreshed after edits. This is acceptable for the first version because navigation remounts the page, but the implementation should keep the storage logic straightforward.

## Recommended Commit Scope

The spec commit should contain only this design document.
