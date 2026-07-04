import { type FormEvent, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, MessageCircle, Send, Sparkles } from 'lucide-react';
import type { ModuleId } from './Dashboard';
import { ActionCard } from './chat-coach/ActionCard';
import { ConfirmationSheet } from './chat-coach/ConfirmationSheet';
import { ModeSwitcher } from './chat-coach/ModeSwitcher';
import {
  type ChatCoachController,
  useChatCoachController,
} from './chat-coach/useChatCoachController';
import { CHAT_COACH_QUICK_PROMPTS } from '../lib/chatCoach';

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await activeController.sendMessage(activeController.input);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-20 min-h-screen flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-12"
      >
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Flight Deck
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-neutral-400">
          <MessageCircle className="w-4 h-4" />
          Study Coach Module
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col"
      >
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Study Coach</h1>
            <p className="text-neutral-500">Your AI briefing space for study planning, focus, and review.</p>
          </div>
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_20rem] gap-6">
          <div className="overflow-hidden border border-neutral-200 bg-white shadow-sm">
            <header className="border-b border-neutral-200 px-5 py-5 md:px-8">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Study Coach</p>
              <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight">Coach Cockpit</h2>
              <p className="mt-3 max-w-2xl text-sm text-neutral-500 md:text-base">
                Continue your shared conversation with more room for planning, focus, and review.
              </p>
              <div className="mt-4 inline-block rounded-full bg-slate-900 px-3 py-2 text-white">
                <ModeSwitcher
                  activeMode={activeController.mode}
                  recommendedMode={activeController.recommendedMode}
                  onChange={activeController.setMode}
                />
              </div>
            </header>

            <div
              ref={scrollContainerRef}
              className="max-h-[min(64vh,34rem)] space-y-3 overflow-y-auto bg-neutral-50 px-5 py-5 md:px-8"
            >
              {activeController.messages.length === 0 && (
                <div className="rounded-3xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
                  Captain, welcome aboard. Tell me what you need help studying today.
                </div>
              )}

              {activeController.messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-3xl bg-black px-4 py-3 text-sm text-white'
                      : 'max-w-[85%] rounded-3xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700'
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
                <div className="max-w-[85%] rounded-3xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-500">
                  Preparing your next instruction...
                </div>
              )}

              <div ref={bottomAnchorRef} aria-hidden="true" className="h-px w-full" />
            </div>

            <div className="border-t border-neutral-200 bg-white px-5 py-5 md:px-8">
              {activeController.reviewAction && (
                <div className="mb-4">
                  <ConfirmationSheet
                    action={activeController.reviewAction}
                    onConfirm={activeController.confirmAction}
                    onCancel={() => activeController.setReviewAction(null)}
                  />
                </div>
              )}

              <div className="mb-4 flex flex-wrap gap-2">
                {CHAT_COACH_QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void activeController.sendMessage(prompt)}
                    className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700"
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
                <label htmlFor="chat-dashboard-input" className="sr-only">
                  Message Study Coach
                </label>
                <textarea
                  id="chat-dashboard-input"
                  aria-label="Message Study Coach"
                  value={activeController.input}
                  onChange={(event) => activeController.setInput(event.target.value)}
                  placeholder="Ask for motivation, a study plan, or a calendar suggestion."
                  rows={2}
                  className="min-h-[84px] flex-1 resize-none border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-black outline-none placeholder:text-neutral-400"
                />
                <button
                  type="submit"
                  aria-label="Send Message"
                  disabled={activeController.isSending}
                  className="flex h-12 w-12 items-center justify-center bg-black text-white disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>

          <aside className="border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight">Coach Overview</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-500">
              Continue your shared conversation here with more room for reading, planning, and action review.
            </p>
            <div className="mt-6 space-y-3 text-sm text-neutral-600">
              <div className="border border-neutral-200 bg-white p-4">Shared history stays synced with the floating coach.</div>
              <div className="border border-neutral-200 bg-white p-4">Mode changes apply everywhere.</div>
              <div className="border border-neutral-200 bg-white p-4">
                Task and calendar suggestions still require confirmation before saving.
              </div>
            </div>
          </aside>
        </section>
      </motion.div>
    </div>
  );
}
