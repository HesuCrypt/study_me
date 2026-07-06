import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle, Sparkles, X } from 'lucide-react';
import type { ModuleId } from './Dashboard';
import { ModeSwitcher } from './chat-coach/ModeSwitcher';
import { ChatCoachThread } from './chat-coach/ChatCoachThread';
import { ChatComposerDock } from './chat-coach/ChatComposerDock';
import {
  type ChatCoachController,
  useChatCoachController,
} from './chat-coach/useChatCoachController';
import {
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
      
      // Lock scroll on mobile only
      const lockBodyScroll = () => {
        if (window.innerWidth < 640) {
          document.body.style.overflow = 'hidden';
          document.body.style.position = 'fixed';
          document.body.style.width = '100%';
          document.body.style.height = '100%';
        } else {
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.width = '';
          document.body.style.height = '';
        }
      };

      lockBodyScroll();
      window.addEventListener('resize', lockBodyScroll);
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        window.removeEventListener('resize', lockBodyScroll);
      };
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
    return activeController.isSending ? 'Thinking...' : 'Simple guidance, ready when you are.';
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

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Study Coach"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/80 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:scale-105 active:scale-95"
      >
        <MessageCircle className="h-5 w-5" />
        {hasUnreadNudge && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-white ring-2 ring-black animate-pulse" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.section
            role="dialog"
            aria-label="Study Coach Panel"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden bg-white text-black sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(44rem,calc(100vh-8rem))] sm:w-[min(28rem,calc(100vw-2rem))] sm:rounded-[32px] sm:border sm:border-black/8 sm:shadow-[0_30px_90px_rgba(0,0,0,0.18)]"
          >
            <div className="flex flex-col border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-5 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
                    <Sparkles className="h-4 w-4 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-black">Study Coach</p>
                    <p className="text-[10px] font-medium text-black/40 uppercase tracking-wider sm:block hidden">{subtitle}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <ModeSwitcher
                    activeMode={activeController.mode}
                    recommendedMode={activeController.recommendedMode}
                    onChange={activeController.setMode}
                  />
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close Study Coach"
                    className="rounded-full border border-black/10 bg-black/[0.03] p-1.5 text-black/70 hover:bg-black/5 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-black/50 sm:hidden block">{subtitle}</p>
                <button
                  type="button"
                  onClick={onOpenFullCoach}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
                >
                  <Sparkles className="h-3 w-3" />
                  Open Full Coach
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div
                ref={scrollContainerRef}
                aria-label="Study Coach Conversation"
                role="region"
                className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2 sm:px-5"
              >
                <ChatCoachThread
                  messages={activeController.messages}
                  isSending={activeController.isSending}
                  suggestedAction={activeController.suggestedAction}
                  reviewAction={activeController.reviewAction}
                  onReviewAction={activeController.setReviewAction}
                  onConfirmAction={activeController.confirmAction}
                  bottomAnchorRef={bottomAnchorRef}
                  surface="floating"
                />
              </div>

              <ChatComposerDock
                input={activeController.input}
                isSending={activeController.isSending}
                onInputChange={activeController.setInput}
                onSubmitMessage={activeController.sendMessage}
                theme="light"
                inputId="chat-coach-input"
              />
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
