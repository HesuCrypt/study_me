# Dashboard Greeting And Env Loading Design

## Summary

Fix the dashboard so its greeting reflects the user's local time instead of always showing a morning message. At the same time, formalize the already-approved local `.env` loading change so the server reads `GEMINI_API_KEY` during local development.

This design intentionally keeps scope small: one dashboard behavior fix and one server startup configuration fix, both aligned with existing project conventions.

## Goals

- Make the dashboard greeting dynamic based on local time.
- Preserve the existing multilingual dashboard experience.
- Keep the greeting logic local to the dashboard because only this screen currently uses it.
- Ensure the server loads `.env` values during local runs.
- Add focused automated coverage for the greeting behavior.

## Non-Goals

- No redesign of the dashboard layout.
- No changes to subtitle copy or other dashboard text.
- No shared date/time utility extraction unless another screen needs it.
- No change to deployment-time environment handling outside local development.

## User Decisions Captured

- The greeting must reflect the user's local time.
- The change should be small and safe.
- The git push should include both the dashboard greeting fix and the already-approved `.env` loading fix.

## Architecture

### Dashboard Greeting

Update `src/components/Dashboard.tsx` so greeting copy is selected from three time-of-day variants:

- `morning`
- `afternoon`
- `evening`

The dashboard should derive the current period from `new Date().getHours()` using local browser time:

- `morning`: before 12
- `afternoon`: 12 through 17
- `evening`: 18 and later

The translated strings remain in the existing `TRANSLATIONS` object so the dashboard continues to support English, Tagalog, and Spanish without changing the rest of the page structure.

### Env Loading

Keep the approved `server.ts` startup fix that loads `dotenv` before `process.env.GEMINI_API_KEY` is read.

This is intentionally done in the server entrypoint because:

- it is the narrowest possible change
- it keeps local env behavior explicit
- it works with the existing `npm run dev` flow

## Data And Logic

No new storage keys or persisted data are introduced.

Greeting selection can remain inline in `Dashboard.tsx` through a small derived value such as:

```ts
const hour = new Date().getHours();
const greetingKey = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
```

Each language entry should replace the single `greeting` field with three fields:

```ts
morning: string;
afternoon: string;
evening: string;
```

The rendered header should use the computed greeting variant rather than a static string.

## Testing

Update `src/components/Dashboard.test.tsx` with focused coverage for time-based greetings.

Recommended test shape:

- mock `Date` or `Date.prototype.getHours`
- render the dashboard
- verify morning, afternoon, and evening greetings appear at the correct times

The test should specifically protect against the regression where the dashboard always renders a morning greeting.

## Risks And Mitigations

### Risk: Time-Based Test Flakiness

Mitigation:

- explicitly mock the time source in tests rather than relying on the machine clock

### Risk: Translation Drift

Mitigation:

- add all three greeting variants for every supported language in the same translation object

## Files In Scope

- Modify `src/components/Dashboard.tsx`
- Modify `src/components/Dashboard.test.tsx`
- Keep `server.ts` in the commit because the env-loading change is already implemented and approved
