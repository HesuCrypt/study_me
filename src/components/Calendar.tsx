import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { ModuleId } from './Dashboard';
import {
  buildMonthGrid,
  type CalendarEvent,
  formatDateKey,
  getEventsForDate,
  getUpcomingEvents,
  loadCalendarEvents,
  saveCalendarEvents,
} from '../lib/calendar';

interface CalendarProps {
  onNavigate: (module: ModuleId) => void;
}

const EMPTY_FORM: Omit<CalendarEvent, 'id'> = {
  title: '',
  type: 'exam',
  date: formatDateKey(new Date()),
  time: '09:00',
  note: '',
};

export function Calendar({ onNavigate }: CalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<CalendarEvent, 'id'>>(EMPTY_FORM);

  useEffect(() => {
    setEvents(loadCalendarEvents());
  }, []);

  const monthCells = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const selectedDayEvents = useMemo(() => getEventsForDate(events, selectedDate), [events, selectedDate]);
  const upcomingEvents = useMemo(() => getUpcomingEvents(events), [events]);
  const todayKey = formatDateKey(new Date());

  const eventCountByDate = useMemo(() => {
    return events.reduce<Record<string, number>>((counts, event) => {
      counts[event.date] = (counts[event.date] ?? 0) + 1;
      return counts;
    }, {});
  }, [events]);

  const resetForm = (date = selectedDate) => {
    setEditingEventId(null);
    setForm({ ...EMPTY_FORM, date });
  };

  const openCreateForm = (date = selectedDate) => {
    resetForm(date);
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

  const handleSaveEvent = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date || !form.time) return;

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
    setVisibleMonth(new Date(`${nextEvent.date}T00:00:00`));
    setIsFormOpen(false);
    resetForm(nextEvent.date);
  };

  const handleDeleteEvent = (eventId: string) => {
    const nextEvents = events.filter((event) => event.id !== eventId);
    setEvents(nextEvents);
    saveCalendarEvents(nextEvents);

    if (editingEventId === eventId) {
      setIsFormOpen(false);
      resetForm(selectedDate);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-10"
      >
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              {visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h1>
            <p className="text-neutral-500 mt-2">Track exams, birthdays, reminders, and important study notes.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className="w-11 h-11 border border-neutral-200 rounded-full flex items-center justify-center hover:border-black transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className="w-11 h-11 border border-neutral-200 rounded-full flex items-center justify-center hover:border-black transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => openCreateForm()}
              className="h-11 px-5 bg-black text-white rounded-full text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>
        </div>
      </motion.div>

      {isFormOpen && (
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSaveEvent}
          className="border border-neutral-200 bg-neutral-50 p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2">
            <label htmlFor="calendar-title" className="block text-xs uppercase tracking-wider text-neutral-500 mb-2">
              Event Title
            </label>
            <input
              id="calendar-title"
              aria-label="Event Title"
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              placeholder="Event title"
              className="w-full border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label htmlFor="calendar-type" className="block text-xs uppercase tracking-wider text-neutral-500 mb-2">
              Event Type
            </label>
            <select
              id="calendar-type"
              aria-label="Event Type"
              value={form.type}
              onChange={(e) => setForm((current) => ({ ...current, type: e.target.value as CalendarEvent['type'] }))}
              className="w-full border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
            >
              <option value="exam">Exam</option>
              <option value="birthday">Birthday</option>
              <option value="reminder">Reminder</option>
              <option value="task">Task</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="calendar-date" className="block text-xs uppercase tracking-wider text-neutral-500 mb-2">
              Event Date
            </label>
            <input
              id="calendar-date"
              aria-label="Event Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))}
              className="w-full border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label htmlFor="calendar-time" className="block text-xs uppercase tracking-wider text-neutral-500 mb-2">
              Event Time
            </label>
            <input
              id="calendar-time"
              aria-label="Event Time"
              type="time"
              value={form.time}
              onChange={(e) => setForm((current) => ({ ...current, time: e.target.value }))}
              className="w-full border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="calendar-note" className="block text-xs uppercase tracking-wider text-neutral-500 mb-2">
              Event Note
            </label>
            <textarea
              id="calendar-note"
              aria-label="Event Note"
              value={form.note}
              onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))}
              placeholder="Note"
              rows={4}
              className="w-full border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black resize-none"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                resetForm(selectedDate);
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
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${
                        cell.date === selectedDate ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {eventCountByDate[cell.date]} event{eventCountByDate[cell.date] > 1 ? 's' : ''}
                    </span>
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="border border-neutral-200 bg-neutral-50 p-6">
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
            <div className="space-y-3">
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-neutral-500">No events for this day yet.</p>
              ) : (
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
                          aria-label={`Edit ${event.title}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="w-9 h-9 border border-neutral-200 flex items-center justify-center hover:border-red-500 hover:text-red-500 transition-colors"
                          aria-label={`Delete ${event.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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
