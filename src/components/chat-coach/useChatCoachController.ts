import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildApiUrl, parseApiJson } from '../../lib/api';
import { loadCalendarEvents, saveCalendarEvents } from '../../lib/calendar';
import {
  buildTaskFromSuggestion,
  createChatCoachMessage,
  getRecommendedCoachMode,
  isCalendarActionSuggestion,
  isTaskActionSuggestion,
  loadChatCoachHistory,
  loadChatCoachMode,
  saveChatCoachHistory,
  saveChatCoachMode,
  TASKS_STORAGE_KEY,
  trimChatCoachHistory,
  type ChatCoachMessage,
  type ChatCoachMode,
  type ChatCoachSuggestedAction,
} from '../../lib/chatCoach';
import type { ModuleId } from '../Dashboard';

interface ChatCoachResponse {
  reply: ChatCoachMessage;
  suggestedAction?: unknown;
}

interface UseChatCoachControllerOptions {
  enabled?: boolean;
}

export interface ChatCoachController {
  input: string;
  isSending: boolean;
  messages: ChatCoachMessage[];
  mode: ChatCoachMode;
  recommendedMode: ChatCoachMode;
  reviewAction: ChatCoachSuggestedAction | null;
  suggestedAction: ChatCoachSuggestedAction | null;
  setInput: (value: string) => void;
  setMode: (mode: ChatCoachMode) => void;
  setReviewAction: (action: ChatCoachSuggestedAction | null) => void;
  sendMessage: (content: string) => Promise<void>;
  confirmAction: () => void;
  appendAssistantMessage: (content: string, createdAt?: string) => void;
  clearHistory: () => void;
}

export function useChatCoachController(
  currentModule: ModuleId,
  options: UseChatCoachControllerOptions = {}
): ChatCoachController {
  const enabled = options.enabled ?? true;
  const [messages, setMessages] = useState<ChatCoachMessage[]>(() => loadChatCoachHistory());
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [mode, setMode] = useState<ChatCoachMode>(() => loadChatCoachMode());
  const [suggestedAction, setSuggestedAction] = useState<ChatCoachSuggestedAction | null>(null);
  const [reviewAction, setReviewAction] = useState<ChatCoachSuggestedAction | null>(null);

  const latestUserText = [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';
  const recommendedMode = useMemo(
    () => getRecommendedCoachMode(currentModule, latestUserText || input),
    [currentModule, latestUserText, input]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    saveChatCoachHistory(messages);
  }, [enabled, messages]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    saveChatCoachMode(mode);
  }, [enabled, mode]);

  const appendAssistantFallback = useCallback(() => {
    setMessages((current) =>
      trimChatCoachHistory([
        ...current,
        createChatCoachMessage(
          'assistant',
          'We hit a little turbulence, captain. Try again and we will get your study plan back on course.'
        ),
      ])
    );
    setSuggestedAction(null);
  }, []);

  const appendAssistantMessage = useCallback(
    (content: string, createdAt?: string) => {
      if (!enabled) {
        return;
      }

      setMessages((current) =>
        trimChatCoachHistory([...current, createChatCoachMessage('assistant', content, createdAt)])
      );
    },
    [enabled]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!enabled) {
        return;
      }

      const trimmed = content.trim();
      if (!trimmed || isSending) return;

      const userMessage = createChatCoachMessage('user', trimmed);
      const nextHistory = trimChatCoachHistory([...messages, userMessage]);

      setMessages(nextHistory);
      setInput('');
      setIsSending(true);

      try {
        const response = await fetch(buildApiUrl('/api/chat-coach'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: nextHistory, mode, currentModule }),
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        const data = await parseApiJson<ChatCoachResponse>(
          response,
          'The study coach service is unavailable right now.'
        );

        setMessages((current) => trimChatCoachHistory([...current, data.reply]));
        setSuggestedAction(
          isTaskActionSuggestion(data.suggestedAction) || isCalendarActionSuggestion(data.suggestedAction)
            ? data.suggestedAction
            : null
        );
      } catch (error) {
        console.error('Failed to send coach message', error);
        appendAssistantFallback();
      } finally {
        setIsSending(false);
      }
    },
    [appendAssistantFallback, currentModule, enabled, isSending, messages, mode]
  );

  const confirmAction = useCallback(() => {
    if (!enabled || !reviewAction) {
      return;
    }

    let confirmationText = 'Saved successfully.';

    if (isTaskActionSuggestion(reviewAction)) {
      const savedTasks = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) ?? '[]');
      const nextTasks = [...savedTasks, buildTaskFromSuggestion(reviewAction)];
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(nextTasks));
      confirmationText = 'Added to Daily Tasks.';
    }

    if (isCalendarActionSuggestion(reviewAction)) {
      const currentEvents = loadCalendarEvents();
      saveCalendarEvents([
        ...currentEvents,
        {
          id: Date.now().toString(),
          title: reviewAction.event.title,
          type: reviewAction.event.type,
          date: reviewAction.event.date,
          time: reviewAction.event.time,
          note: reviewAction.event.note,
        },
      ]);
      confirmationText = 'Added to Calendar.';
    }

    setMessages((current) =>
      trimChatCoachHistory([...current, createChatCoachMessage('assistant', confirmationText)])
    );
    setReviewAction(null);
    setSuggestedAction(null);
  }, [enabled, reviewAction]);

  const clearHistory = useCallback(() => {
    if (!enabled) {
      return;
    }
    setMessages([]);
    setSuggestedAction(null);
    setReviewAction(null);
    saveChatCoachHistory([]);
  }, [enabled]);

  return {
    input,
    isSending,
    messages,
    mode,
    recommendedMode,
    reviewAction,
    suggestedAction,
    setInput,
    setMode,
    setReviewAction,
    sendMessage,
    confirmAction,
    appendAssistantMessage,
    clearHistory,
  };
}
