import { type FormEvent, useEffect, useRef } from 'react';
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_50%),#ffffff] px-4 py-6 text-black sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Flight Deck
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-medium text-neutral-500 shadow-sm sm:inline-flex">
            <MessageCircle className="h-4 w-4" />
            Shared with floating coach
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.8fr)]">
          <div className="overflow-hidden rounded-[32px] border border-slate-900/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.84))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.18)]">
            <header className="border-b border-white/10 px-5 py-5 md:px-8">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Study Coach</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Study Coach Cockpit</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
                A full briefing space for study planning, focus, and action review across any screen size.
              </p>
              <div className="mt-4">
                <ModeSwitcher
                  activeMode={activeController.mode}
                  recommendedMode={activeController.recommendedMode}
                  onChange={activeController.setMode}
                />
              </div>
            </header>

            <div
              ref={scrollContainerRef}
              className="max-h-[min(64vh,34rem)] space-y-3 overflow-y-auto px-5 py-5 md:px-8"
            >
              {activeController.messages.length === 0 && (
                <div className="rounded-3xl bg-white/10 p-4 text-sm text-white/80">
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

            <div className="border-t border-white/10 px-5 py-5 md:px-8">
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
                  className="min-h-[84px] flex-1 resize-none rounded-3xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/55"
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
          </div>

          <aside className="rounded-[32px] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight">Coach Overview</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-500">
              Continue your shared conversation here with more room for reading, planning, and action review.
            </p>
            <div className="mt-6 space-y-3 text-sm text-neutral-600">
              <div className="rounded-2xl bg-neutral-50 p-4">Shared history stays synced with the floating coach.</div>
              <div className="rounded-2xl bg-neutral-50 p-4">Mode changes apply everywhere.</div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                Task and calendar suggestions still require confirmation before saving.
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
