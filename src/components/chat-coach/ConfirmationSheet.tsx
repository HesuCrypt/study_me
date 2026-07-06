import { isCalendarActionSuggestion, type ChatCoachSuggestedAction } from '../../lib/chatCoach';

interface ConfirmationSheetProps {
  action: ChatCoachSuggestedAction;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationSheet({ action, onConfirm, onCancel }: ConfirmationSheetProps) {
  return (
    <div className="rounded-[28px] border border-black/10 bg-white p-5 text-black shadow-sm">
      <p className="text-xs uppercase tracking-[0.24em] text-black/45">Review Before Save</p>
      {isCalendarActionSuggestion(action) ? (
        <div className="mt-4 space-y-2 text-sm">
          <p><span className="text-black/45">Title:</span> {action.event.title}</p>
          <p><span className="text-black/45">Type:</span> {action.event.type}</p>
          <p><span className="text-black/45">Date:</span> {action.event.date}</p>
          <p><span className="text-black/45">Time:</span> {action.event.time}</p>
          <p><span className="text-black/45">Note:</span> {action.event.note}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm">{action.taskText}</p>
      )}
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onConfirm} className="rounded-full bg-black px-4 py-2 text-white">
          Confirm Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-black/10 px-4 py-2 text-black">
          Cancel
        </button>
      </div>
    </div>
  );
}
