import { beforeEach, describe, expect, it } from 'vitest';
import {
  CHAT_COACH_HISTORY_KEY,
  CHAT_COACH_LAST_NUDGE_KEY,
  CHAT_COACH_MODE_KEY,
  CHAT_COACH_OPEN_KEY,
  CHAT_COACH_QUICK_PROMPTS,
  buildTaskFromSuggestion,
  buildCoachNudge,
  extractSuggestedActionFromReply,
  createSuggestedCalendarAction,
  createChatCoachMessage,
  createSuggestedTaskAction,
  getRecommendedCoachMode,
  isCalendarActionSuggestion,
  isTaskActionSuggestion,
  loadChatCoachHistory,
  loadChatCoachMode,
  loadChatCoachOpenState,
  loadLastCoachNudge,
  saveChatCoachMode,
  saveChatCoachHistory,
  saveChatCoachOpenState,
  saveLastCoachNudge,
  shouldTriggerCoachNudge,
  toGeminiContents,
  trimChatCoachHistory,
  type CalendarActionSuggestion,
  type TaskActionSuggestion,
} from './chatCoach';

describe('chatCoach helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('recovers from broken history JSON', () => {
    localStorage.setItem(CHAT_COACH_HISTORY_KEY, '{broken json');
    expect(loadChatCoachHistory()).toEqual([]);
  });

  it('persists trimmed history only', () => {
    const messages = Array.from({ length: 30 }, (_, index) =>
      createChatCoachMessage('user', `message ${index + 1}`, `2026-07-03T00:${String(index).padStart(2, '0')}:00.000Z`)
    );

    saveChatCoachHistory(messages);

    const saved = loadChatCoachHistory();
    expect(saved).toHaveLength(24);
    expect(saved[0].content).toBe('message 7');
    expect(saved[23].content).toBe('message 30');
  });

  it('stores open state and last nudge timestamps', () => {
    saveChatCoachOpenState(true);
    saveLastCoachNudge('2026-07-03T10:00:00.000Z');

    expect(localStorage.getItem(CHAT_COACH_OPEN_KEY)).toBe('true');
    expect(localStorage.getItem(CHAT_COACH_LAST_NUDGE_KEY)).toBe('2026-07-03T10:00:00.000Z');
    expect(loadChatCoachOpenState()).toBe(true);
    expect(loadLastCoachNudge()).toBe('2026-07-03T10:00:00.000Z');
  });

  it('throttles nudges within the minimum interval', () => {
    const now = new Date('2026-07-03T19:00:00.000Z');
    expect(shouldTriggerCoachNudge(now, null)).toBe(true);
    expect(shouldTriggerCoachNudge(now, '2026-07-03T18:45:00.000Z')).toBe(false);
    expect(shouldTriggerCoachNudge(now, '2026-07-03T17:45:00.000Z')).toBe(true);
  });

  it('builds a flight-attendant style nudge message', () => {
    const nudge = buildCoachNudge(new Date('2026-07-03T19:00:00.000Z'));
    expect(nudge.role).toBe('assistant');
    expect(nudge.content).toMatch(/captain|study|course/i);
  });

  it('drops system messages when building Gemini contents', () => {
    const contents = toGeminiContents([
      createChatCoachMessage('system', 'internal'),
      createChatCoachMessage('user', 'Help me study'),
      createChatCoachMessage('assistant', 'Let us review boarding procedures.'),
    ]);

    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'Help me study' }] },
      { role: 'model', parts: [{ text: 'Let us review boarding procedures.' }] },
    ]);
  });

  it('exposes the default quick prompts', () => {
    expect(CHAT_COACH_QUICK_PROMPTS).toEqual([
      'Motivate me to study',
      'What should I study next?',
      'Help me plan tonight',
      'Quiz me on this topic',
    ]);
  });

  it('trims history in memory without mutating the original array', () => {
    const messages = Array.from({ length: 26 }, (_, index) =>
      createChatCoachMessage('assistant', `reply ${index + 1}`, `2026-07-03T00:${String(index).padStart(2, '0')}:00.000Z`)
    );

    const trimmed = trimChatCoachHistory(messages);

    expect(messages).toHaveLength(26);
    expect(trimmed).toHaveLength(24);
    expect(trimmed[0].content).toBe('reply 3');
  });

  it('stores and restores the selected coach mode', () => {
    saveChatCoachMode('strict');

    expect(localStorage.getItem(CHAT_COACH_MODE_KEY)).toBe('strict');
    expect(loadChatCoachMode()).toBe('strict');
  });

  it('falls back to gentle mode when persisted mode is invalid', () => {
    localStorage.setItem(CHAT_COACH_MODE_KEY, 'captain-mode');
    expect(loadChatCoachMode()).toBe('gentle');
  });

  it('recommends exam mode for exam pages and quiz prompts', () => {
    expect(getRecommendedCoachMode('exams', 'quiz me on this topic')).toBe('exam');
    expect(getRecommendedCoachMode('dashboard', 'help me review for finals')).toBe('exam');
  });

  it('recommends strict mode for procrastination prompts', () => {
    expect(getRecommendedCoachMode('dashboard', 'i keep procrastinating')).toBe('strict');
  });

  it('recommends gentle mode for planning support', () => {
    expect(getRecommendedCoachMode('tasks', 'help me plan tonight')).toBe('gentle');
  });

  it('detects a valid task action payload', () => {
    const payload: TaskActionSuggestion = {
      kind: 'task',
      label: 'Add to Tasks',
      taskText: 'Review evacuation commands',
    };

    expect(isTaskActionSuggestion(payload)).toBe(true);
    expect(isCalendarActionSuggestion(payload)).toBe(false);
  });

  it('detects a valid calendar action payload', () => {
    const payload: CalendarActionSuggestion = {
      kind: 'calendar',
      label: 'Add to Calendar',
      event: {
        title: 'Cabin crew exam',
        type: 'exam',
        date: '2099-07-04',
        time: '09:00',
        note: 'Bring reviewer',
      },
    };

    expect(isCalendarActionSuggestion(payload)).toBe(true);
    expect(isTaskActionSuggestion(payload)).toBe(false);
  });

  it('builds a new task from a task suggestion', () => {
    const task = buildTaskFromSuggestion({
      kind: 'task',
      label: 'Add to Tasks',
      taskText: 'Review airport codes',
    });

    expect(task.text).toBe('Review airport codes');
    expect(task.completed).toBe(false);
  });

  it('creates structured helpers for action suggestions', () => {
    expect(createSuggestedTaskAction('Review service sequence')).toEqual({
      kind: 'task',
      label: 'Add to Tasks',
      taskText: 'Review service sequence',
    });

    expect(
      createSuggestedCalendarAction({
        title: 'Mock exam',
        type: 'exam',
        date: '2099-08-01',
        time: '14:00',
        note: 'Terminal procedures',
      })
    ).toEqual({
      kind: 'calendar',
      label: 'Add to Calendar',
      event: {
        title: 'Mock exam',
        type: 'exam',
        date: '2099-08-01',
        time: '14:00',
        note: 'Terminal procedures',
      },
    });
  });

  it('extracts a task action line from a coach reply', () => {
    expect(
      extractSuggestedActionFromReply(
        'Captain, lock in one next step.\nACTION_TASK: Review boarding commands'
      )
    ).toEqual({
      content: 'Captain, lock in one next step.',
      suggestedAction: {
        kind: 'task',
        label: 'Add to Tasks',
        taskText: 'Review boarding commands',
      },
    });
  });

  it('extracts a calendar action line from a coach reply', () => {
    expect(
      extractSuggestedActionFromReply(
        'I scheduled a review block for you.\nACTION_CALENDAR: Mock exam | exam | 2099-09-01 | 08:30 | Bring your reviewer'
      )
    ).toEqual({
      content: 'I scheduled a review block for you.',
      suggestedAction: {
        kind: 'calendar',
        label: 'Add to Calendar',
        event: {
          title: 'Mock exam',
          type: 'exam',
          date: '2099-09-01',
          time: '08:30',
          note: 'Bring your reviewer',
        },
      },
    });
  });
});
