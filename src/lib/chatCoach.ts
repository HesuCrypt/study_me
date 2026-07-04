export type ChatCoachRole = 'user' | 'assistant' | 'system';
export type ChatCoachMode = 'gentle' | 'strict' | 'exam';

export interface ChatCoachMessage {
  id: string;
  role: ChatCoachRole;
  content: string;
  createdAt: string;
}

export interface StoredTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskActionSuggestion {
  kind: 'task';
  label: string;
  taskText: string;
}

export interface CalendarActionSuggestion {
  kind: 'calendar';
  label: string;
  event: {
    title: string;
    type: 'exam' | 'birthday' | 'reminder' | 'task' | 'other';
    date: string;
    time: string;
    note: string;
  };
}

export type ChatCoachSuggestedAction = TaskActionSuggestion | CalendarActionSuggestion;

export const CHAT_COACH_HISTORY_KEY = 'study-me-chat-coach-history';
export const CHAT_COACH_OPEN_KEY = 'study-me-chat-coach-open';
export const CHAT_COACH_LAST_NUDGE_KEY = 'study-me-chat-coach-last-nudge';
export const CHAT_COACH_MODE_KEY = 'study-me-chat-coach-mode';
export const CHAT_COACH_HISTORY_LIMIT = 24;
export const TASKS_STORAGE_KEY = 'study-me-tasks';

export const CHAT_COACH_QUICK_PROMPTS = [
  'Motivate me to study',
  'What should I study next?',
  'Help me plan tonight',
  'Quiz me on this topic',
] as const;

export const CHAT_COACH_SYSTEM_PROMPT =
  "You are Study Me's AI coach. Speak like a polished flight attendant: warm, professional, gently firm, and encouraging. Keep guiding the user back to studying, focus, tasks, revision, or practical next steps. Be concise by default. Never shame the user. Never claim to have modified tasks, calendar entries, or app data unless the UI explicitly confirms that action.";

export const createChatCoachMessage = (
  role: ChatCoachRole,
  content: string,
  createdAt = new Date().toISOString()
): ChatCoachMessage => ({
  id: `${role}-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  createdAt,
});

export const trimChatCoachHistory = (
  messages: ChatCoachMessage[],
  limit = CHAT_COACH_HISTORY_LIMIT
) => {
  return messages.slice(-limit);
};

export const loadChatCoachHistory = (): ChatCoachMessage[] => {
  const saved = localStorage.getItem(CHAT_COACH_HISTORY_KEY);
  if (!saved) return [];

  try {
    return trimChatCoachHistory(JSON.parse(saved) as ChatCoachMessage[]);
  } catch (error) {
    console.error('Failed to parse chat coach history', error);
    return [];
  }
};

export const saveChatCoachHistory = (messages: ChatCoachMessage[]) => {
  localStorage.setItem(CHAT_COACH_HISTORY_KEY, JSON.stringify(trimChatCoachHistory(messages)));
};

export const loadChatCoachOpenState = () => {
  return localStorage.getItem(CHAT_COACH_OPEN_KEY) === 'true';
};

export const saveChatCoachOpenState = (isOpen: boolean) => {
  localStorage.setItem(CHAT_COACH_OPEN_KEY, String(isOpen));
};

export const loadChatCoachMode = (): ChatCoachMode => {
  const saved = localStorage.getItem(CHAT_COACH_MODE_KEY);
  return saved === 'strict' || saved === 'exam' || saved === 'gentle' ? saved : 'gentle';
};

export const saveChatCoachMode = (mode: ChatCoachMode) => {
  localStorage.setItem(CHAT_COACH_MODE_KEY, mode);
};

export const loadLastCoachNudge = () => {
  return localStorage.getItem(CHAT_COACH_LAST_NUDGE_KEY);
};

export const saveLastCoachNudge = (createdAt: string) => {
  localStorage.setItem(CHAT_COACH_LAST_NUDGE_KEY, createdAt);
};

export const shouldTriggerCoachNudge = (
  now: Date,
  lastNudgeAt: string | null,
  minIntervalMs = 1000 * 60 * 45
) => {
  if (!lastNudgeAt) return true;
  const lastTime = new Date(lastNudgeAt).getTime();
  if (Number.isNaN(lastTime)) return true;
  return now.getTime() - lastTime >= minIntervalMs;
};

export const buildCoachNudge = (now = new Date()) => {
  const hour = now.getHours();
  const content =
    hour < 12
      ? 'Captain, let us start strong. Pick one study task and begin now.'
      : hour < 18
        ? 'Quick check-in, captain: what is the next lesson or reviewer we should finish today?'
        : 'Evening check, captain. Before we relax, let us clear one small study task first.';

  return createChatCoachMessage('assistant', content, now.toISOString());
};

export const getRecommendedCoachMode = (
  currentModule: string,
  latestUserMessage: string
): ChatCoachMode => {
  const text = latestUserMessage.toLowerCase();

  if (currentModule === 'exams' || /quiz|review|exam|test|recall|finals/.test(text)) {
    return 'exam';
  }

  if (/procrastinat|lazy|discipline|strict|push me/.test(text)) {
    return 'strict';
  }

  return 'gentle';
};

export const isTaskActionSuggestion = (value: unknown): value is TaskActionSuggestion => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as TaskActionSuggestion;
  return candidate.kind === 'task' && typeof candidate.label === 'string' && typeof candidate.taskText === 'string';
};

export const isCalendarActionSuggestion = (value: unknown): value is CalendarActionSuggestion => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as CalendarActionSuggestion;
  return (
    candidate.kind === 'calendar' &&
    typeof candidate.label === 'string' &&
    !!candidate.event &&
    typeof candidate.event.title === 'string' &&
    typeof candidate.event.type === 'string' &&
    typeof candidate.event.date === 'string' &&
    typeof candidate.event.time === 'string' &&
    typeof candidate.event.note === 'string'
  );
};

export const createSuggestedTaskAction = (taskText: string): TaskActionSuggestion => ({
  kind: 'task',
  label: 'Add to Tasks',
  taskText,
});

export const createSuggestedCalendarAction = (
  event: CalendarActionSuggestion['event']
): CalendarActionSuggestion => ({
  kind: 'calendar',
  label: 'Add to Calendar',
  event,
});

export const buildTaskFromSuggestion = (suggestion: TaskActionSuggestion): StoredTask => ({
  id: Date.now().toString(),
  text: suggestion.taskText.trim(),
  completed: false,
});

export const extractSuggestedActionFromReply = (replyText: string) => {
  const lines = replyText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const actionLine = [...lines]
    .reverse()
    .find((line) => line.startsWith('ACTION_TASK:') || line.startsWith('ACTION_CALENDAR:'));

  const content = lines
    .filter((line) => line !== actionLine)
    .join('\n')
    .trim();

  if (!actionLine) {
    return {
      content: content || replyText.trim(),
      suggestedAction: undefined,
    };
  }

  if (actionLine.startsWith('ACTION_TASK:')) {
    const taskText = actionLine.replace('ACTION_TASK:', '').trim();
    return {
      content,
      suggestedAction: taskText ? createSuggestedTaskAction(taskText) : undefined,
    };
  }

  const raw = actionLine.replace('ACTION_CALENDAR:', '').trim();
  const [title, type, date, time, note] = raw.split('|').map((value) => value?.trim() ?? '');

  if (title && type && date && time) {
    return {
      content,
      suggestedAction: createSuggestedCalendarAction({
        title,
        type: type as CalendarActionSuggestion['event']['type'],
        date,
        time,
        note,
      }),
    };
  }

  return {
    content,
    suggestedAction: undefined,
  };
};

export const toGeminiContents = (messages: ChatCoachMessage[]) => {
  return trimChatCoachHistory(messages)
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
};
