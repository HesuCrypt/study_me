import type { ChatCoachMode } from '../../lib/chatCoach';

interface ModeSwitcherProps {
  activeMode: ChatCoachMode;
  recommendedMode: ChatCoachMode;
  onChange: (mode: ChatCoachMode) => void;
}

const LABELS: Record<ChatCoachMode, string> = {
  gentle: 'Gentle',
  strict: 'Strict',
  exam: 'Exam Mode',
};

export function ModeSwitcher({ activeMode, recommendedMode, onChange }: ModeSwitcherProps) {
  return (
    <div className="flex items-center">
      <div className="inline-flex rounded-full border border-black/5 bg-black/[0.03] p-0.5">
        {(['gentle', 'strict', 'exam'] as ChatCoachMode[]).map((mode) => {
          const isRecommended = recommendedMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              aria-pressed={activeMode === mode}
              className={`relative rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeMode === mode
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black/65 hover:text-black/90'
              }`}
              aria-label={LABELS[mode]}
            >
              {LABELS[mode]}
              {isRecommended && activeMode !== mode && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
