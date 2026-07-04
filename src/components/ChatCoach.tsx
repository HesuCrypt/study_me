import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import type { ModuleId } from './Dashboard';
import { ActionCard } from './chat-coach/ActionCard';
import { ConfirmationSheet } from './chat-coach/ConfirmationSheet';
import { ModeSwitcher } from './chat-coach/ModeSwitcher';
import {
  type ChatCoachController,
  useChatCoachController,
} from './chat-coach/useChatCoachController';
import {
  CHAT_COACH_QUICK_PROMPTS,
  buildCoachNudge,
  loadChatCoachOpenState,
  loadLastCoachNudge,
  saveChatCoachOpenState,
  saveLastCoachNudge,
  shouldTriggerCoachNudge,
} from '../lib/chatCoach';

interface ChatCoachProps {
  currentModule: ModuleId;
  onOpenFullCoach?: () => void;
  controller?: ChatCoachController;
}

export function ChatCoach({ currentModule, onOpenFullCoach = () => {}, controller }: ChatCoachProps) {
  const ownedController = useChatCoachController(currentModule, { enabled: !controller });
  const activeController = controller ?? ownedController;
  const [isOpen, setIsOpen] = useState(() => loadChatCoachOpenState());
  const [hasUnreadNudge, setHasUnreadNudge] = useState(false);
  const [idleSignal, setIdleSignal] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  const queueNudge = (delay: number) => {
    const now = new Date();
    const lastNudge = loadLastCoachNudge();

    if (!shouldTriggerCoachNudge(now, lastNudge)) {
      return undefined;
    }

    return window.setTimeout(() => {
      const nudge = buildCoachNudge(new Date());
      activeController.appendAssistantMessage(nudge.content, nudge.createdAt);
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
    return activeController.isSending ? 'Preparing your next instruction...' : 'Premium study guidance, captain.';
  }, [activeController.isSending]);

  const scrollToLatest = (behavior: ScrollBehavior = 'smooth') => {
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior, block: 'end' });
      return;
    }

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const behavior: ScrollBehavior = activeController.isSending ? 'smooth' : 'auto';
    const frame = window.requestAnimationFrame(() => {
      scrollToLatest(behavior);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeController.isSending, activeController.messages, activeController.reviewAction, activeController.suggestedAction, isOpen]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await activeController.sendMessage(activeController.input);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Study Coach"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/80 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl"
      >
        <MessageCircle className="h-5 w-5" />
        {hasUnreadNudge && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-white ring-2 ring-black" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.section
            role="dialog"
            aria-label="Study Coach Panel"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className="fixed inset-x-3 bottom-3 top-auto z-50 overflow-hidden rounded-[28px] border border-slate-900/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.82))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[min(27rem,calc(100vw-2rem))]"
          >
            <div className="border-b border-white/10 px-5 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/60">Study Coach</p>
                  <h2 className="mt-2 text-lg font-semibold">Cabin Briefing</h2>
                  <p className="mt-1 text-sm text-white/70">{subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Study Coach"
                  className="rounded-full border border-white/15 bg-white/10 p-2 text-white/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <ModeSwitcher
                  activeMode={activeController.mode}
                  recommendedMode={activeController.recommendedMode}
                  onChange={activeController.setMode}
                />
              </div>

              <button
                type="button"
                onClick={onOpenFullCoach}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/85"
              >
                <Sparkles className="h-3 w-3" />
                Open Full Coach
              </button>
            </div>

            <div ref={scrollContainerRef} className="max-h-[min(82vh,20rem)] space-y-3 overflow-y-auto px-5 py-4 sm:max-h-80">
              {activeController.messages.length === 0 && (
                <div className="rounded-3xl bg-white/10 p-4 text-sm text-white/85">
                  Captain, welcome aboard. Tell me what you need help studying today.
                </div>
              )}

              {activeController.messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-3xl bg-white px-4 py-3 text-sm text-black'
                      : 'max-w-[85%] rounded-3xl bg-white/12 px-4 py-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                  }
                >
                  {message.content}
                </div>
              ))}

              {activeController.suggestedAction && (
                <ActionCard
                  action={activeController.suggestedAction}
                  onReview={() => activeController.setReviewAction(activeController.suggestedAction)}
                />
              )}

              {activeController.isSending && (
                <div className="max-w-[85%] rounded-3xl bg-white/12 px-4 py-3 text-sm text-white/70">
                  Preparing your next instruction...
                </div>
              )}

              <div ref={bottomAnchorRef} aria-hidden="true" className="h-px w-full" />

            </div>

            <div className="border-t border-white/10 px-5 py-4">
              {activeController.reviewAction && (
                <div className="mb-4">
                  <ConfirmationSheet
                    action={activeController.reviewAction}
                    onConfirm={activeController.confirmAction}
                    onCancel={() => activeController.setReviewAction(null)}
                  />
                </div>
              )}

              <div className="mb-3 flex flex-wrap gap-2">
                {CHAT_COACH_QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void activeController.sendMessage(prompt)}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white/85"
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
                  value={activeController.input}
                  onChange={(event) => activeController.setInput(event.target.value)}
                  placeholder="Ask for motivation, a study plan, or a calendar suggestion."
                  rows={2}
                  className="min-h-[76px] flex-1 resize-none rounded-3xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/55"
                />
                <button
                  type="submit"
                  aria-label="Send Message"
                  disabled={activeController.isSending}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black disabled:opacity-50"
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
