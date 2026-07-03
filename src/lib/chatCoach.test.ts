import { beforeEach, describe, expect, it } from 'vitest';
import {
  CHAT_COACH_HISTORY_KEY,
  CHAT_COACH_LAST_NUDGE_KEY,
  CHAT_COACH_OPEN_KEY,
  CHAT_COACH_QUICK_PROMPTS,
  buildCoachNudge,
  createChatCoachMessage,
  loadChatCoachHistory,
  loadChatCoachOpenState,
  loadLastCoachNudge,
  saveChatCoachHistory,
  saveChatCoachOpenState,
  saveLastCoachNudge,
  shouldTriggerCoachNudge,
  toGeminiContents,
  trimChatCoachHistory,
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
});
