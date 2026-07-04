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
    <div>
      <div className="inline-flex rounded-full border border-white/30 bg-white/10 p-1 backdrop-blur-xl">
        {(['gentle', 'strict', 'exam'] as ChatCoachMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`rounded-full px-3 py-2 text-xs font-medium transition ${
              activeMode === mode ? 'bg-white text-black' : 'text-white/80'
            }`}
            aria-label={LABELS[mode]}
          >
            {LABELS[mode]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-white/70">Recommended: {LABELS[recommendedMode]}</p>
    </div>
  );
}
