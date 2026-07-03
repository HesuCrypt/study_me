# Calendar Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated calendar module with month view, event CRUD, selected-day details, and dashboard summaries while removing the Language Study card from the dashboard only.

**Architecture:** Keep the feature local-first and consistent with the existing app by storing calendar events in `localStorage` and rendering them from React state. Split the work into a small date/event helper module, a new `Calendar` page component, and targeted updates to `App.tsx` and `Dashboard.tsx` so the routing and summaries stay simple.

**Tech Stack:** React 19, TypeScript, Vite, `motion/react`, `lucide-react`, browser `localStorage`, native date/time inputs, `npm run lint`

---

## File Map

- Create: `src/lib/calendar.ts`
  - Shared calendar types, storage key, parsing, sorting, month-grid helpers, and summary selectors
- Create: `src/components/Calendar.tsx`
  - Full calendar page UI, add/edit/delete form, selected-day list, upcoming list
- Modify: `src/App.tsx`
  - Register the new calendar route/component
- Modify: `src/components/Dashboard.tsx`
  - Extend `ModuleId`, add calendar summary card, remove dashboard languages card
- Create: `docs/superpowers/plans/2026-07-03-calendar-dashboard-implementation.md`
  - This plan

## Implementation Notes

- Use `study-me-calendar-events` as the storage key
- Keep event shape exactly aligned with the approved spec:

```ts
export interface CalendarEvent {
  id: string;
  title: string;
  type: 'exam' | 'birthday' | 'reminder' | 'task' | 'other';
  date: string;
  time: string;
  note: string;
}
```

- Normalize all comparisons around a single helper that combines `date` + `time` into a comparable timestamp to avoid timezone drift from ad hoc parsing
- Use `npm run lint` for automated verification because the repo does not currently include a test runner

### Task 1: Create Shared Calendar Helpers

**Files:**
- Create: `src/lib/calendar.ts`

- [ ] **Step 1: Create the new helper file with shared types, storage, and selectors**

```ts
export const CALENDAR_STORAGE_KEY = 'study-me-calendar-events';

export type CalendarEventType = 'exam' | 'birthday' | 'reminder' | 'task' | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string;
  time: string;
  note: string;
}

export interface CalendarDayCell {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
}

const pad = (value: number) => value.toString().padStart(2, '0');

export const formatDateKey = (value: Date) => {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

export const combineEventDateTime = (event: Pick<CalendarEvent, 'date' | 'time'>) => {
  return new Date(`${event.date}T${event.time}:00`).getTime();
};

export const sortCalendarEvents = (events: CalendarEvent[]) => {
  return [...events].sort((a, b) => combineEventDateTime(a) - combineEventDateTime(b));
};

export const loadCalendarEvents = (): CalendarEvent[] => {
  const saved = localStorage.getItem(CALENDAR_STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved) as CalendarEvent[];
    return sortCalendarEvents(parsed);
  } catch (error) {
    console.error('Failed to parse calendar events', error);
    return [];
  }
};

export const saveCalendarEvents = (events: CalendarEvent[]) => {
  localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(sortCalendarEvents(events)));
};

export const getEventsForDate = (events: CalendarEvent[], date: string) => {
  return sortCalendarEvents(events.filter((event) => event.date === date));
};

export const getTodayEvents = (events: CalendarEvent[], today = new Date()) => {
  return getEventsForDate(events, formatDateKey(today));
};

export const getUpcomingEvents = (events: CalendarEvent[], now = new Date(), limit = 5) => {
  const current = now.getTime();
  return sortCalendarEvents(events)
    .filter((event) => combineEventDateTime(event) >= current)
    .slice(0, limit);
};

export const buildMonthGrid = (visibleMonth: Date): CalendarDayCell[] => {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const cells: CalendarDayCell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const date = new Date(year, month - 1, previousMonthDays - i);
    cells.push({
      date: formatDateKey(date),
      dayOfMonth: date.getDate(),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({
      date: formatDateKey(date),
      dayOfMonth: day,
      isCurrentMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    const offset = cells.length - (firstWeekday + daysInMonth) + 1;
    const date = new Date(year, month + 1, offset);
    cells.push({
      date: formatDateKey(date),
      dayOfMonth: date.getDate(),
      isCurrentMonth: false,
    });
  }

  return cells;
};
```

- [ ] **Step 2: Run lint to verify the helper file type-checks**

Run: `npm run lint`
Expected: `tsc --noEmit` exits successfully

- [ ] **Step 3: Commit the helper module**

```bash
git add src/lib/calendar.ts
git commit -m "feat(calendar): add shared calendar helpers"
```

### Task 2: Wire The New Calendar Module Into App Routing

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Update the shared module union in `Dashboard.tsx`**

Replace the existing `ModuleId` line with:

```ts
export type ModuleId =
  | 'dashboard'
  | 'subjects'
  | 'tasks'
  | 'exams'
  | 'languages'
  | 'finance'
  | 'diary'
  | 'calendar';
```

- [ ] **Step 2: Import the new page in `App.tsx` and add its route branch**

Update `src/App.tsx` to this shape:

```tsx
import { useState } from 'react';
import { Dashboard, ModuleId } from './components/Dashboard';
import { Diary } from './components/Diary';
import { DailyTasks } from './components/DailyTasks';
import { ExamCreator } from './components/ExamCreator';
import { Languages } from './components/Languages';
import { Subjects } from './components/Subjects';
import { Finance } from './components/Finance';
import { Calendar } from './components/Calendar';

export default function App() {
  const [currentModule, setCurrentModule] = useState<ModuleId>('dashboard');

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {currentModule === 'dashboard' && <Dashboard onNavigate={setCurrentModule} />}
      {currentModule === 'diary' && <Diary onNavigate={setCurrentModule} />}
      {currentModule === 'tasks' && <DailyTasks onNavigate={setCurrentModule} />}
      {currentModule === 'exams' && <ExamCreator onNavigate={setCurrentModule} />}
      {currentModule === 'languages' && <Languages onNavigate={setCurrentModule} />}
      {currentModule === 'subjects' && <Subjects onNavigate={setCurrentModule} />}
      {currentModule === 'finance' && <Finance onNavigate={setCurrentModule} />}
      {currentModule === 'calendar' && <Calendar onNavigate={setCurrentModule} />}
    </div>
  );
}
```

- [ ] **Step 3: Run lint to verify the new route wiring**

Run: `npm run lint`
Expected: If `Calendar.tsx` has already been created, `tsc --noEmit` exits successfully. If not, defer this lint command until immediately after Task 3 Step 1 so the new import resolves.

- [ ] **Step 4: Commit the route wiring**

```bash
git add src/App.tsx src/components/Dashboard.tsx
git commit -m "feat(calendar): wire calendar module routing"
```

### Task 3: Build The Calendar Page Skeleton

**Files:**
- Create: `src/components/Calendar.tsx`
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/App.tsx`
- Create: `src/lib/calendar.ts`

- [ ] **Step 1: Create the initial `Calendar.tsx` page shell**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { ModuleId } from './Dashboard';
import {
  buildMonthGrid,
  CalendarEvent,
  formatDateKey,
  getEventsForDate,
  getUpcomingEvents,
  loadCalendarEvents,
} from '../lib/calendar';

interface CalendarProps {
  onNavigate: (module: ModuleId) => void;
}

export function Calendar({ onNavigate }: CalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()));

  useEffect(() => {
    setEvents(loadCalendarEvents());
  }, []);

  const monthCells = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const selectedDayEvents = useMemo(() => getEventsForDate(events, selectedDate), [events, selectedDate]);
  const upcomingEvents = useMemo(() => getUpcomingEvents(events), [events]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-10">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-neutral-400">
          <CalendarIcon className="w-4 h-4" />
          Calendar
        </div>
      </motion.div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h1>
          <p className="text-neutral-500 mt-2">Track exams, birthdays, reminders, and notes.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            className="w-11 h-11 border border-neutral-200 rounded-full flex items-center justify-center hover:border-black transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            className="w-11 h-11 border border-neutral-200 rounded-full flex items-center justify-center hover:border-black transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button className="h-11 px-5 bg-black text-white rounded-full text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-8">
        <section className="border border-neutral-200 bg-white p-6">
          <div className="grid grid-cols-7 gap-3 mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-3">
            {monthCells.map((cell) => (
              <button
                key={cell.date}
                onClick={() => setSelectedDate(cell.date)}
                className={`min-h-24 border p-3 text-left transition-colors ${
                  cell.date === selectedDate ? 'border-black bg-black text-white' : 'border-neutral-200 hover:border-black'
                } ${cell.isCurrentMonth ? '' : 'text-neutral-300'}`}
              >
                <div className="text-sm font-semibold">{cell.dayOfMonth}</div>
              </button>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="border border-neutral-200 bg-neutral-50 p-6">
            <h2 className="text-lg font-semibold mb-4">Selected Day</h2>
            <div className="space-y-3">
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-neutral-500">No events for this day yet.</p>
              ) : (
                selectedDayEvents.map((event) => (
                  <div key={event.id} className="border border-neutral-200 bg-white p-4">
                    <div className="text-sm font-semibold">{event.title}</div>
                    <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">{event.type} · {event.time}</div>
                    {event.note && <p className="text-sm text-neutral-600 mt-2">{event.note}</p>}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Upcoming</h2>
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-neutral-500">No upcoming events.</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="border-b border-neutral-200 pb-3 last:border-b-0">
                    <div className="text-sm font-semibold">{event.title}</div>
                    <div className="text-xs text-neutral-500 mt-1">{event.date} at {event.time}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint to verify the page skeleton compiles**

Run: `npm run lint`
Expected: `tsc --noEmit` exits successfully

- [ ] **Step 3: Commit the initial calendar page**

```bash
git add src/components/Calendar.tsx src/App.tsx src/components/Dashboard.tsx src/lib/calendar.ts
git commit -m "feat(calendar): add calendar page shell"
```

### Task 4: Add Event Form And CRUD Behavior

**Files:**
- Modify: `src/components/Calendar.tsx`

- [ ] **Step 1: Add form state, edit state, and save/delete handlers**

Insert this state near the top of `Calendar.tsx` after the existing `selectedDate` state:

```tsx
  const emptyForm = {
    title: '',
    type: 'exam' as CalendarEvent['type'],
    date: formatDateKey(new Date()),
    time: '09:00',
    note: '',
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreateForm = (date = selectedDate) => {
    setEditingEventId(null);
    setForm({ ...emptyForm, date });
    setIsFormOpen(true);
  };

  const openEditForm = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setForm({
      title: event.title,
      type: event.type,
      date: event.date,
      time: event.time,
      note: event.note,
    });
    setIsFormOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.type || !form.date || !form.time) return;

    const nextEvent: CalendarEvent = {
      id: editingEventId ?? Date.now().toString(),
      title: form.title.trim(),
      type: form.type,
      date: form.date,
      time: form.time,
      note: form.note.trim(),
    };

    const nextEvents = editingEventId
      ? events.map((event) => (event.id === editingEventId ? nextEvent : event))
      : [...events, nextEvent];

    setEvents(nextEvents);
    saveCalendarEvents(nextEvents);
    setSelectedDate(nextEvent.date);
    setEditingEventId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  };

  const handleDeleteEvent = (id: string) => {
    const nextEvents = events.filter((event) => event.id !== id);
    setEvents(nextEvents);
    saveCalendarEvents(nextEvents);
    if (editingEventId === id) {
      setEditingEventId(null);
      setForm(emptyForm);
      setIsFormOpen(false);
    }
  };
```

- [ ] **Step 2: Update the imports and button wiring**

Change the `Calendar.tsx` imports and `Add Event` button like this:

```tsx
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  buildMonthGrid,
  CalendarEvent,
  formatDateKey,
  getEventsForDate,
  getUpcomingEvents,
  loadCalendarEvents,
  saveCalendarEvents,
} from '../lib/calendar';
```

```tsx
<button
  onClick={() => openCreateForm()}
  className="h-11 px-5 bg-black text-white rounded-full text-sm font-semibold flex items-center gap-2"
>
  <Plus className="w-4 h-4" />
  Add Event
</button>
```

- [ ] **Step 3: Add the actual form UI above the grid**

Add this block just before the main calendar grid wrapper:

```tsx
      {isFormOpen && (
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSaveEvent}
          className="border border-neutral-200 bg-neutral-50 p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <input
            value={form.title}
            onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
            placeholder="Event title"
            className="border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black md:col-span-2"
          />
          <select
            value={form.type}
            onChange={(e) => setForm((current) => ({ ...current, type: e.target.value as CalendarEvent['type'] }))}
            className="border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
          >
            <option value="exam">Exam</option>
            <option value="birthday">Birthday</option>
            <option value="reminder">Reminder</option>
            <option value="task">Task</option>
            <option value="other">Other</option>
          </select>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))}
            className="border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
          />
          <input
            type="time"
            value={form.time}
            onChange={(e) => setForm((current) => ({ ...current, time: e.target.value }))}
            className="border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
          />
          <textarea
            value={form.note}
            onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))}
            placeholder="Note"
            rows={4}
            className="border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black md:col-span-2"
          />
          <div className="md:col-span-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingEventId(null);
                setForm(emptyForm);
                setIsFormOpen(false);
              }}
              className="px-5 py-3 border border-neutral-300 text-sm font-semibold"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-3 bg-black text-white text-sm font-semibold">
              {editingEventId ? 'Save Changes' : 'Add Event'}
            </button>
          </div>
        </motion.form>
      )}
```

- [ ] **Step 4: Add edit/delete controls inside the selected-day list**

Replace the selected-day event card body with:

```tsx
                selectedDayEvents.map((event) => (
                  <div key={event.id} className="border border-neutral-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold">{event.title}</div>
                        <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">
                          {event.type} · {event.time}
                        </div>
                        {event.note && <p className="text-sm text-neutral-600 mt-2">{event.note}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditForm(event)}
                          className="w-9 h-9 border border-neutral-200 flex items-center justify-center hover:border-black transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="w-9 h-9 border border-neutral-200 flex items-center justify-center hover:border-red-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
```

- [ ] **Step 5: Make day clicks prefill the form-friendly selection flow**

Update the day button click to:

```tsx
onClick={() => {
  setSelectedDate(cell.date);
  if (isFormOpen && !editingEventId) {
    setForm((current) => ({ ...current, date: cell.date }));
  }
}}
```

- [ ] **Step 6: Run lint to verify CRUD behavior compiles**

Run: `npm run lint`
Expected: `tsc --noEmit` exits successfully

- [ ] **Step 7: Commit the CRUD behavior**

```bash
git add src/components/Calendar.tsx
git commit -m "feat(calendar): add event form and CRUD"
```

### Task 5: Add Day Markers And Better Calendar Metadata

**Files:**
- Modify: `src/components/Calendar.tsx`

- [ ] **Step 1: Add helpers for today and event counts near the memoized state**

Insert:

```tsx
  const todayKey = formatDateKey(new Date());
  const eventCountByDate = useMemo(() => {
    return events.reduce<Record<string, number>>((counts, event) => {
      counts[event.date] = (counts[event.date] ?? 0) + 1;
      return counts;
    }, {});
  }, [events]);
```

- [ ] **Step 2: Update the day cell rendering to show markers for today, selected date, and event counts**

Replace the day button body with:

```tsx
              <button
                key={cell.date}
                onClick={() => {
                  setSelectedDate(cell.date);
                  if (isFormOpen && !editingEventId) {
                    setForm((current) => ({ ...current, date: cell.date }));
                  }
                }}
                className={`min-h-24 border p-3 text-left transition-colors ${
                  cell.date === selectedDate ? 'border-black bg-black text-white' : 'border-neutral-200 hover:border-black'
                } ${cell.isCurrentMonth ? '' : 'text-neutral-300'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold">{cell.dayOfMonth}</div>
                  {cell.date === todayKey && (
                    <span className={`text-[10px] uppercase tracking-wider ${cell.date === selectedDate ? 'text-white/70' : 'text-neutral-400'}`}>
                      Today
                    </span>
                  )}
                </div>
                {eventCountByDate[cell.date] ? (
                  <div className="mt-6">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${
                      cell.date === selectedDate ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {eventCountByDate[cell.date]} event{eventCountByDate[cell.date] > 1 ? 's' : ''}
                    </span>
                  </div>
                ) : null}
              </button>
```

- [ ] **Step 3: Improve the selected-day heading to show the chosen date**

Replace the heading block with:

```tsx
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Selected Day</h2>
              <p className="text-sm text-neutral-500 mt-1">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
```

- [ ] **Step 4: Run lint to verify the month view updates**

Run: `npm run lint`
Expected: `tsc --noEmit` exits successfully

- [ ] **Step 5: Commit the month-grid polish**

```bash
git add src/components/Calendar.tsx
git commit -m "feat(calendar): show event markers in month view"
```

### Task 6: Add Dashboard Calendar Summary And Remove The Languages Card

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Import the shared calendar selectors into `Dashboard.tsx`**

Add this import after the `aviationFacts` import:

```ts
import { getTodayEvents, getUpcomingEvents, loadCalendarEvents } from '../lib/calendar';
```

- [ ] **Step 2: Load dashboard calendar summaries near the existing derived state**

Add this state and memoized selectors near the existing `subjects` and task-derived state:

```ts
  const [calendarEvents, setCalendarEvents] = useState(() => loadCalendarEvents());

  useEffect(() => {
    setCalendarEvents(loadCalendarEvents());
  }, []);

  const todayEvents = useMemo(() => getTodayEvents(calendarEvents), [calendarEvents]);
  const upcomingCalendarEvents = useMemo(() => getUpcomingEvents(calendarEvents, new Date(), 3), [calendarEvents]);
```

- [ ] **Step 3: Replace the dashboard module cards list so it adds Calendar and removes Languages**

Find the array that currently contains:

```ts
{ id: 'tasks', title: "Daily Tasks", desc: "Checklist", icon: Calendar },
{ id: 'languages', title: "Languages", desc: "Study Cards", icon: Globe },
```

Replace that section with:

```ts
{ id: 'tasks', title: 'Daily Tasks', desc: 'Checklist', icon: Calendar },
{ id: 'calendar', title: 'Calendar', desc: 'Events & Notes', icon: Bell },
```

Also remove the unused `Globe` import from the `lucide-react` import list.

- [ ] **Step 4: Add a dashboard card for today and upcoming calendar events**

Insert a new motion card near the other dashboard panels:

```tsx
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
          whileHover={{ scale: 1.02 }}
          className="col-span-1 border border-neutral-200 bg-white p-8 group hover:border-black hover:shadow-lg transition-all duration-500"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-400 mb-2">Calendar</p>
              <h3 className="text-2xl font-bold tracking-tight">Today & Upcoming</h3>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-sm font-semibold text-neutral-500 hover:text-black transition-colors"
            >
              Open
            </button>
          </div>

          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-400 mb-2">Today</p>
            {todayEvents.length === 0 ? (
              <p className="text-sm text-neutral-500">No events today.</p>
            ) : (
              <div className="space-y-3">
                {todayEvents.slice(0, 2).map((event) => (
                  <div key={event.id} className="border border-neutral-200 p-4">
                    <div className="text-sm font-semibold">{event.title}</div>
                    <div className="text-xs text-neutral-500 mt-1">{event.time} · {event.type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-400 mb-2">Upcoming</p>
            {upcomingCalendarEvents.length === 0 ? (
              <p className="text-sm text-neutral-500">No upcoming events.</p>
            ) : (
              <div className="space-y-3">
                {upcomingCalendarEvents.map((event) => (
                  <div key={event.id} className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-3 last:border-b-0">
                    <div>
                      <div className="text-sm font-semibold">{event.title}</div>
                      <div className="text-xs text-neutral-500 mt-1">{event.date}</div>
                    </div>
                    <div className="text-xs font-medium text-neutral-500">{event.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
```

- [ ] **Step 5: Run lint to verify the dashboard update compiles**

Run: `npm run lint`
Expected: `tsc --noEmit` exits successfully

- [ ] **Step 6: Commit the dashboard integration**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat(dashboard): add calendar summary card"
```

### Task 7: Final Verification And Push

**Files:**
- Modify: `src/components/Calendar.tsx`
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/App.tsx`
- Create: `src/lib/calendar.ts`

- [ ] **Step 1: Run the full automated verification**

Run: `npm run lint`
Expected: `tsc --noEmit` exits successfully with no new errors

- [ ] **Step 2: Run the app for manual verification**

Run: `npm run dev`
Expected: local dev server starts successfully and the app opens with the dashboard

- [ ] **Step 3: Manually verify the approved spec behavior**

Check all of these in the browser:

```text
1. Open Calendar from the dashboard.
2. Add an exam with title, type, date, time, and note.
3. Confirm the date cell shows an event marker/count.
4. Click the same day and confirm the event appears in Selected Day.
5. Edit the event and confirm the updates persist.
6. Delete the event and confirm it disappears from Calendar and Dashboard.
7. Add a birthday for today and confirm it appears in the Today section.
8. Add two future reminders and confirm they appear in Upcoming in the correct order.
9. Confirm the Language Study dashboard card is gone.
10. Confirm the Languages page still opens if routed to from any remaining app navigation.
11. Refresh the page and confirm calendar data persists.
```

- [ ] **Step 4: Commit the final verified implementation**

```bash
git add src/App.tsx src/components/Dashboard.tsx src/components/Calendar.tsx src/lib/calendar.ts
git commit -m "feat(calendar): add calendar planner and dashboard summary"
```

- [ ] **Step 5: Push the branch**

```bash
git push origin main
```
