import { type FormEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { CHAT_COACH_QUICK_PROMPTS } from '../../lib/chatCoach';

interface ChatComposerDockProps {
  input: string;
  isSending: boolean;
  onInputChange: (value: string) => void;
  onSubmitMessage: (message: string) => Promise<void> | void;
  theme: 'dark' | 'light';
  inputId: string;
}

export function ChatComposerDock({
  input,
  isSending,
  onInputChange,
  onSubmitMessage,
  theme,
  inputId,
}: ChatComposerDockProps) {
  const isDark = theme === 'dark';
  const dockClassName = 'border-t border-black/5 bg-white/80 text-black';
  const promptClassName = 'border border-black/5 bg-black/[0.03] text-black/70 hover:bg-black/[0.06] hover:text-black transition-all duration-200';
  const textareaClassName = 'border border-black/5 bg-black/[0.03] text-black placeholder:text-black/40 focus:bg-white focus:border-black/10 focus:ring-2 focus:ring-black/5 transition-all duration-200';
  const buttonClassName = 'bg-black text-white hover:bg-black/90 active:scale-95 transition-all duration-200';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isSending) return;
    await onSubmitMessage(input);
  };

  return (
    <div
      role="region"
      aria-label="Study Coach Composer"
      className={`sticky bottom-0 px-4 pb-4 pt-3 backdrop-blur-xl sm:px-5 ${dockClassName}`}
    >
      <div 
        role="region" 
        aria-label="Study Coach Quick Prompts" 
        className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {CHAT_COACH_QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void onSubmitMessage(prompt)}
            className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium ${promptClassName}`}
          >
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              {prompt}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          Message Study Coach
        </label>
        <textarea
          id={inputId}
          aria-label="Message Study Coach"
          rows={1}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Message Study Coach..."
          className={`min-h-[48px] max-h-32 flex-1 resize-none rounded-[24px] px-4 py-3.5 text-sm outline-hidden ${textareaClassName}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          aria-label="Send Message"
          disabled={isSending || !input.trim()}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40 ${buttonClassName}`}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
