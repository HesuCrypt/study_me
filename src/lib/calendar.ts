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
    return sortCalendarEvents(JSON.parse(saved) as CalendarEvent[]);
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
  const currentTime = now.getTime();
  return sortCalendarEvents(events)
    .filter((event) => combineEventDateTime(event) >= currentTime)
    .slice(0, limit);
};

export const buildMonthGrid = (visibleMonth: Date): CalendarDayCell[] => {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const cells: CalendarDayCell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const date = new Date(year, month - 1, daysInPreviousMonth - i);
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
    const nextDay = cells.length - (firstWeekday + daysInMonth) + 1;
    const date = new Date(year, month + 1, nextDay);
    cells.push({
      date: formatDateKey(date),
      dayOfMonth: date.getDate(),
      isCurrentMonth: false,
    });
  }

  return cells;
};
