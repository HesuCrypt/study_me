# Dashboard Greeting And Env Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the dashboard greeting so it follows local time and include the already-approved local `.env` loading change in the same validated push.

**Architecture:** Keep the greeting logic inside `Dashboard.tsx` because that is the only current consumer and the approved design explicitly avoids extracting a shared utility. Update the dashboard translations to provide morning, afternoon, and evening variants, drive the rendered greeting from `new Date().getHours()`, and lock the behavior down with focused Vitest coverage. Keep the existing `server.ts` `dotenv` import, then validate the full change set with targeted tests, diagnostics, commit, and push.

**Tech Stack:** React 19, TypeScript, Express, `dotenv`, Vitest, Testing Library

---

## File Map

- Modify: `src/components/Dashboard.tsx`
  - Replace static greeting translations with time-of-day variants and compute the visible greeting from the local hour
- Modify: `src/components/Dashboard.test.tsx`
  - Add focused tests for morning, afternoon, and evening greetings while preserving the existing module-card test
- Keep: `server.ts`
  - Include the already-approved `dotenv/config` import in the implementation commit
- Create: `docs/superpowers/plans/2026-07-04-dashboard-greeting-and-env-loading-implementation.md`
  - This plan

## Implementation Notes

- Use local browser time via `new Date().getHours()`
- Use these exact time buckets:
  - `morning`: hour `< 12`
  - `afternoon`: hour `>= 12 && < 18`
  - `evening`: hour `>= 18`
- Keep the greeting logic inline in `Dashboard.tsx`
- Preserve support for `en`, `tl`, and `es`
- Do not change the dashboard subtitle or page layout
- Do not expose secrets or modify `.env`

### Task 1: Add Failing Dashboard Greeting Tests

**Files:**
- Modify: `src/components/Dashboard.test.tsx`

- [ ] **Step 1: Replace the current dashboard test file with focused greeting coverage plus the existing module-card regression**

Update `src/components/Dashboard.test.tsx` to:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';

const mockHour = (hour: number) => {
  vi.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);
};

describe('Dashboard greeting', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows the morning greeting before noon', () => {
    mockHour(9);

    render(<Dashboard onNavigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Good morning.' })).toBeInTheDocument();
  });

  it('shows the afternoon greeting from noon to 5pm', () => {
    mockHour(15);

    render(<Dashboard onNavigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Good afternoon.' })).toBeInTheDocument();
  });

  it('shows the evening greeting from 6pm onward', () => {
    mockHour(19);

    render(<Dashboard onNavigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Good evening.' })).toBeInTheDocument();
  });
});

describe('Dashboard modules overview', () => {
  it('shows the Calendar module card and no longer shows the Languages card', async () => {
    mockHour(9);

    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(<Dashboard onNavigate={onNavigate} />);

    const calendarCard = screen.getByText('Calendar');
    expect(calendarCard).toBeInTheDocument();
    expect(screen.queryByText('Languages')).not.toBeInTheDocument();

    await user.click(calendarCard);

    expect(onNavigate).toHaveBeenCalledWith('calendar');
  });
});
```

- [ ] **Step 2: Run the targeted dashboard tests to verify the new greeting assertions fail**

Run: `npm test -- src/components/Dashboard.test.tsx`
Expected: FAIL because `Dashboard.tsx` still renders the static `Good morning.` greeting for afternoon and evening cases

- [ ] **Step 3: Commit the failing test-only change**

```bash
git add src/components/Dashboard.test.tsx
git commit -m "test(dashboard): cover time-based greetings"
```

### Task 2: Implement The Greeting Logic

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/components/Dashboard.test.tsx`

- [ ] **Step 1: Update the translation object to use time-of-day greeting variants**

In `src/components/Dashboard.tsx`, replace the current single `greeting` fields in `TRANSLATIONS` with:

```ts
const TRANSLATIONS = {
  en: {
    morning: 'Good morning.',
    afternoon: 'Good afternoon.',
    evening: 'Good evening.',
    subtitle: 'Your flight path for today is clear. Ready for your next study session?',
    focusMode: 'Enter Focus Mode',
    settings: 'Local Settings',
    settingsDesc: 'Manage your data locally. Flight Deck does not use cloud storage.',
    backup: 'Backup Data',
    backupDesc: 'Export all your modules data as JSON',
    restore: 'Restore Data',
    restoreDesc: 'Import a previous backup file',
    appLanguage: 'App Language',
  },
  tl: {
    morning: 'Magandang umaga.',
    afternoon: 'Magandang hapon.',
    evening: 'Magandang gabi.',
    subtitle: 'Ang iyong flight path para sa araw na ito ay malinaw. Handa na ba sa pag-aaral?',
    focusMode: 'Focus Mode',
    settings: 'Mga Setting',
    settingsDesc: 'Lokal na pamamahala ng data. Hindi gumagamit ng cloud ang Flight Deck.',
    backup: 'I-backup ang Data',
    backupDesc: 'I-export ang lahat ng data bilang JSON',
    restore: 'I-restore ang Data',
    restoreDesc: 'Mag-import ng nakaraang backup file',
    appLanguage: 'Wika ng App',
  },
  es: {
    morning: 'Buenos días.',
    afternoon: 'Buenas tardes.',
    evening: 'Buenas noches.',
    subtitle: 'Tu ruta de vuelo para hoy está despejada. ¿Listo para estudiar?',
    focusMode: 'Modo Enfoque',
    settings: 'Ajustes Locales',
    settingsDesc: 'Gestiona tus datos localmente. Flight Deck no usa la nube.',
    backup: 'Copia de Seguridad',
    backupDesc: 'Exportar todos los datos como JSON',
    restore: 'Restaurar Datos',
    restoreDesc: 'Importar un archivo de respaldo',
    appLanguage: 'Idioma',
  },
};
```

- [ ] **Step 2: Add the derived greeting key and use it in the dashboard header**

In `src/components/Dashboard.tsx`, directly below `const t = TRANSLATIONS[language];`, add:

```ts
  const greetingKey = useMemo<'morning' | 'afternoon' | 'evening'>(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'morning';
    }

    if (hour < 18) {
      return 'afternoon';
    }

    return 'evening';
  }, []);
```

Then update the header render from:

```tsx
<h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">{t.greeting}</h1>
```

to:

```tsx
<h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">{t[greetingKey]}</h1>
```

- [ ] **Step 3: Run the targeted dashboard tests to verify they pass**

Run: `npm test -- src/components/Dashboard.test.tsx`
Expected: PASS with all greeting and module-card tests green

- [ ] **Step 4: Run type checking and diagnostics for the touched files**

Run: `npm run lint`
Expected: PASS

Then inspect diagnostics for:

- `src/components/Dashboard.tsx`
- `src/components/Dashboard.test.tsx`
- `server.ts`

Expected: no new errors introduced by the greeting change or the existing dotenv import

- [ ] **Step 5: Commit the implementation change, including the already-approved env-loading fix**

```bash
git add src/components/Dashboard.tsx src/components/Dashboard.test.tsx server.ts
git commit -m "fix(dashboard): use local time for greeting"
```

### Task 3: Push The Approved Changes

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/components/Dashboard.test.tsx`
- Modify: `server.ts`

- [ ] **Step 1: Confirm the working tree is clean except for expected committed changes**

Run: `git status --short`
Expected: no unstaged or uncommitted changes

- [ ] **Step 2: Push the branch**

Run: `git push origin main`
Expected: push succeeds without force

- [ ] **Step 3: Record the final verification summary**

Capture these results for handoff:

- targeted dashboard test result
- lint result
- pushed commit hashes for the spec, plan, and implementation commits
