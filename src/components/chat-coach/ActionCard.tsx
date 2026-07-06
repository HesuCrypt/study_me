import { isCalendarActionSuggestion, type ChatCoachSuggestedAction } from '../../lib/chatCoach';

interface ActionCardProps {
  action: ChatCoachSuggestedAction;
  onReview: () => void;
}

export function ActionCard({ action, onReview }: ActionCardProps) {
  return (
    <div className="mt-3 rounded-3xl border border-black/8 bg-white p-4 text-sm text-black shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-black/45">{action.label}</p>
      {isCalendarActionSuggestion(action) ? (
        <>
          <p className="mt-2 font-medium">{action.event.title}</p>
          <p className="mt-1 text-black/55">
            {action.event.type} · {action.event.date} at {action.event.time}
          </p>
          <button type="button" onClick={onReview} className="mt-3 rounded-full bg-black px-4 py-2 text-white">
            Review Event
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 font-medium">{action.taskText}</p>
          <button type="button" onClick={onReview} className="mt-3 rounded-full bg-black px-4 py-2 text-white">
            Review Task
          </button>
        </>
      )}
    </div>
  );
}
