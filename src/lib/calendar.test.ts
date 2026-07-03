import { beforeEach, describe, expect, it } from 'vitest';
import {
  CALENDAR_STORAGE_KEY,
  buildMonthGrid,
  formatDateKey,
  getEventsForDate,
  getTodayEvents,
  getUpcomingEvents,
  loadCalendarEvents,
  saveCalendarEvents,
  sortCalendarEvents,
  type CalendarEvent,
} from './calendar';

describe('calendar helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sorts events by date and time ascending', () => {
    const events: CalendarEvent[] = [
      { id: '2', title: 'Dinner', type: 'other', date: '2026-07-04', time: '18:00', note: '' },
      { id: '1', title: 'Exam', type: 'exam', date: '2026-07-04', time: '09:00', note: '' },
      { id: '3', title: 'Birthday', type: 'birthday', date: '2026-07-05', time: '08:00', note: '' },
    ];

    expect(sortCalendarEvents(events).map((event) => event.id)).toEqual(['1', '2', '3']);
  });

  it('persists sorted events to local storage and reloads them', () => {
    const events: CalendarEvent[] = [
      { id: 'b', title: 'Reminder', type: 'reminder', date: '2026-07-10', time: '14:00', note: 'Bring notes' },
      { id: 'a', title: 'Task', type: 'task', date: '2026-07-09', time: '08:30', note: '' },
    ];

    saveCalendarEvents(events);

    expect(localStorage.getItem(CALENDAR_STORAGE_KEY)).toContain('"id":"a"');
    expect(loadCalendarEvents().map((event) => event.id)).toEqual(['a', 'b']);
  });

  it('returns today and upcoming events using the provided clock', () => {
    const events: CalendarEvent[] = [
      { id: '1', title: 'Morning exam', type: 'exam', date: '2026-07-03', time: '09:00', note: '' },
      { id: '2', title: 'Evening birthday', type: 'birthday', date: '2026-07-03', time: '19:30', note: '' },
      { id: '3', title: 'Tomorrow reminder', type: 'reminder', date: '2026-07-04', time: '10:00', note: '' },
    ];
    const now = new Date('2026-07-03T12:00:00');

    expect(getTodayEvents(events, now).map((event) => event.id)).toEqual(['1', '2']);
    expect(getUpcomingEvents(events, now, 2).map((event) => event.id)).toEqual(['2', '3']);
  });

  it('filters events for a selected date and builds a full month grid', () => {
    const events: CalendarEvent[] = [
      { id: '1', title: 'Task', type: 'task', date: '2026-07-12', time: '08:00', note: '' },
      { id: '2', title: 'Other', type: 'other', date: '2026-07-13', time: '10:00', note: '' },
    ];

    expect(getEventsForDate(events, '2026-07-12').map((event) => event.id)).toEqual(['1']);
    expect(buildMonthGrid(new Date('2026-07-01T00:00:00')).length).toBe(35);
    expect(formatDateKey(new Date('2026-07-03T21:15:00'))).toBe('2026-07-03');
  });
});
