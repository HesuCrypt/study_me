import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import type { ModuleId } from './Dashboard';
import {
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
  trimChatCoachHistory,
  type ChatCoachMessage,
} from '../lib/chatCoach';

interface ChatCoachProps {
  currentModule: ModuleId;
}

interface ChatCoachResponse {
  reply: ChatCoachMessage;
}

export function ChatCoach({ currentModule }: ChatCoachProps) {
  const [isOpen, setIsOpen] = useState(() => loadChatCoachOpenState());
  const [messages, setMessages] = useState<ChatCoachMessage[]>(() => loadChatCoachHistory());
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasUnreadNudge, setHasUnreadNudge] = useState(false);
  const [idleSignal, setIdleSignal] = useState(0);

  const queueNudge = (delay: number) => {
    const now = new Date();
    const lastNudge = loadLastCoachNudge();

    if (!shouldTriggerCoachNudge(now, lastNudge)) {
      return undefined;
    }

    return window.setTimeout(() => {
      const nudge = buildCoachNudge(new Date());
      setMessages((current) => trimChatCoachHistory([...current, nudge]));
      saveLastCoachNudge(nudge.createdAt);
      if (!isOpen) {
        setHasUnreadNudge(true);
      }
    }, delay);
  };

  useEffect(() => {
    saveChatCoachOpenState(isOpen);
    if (isOpen) {
      setHasUnreadNudge(false);
    }
  }, [isOpen]);

  useEffect(() => {
    saveChatCoachHistory(messages);
  }, [messages]);

  useEffect(() => {
    if (currentModule !== 'dashboard') {
      return;
    }

    const timer = queueNudge(1200);
    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [currentModule, isOpen]);

  useEffect(() => {
    let idleTimer = window.setTimeout(() => setIdleSignal((value) => value + 1), 1000 * 60 * 12);

    const resetIdleTimer = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setIdleSignal((value) => value + 1), 1000 * 60 * 12);
    };

    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetIdleTimer));

    return () => {
      window.clearTimeout(idleTimer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetIdleTimer));
    };
  }, []);

  useEffect(() => {
    if (idleSignal === 0) {
      return;
    }

    const timer = queueNudge(0);
    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [idleSignal, isOpen]);

  const subtitle = useMemo(() => {
    return isSending ? 'Preparing your next instruction...' : 'Flight deck study coach';
  }, [isSending]);

  const appendAssistantFallback = () => {
    setMessages((current) =>
      trimChatCoachHistory([
        ...current,
        createChatCoachMessage(
          'assistant',
          'We hit a little turbulence, captain. Try again and we will get your study plan back on course.'
        ),
      ])
    );
  };

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    const userMessage = createChatCoachMessage('user', trimmed);
    const nextHistory = trimChatCoachHistory([...messages, userMessage]);

    setMessages(nextHistory);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextHistory }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const data = (await response.json()) as ChatCoachResponse;
      setMessages((current) => trimChatCoachHistory([...current, data.reply]));
    } catch (error) {
      console.error('Failed to send coach message', error);
      appendAssistantFallback();
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await sendMessage(input);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Study Coach"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg"
      >
        <MessageCircle className="h-5 w-5" />
        {hasUnreadNudge && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-white ring-2 ring-black" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="fixed bottom-24 right-6 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Study Coach</p>
                <h2 className="mt-1 text-lg font-semibold">Cabin Briefing</h2>
                <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Study Coach"
                className="rounded-full border border-neutral-200 p-2 text-neutral-500 hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <div className="rounded-3xl bg-neutral-50 p-4 text-sm text-neutral-600">
                  Captain, welcome aboard. Tell me what you need help studying today.
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-3xl bg-black px-4 py-3 text-sm text-white'
                      : 'max-w-[85%] rounded-3xl bg-neutral-100 px-4 py-3 text-sm text-neutral-800'
                  }
                >
                  {message.content}
                </div>
              ))}

              {isSending && (
                <div className="max-w-[85%] rounded-3xl bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
                  Preparing your next instruction...
                </div>
              )}
            </div>

            <div className="border-t border-neutral-200 px-5 py-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {CHAT_COACH_QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-full border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:border-black hover:text-black"
                    aria-label={prompt}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-3 w-3" />
                      {prompt}
                    </span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="flex items-end gap-3">
                <label htmlFor="chat-coach-input" className="sr-only">
                  Message Study Coach
                </label>
                <textarea
                  id="chat-coach-input"
                  aria-label="Message Study Coach"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask for motivation, a study plan, or your next task."
                  rows={2}
                  className="min-h-[72px] flex-1 resize-none rounded-3xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-black"
                />
                <button
                  type="submit"
                  aria-label="Send Message"
                  disabled={isSending}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
