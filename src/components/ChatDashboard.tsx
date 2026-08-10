import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Menu, X, Sparkles, Trash2 } from 'lucide-react';
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  const handleNewChat = () => {
    if (window.confirm('Start a new conversation? This will clear the current thread.')) {
      activeController.clearHistory();
    }
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex bg-[#f8fafd] text-[#1f1f1f] font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 shrink-0 bg-[#f0f4f9] border-r border-black/5 p-4 justify-between">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-2 text-sm font-medium text-black/60 transition-colors hover:text-black"
            >
              <ArrowLeft className="h-4 w-4" />
              Nurse's Station
            </button>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-3 px-4 py-3 bg-[#e3e3e3]/50 hover:bg-[#e3e3e3] text-[#1f1f1f] rounded-full text-sm font-semibold tracking-wide transition-all duration-200 shadow-xs hover:shadow-md active:scale-98"
          >
            <Plus className="h-5 w-5 text-indigo-600" />
            New chat
          </button>

          <div className="space-y-4">
            <div className="px-2">
              <h3 className="text-xs font-semibold text-black/40 uppercase tracking-wider">Coach Mode</h3>
              <p className="text-[11px] text-black/50 mt-0.5">Toggle learning intensity</p>
            </div>
            <ModeSwitcher
              activeMode={activeController.mode}
              recommendedMode={activeController.recommendedMode}
              onChange={activeController.setMode}
            />
          </div>
        </div>

        <div className="border-t border-black/5 pt-4">
          <div className="flex items-center gap-2.5 px-2 text-xs text-black/45">
            <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>AI Study Coach is here to optimize your focus, exam schedules, and tasks.</span>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar / Drawer */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#f0f4f9] p-4 justify-between md:hidden"
            >
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-black/60 transition-colors hover:text-black"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Nurse's Station
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-1 rounded-full hover:bg-black/5"
                  >
                    <X className="h-5 w-5 text-black/70" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleNewChat();
                    setIsMobileSidebarOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 bg-[#e3e3e3]/50 hover:bg-[#e3e3e3] text-[#1f1f1f] rounded-full text-sm font-semibold transition-all duration-200"
                >
                  <Plus className="h-5 w-5 text-indigo-600" />
                  New chat
                </button>

                <div className="space-y-4">
                  <div className="px-2">
                    <h3 className="text-xs font-semibold text-black/40 uppercase tracking-wider">Coach Mode</h3>
                  </div>
                  <ModeSwitcher
                    activeMode={activeController.mode}
                    recommendedMode={activeController.recommendedMode}
                    onChange={activeController.setMode}
                  />
                </div>
              </div>

              <div className="border-t border-black/5 pt-4">
                <p className="text-xs text-black/45 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  AI Study Coach helper.
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-[#f8fafd]">
        {/* Header */}
        <header className="h-14 border-b border-black/5 px-4 flex items-center justify-between shrink-0 bg-white/70 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Toggle Menu"
              className="p-2 -ml-2 rounded-full hover:bg-black/5 md:hidden"
            >
              <Menu className="h-5 w-5 text-black/70" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h1 className="font-semibold text-[15px] tracking-tight">Study Coach</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeController.messages.length > 0 && (
              <button
                type="button"
                onClick={handleNewChat}
                title="Reset conversation"
                className="p-2 rounded-full hover:bg-black/5 transition"
              >
                <Trash2 className="h-4.5 w-4.5 text-black/60 hover:text-red-500" />
              </button>
            )}
            <span className="text-xs font-medium px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
              {activeController.mode}
            </span>
          </div>
        </header>

        {/* Message Thread Area */}
        <div
          ref={scrollContainerRef}
          aria-label="Study Coach Conversation"
          role="region"
          className="flex-1 overflow-y-auto w-full"
        >
          <div className="max-w-3xl mx-auto px-4 py-6 md:px-8">
            <ChatCoachThread
              messages={activeController.messages}
              isSending={activeController.isSending}
              suggestedAction={activeController.suggestedAction}
              reviewAction={activeController.reviewAction}
              onReviewAction={activeController.setReviewAction}
              onConfirmAction={activeController.confirmAction}
              bottomAnchorRef={bottomAnchorRef}
              surface="page"
              emptyTitle="Hello. What should we tackle today?"
              emptyBody="Ask for motivation, a review plan, or the next best topic to study and I will help you keep the day on course."
            />
          </div>
        </div>

        {/* Composer Bar Dock */}
        <div className="w-full bg-[#f8fafd] py-2">
          <div className="max-w-3xl mx-auto w-full px-4 md:px-8">
            <ChatComposerDock
              input={activeController.input}
              isSending={activeController.isSending}
              onInputChange={activeController.setInput}
              onSubmitMessage={activeController.sendMessage}
              theme="light"
              inputId="chat-dashboard-input"
              variant="floating"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
