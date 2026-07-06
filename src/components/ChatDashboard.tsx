import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import type { ModuleId } from './Dashboard';
import { ModeSwitcher } from './chat-coach/ModeSwitcher';
import { ChatCoachThread } from './chat-coach/ChatCoachThread';
import { ChatComposerDock } from './chat-coach/ChatComposerDock';
import {
  type ChatCoachController,
  useChatCoachController,
} from './chat-coach/useChatCoachController';

interface ChatDashboardProps {
  onNavigate: (module: ModuleId) => void;
  currentModule: ModuleId;
  controller?: ChatCoachController;
}

export function ChatDashboard({ onNavigate, currentModule, controller }: ChatDashboardProps) {
  const ownedController = useChatCoachController(currentModule, { enabled: !controller });
  const activeController = controller ?? ownedController;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      bottomAnchorRef.current?.scrollIntoView({
        behavior: activeController.isSending ? 'smooth' : 'auto',
        block: 'end',
      });
      if (!bottomAnchorRef.current && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    activeController.isSending,
    activeController.messages,
    activeController.reviewAction,
    activeController.suggestedAction,
  ]);

  return (
    <div className="h-[100dvh] sm:h-auto sm:min-h-screen overflow-hidden bg-[radial-gradient(circle_at_bottom,rgba(15,23,42,0.08),transparent_38%),#ffffff] text-black">
      <div className="mx-auto flex h-full sm:min-h-screen w-full max-w-6xl flex-col px-4 pb-4 pt-4 sm:px-6 sm:pt-6 sm:pb-0">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between shrink-0"
        >
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 text-sm font-medium text-black/60 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Flight Deck
          </button>
          <p className="text-sm text-black/45">Study Coach</p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] sm:rounded-[32px] border border-black/8 bg-white/80 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:mt-6"
        >
          <div className="px-4 pb-2 pt-4 sm:px-6 lg:px-8 shrink-0">
            <div className="max-w-2xl flex sm:flex-col sm:items-start items-center justify-between gap-2">
              <div>
                <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-black">Study Coach</h1>
                <p className="mt-1.5 text-sm leading-relaxed text-black/55 sm:block hidden">
                  Your shared study conversation, kept simple and ready whenever you need the next move.
                </p>
              </div>

              <div className="mt-1 sm:mt-4">
                <ModeSwitcher
                  activeMode={activeController.mode}
                  recommendedMode={activeController.recommendedMode}
                  onChange={activeController.setMode}
                />
              </div>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            aria-label="Study Coach Conversation"
            role="region"
            className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2 sm:px-6 lg:px-8"
          >
            <ChatCoachThread
              messages={activeController.messages}
              isSending={activeController.isSending}
              suggestedAction={activeController.suggestedAction}
              reviewAction={activeController.reviewAction}
              onReviewAction={activeController.setReviewAction}
              onConfirmAction={activeController.confirmAction}
              bottomAnchorRef={bottomAnchorRef}
              surface="page"
              emptyBody="Ask for motivation, a review plan, or the next best topic to study and I will help you keep the day on course."
            />
          </div>

          <ChatComposerDock
            input={activeController.input}
            isSending={activeController.isSending}
            onInputChange={activeController.setInput}
            onSubmitMessage={activeController.sendMessage}
            theme="light"
            inputId="chat-dashboard-input"
          />
        </motion.section>
      </div>
    </div>
  );
}
