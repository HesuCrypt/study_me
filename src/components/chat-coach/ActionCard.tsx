import { isCalendarActionSuggestion, type ChatCoachSuggestedAction } from '../../lib/chatCoach';

interface ActionCardProps {
  action: ChatCoachSuggestedAction;
  onReview: () => void;
}

export function ActionCard({ action, onReview }: ActionCardProps) {
  return (
    <div className="mt-3 rounded-3xl border border-white/20 bg-white/10 p-4 text-sm text-white shadow-lg backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">{action.label}</p>
      {isCalendarActionSuggestion(action) ? (
        <>
          <p className="mt-2 font-medium">{action.event.title}</p>
          <p className="mt-1 text-white/70">
            {action.event.type} · {action.event.date} at {action.event.time}
          </p>
          <button type="button" onClick={onReview} className="mt-3 rounded-full bg-white px-4 py-2 text-black">
            Review Event
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 font-medium">{action.taskText}</p>
          <button type="button" onClick={onReview} className="mt-3 rounded-full bg-white px-4 py-2 text-black">
            Review Task
          </button>
        </>
      )}
    </div>
  );
}
