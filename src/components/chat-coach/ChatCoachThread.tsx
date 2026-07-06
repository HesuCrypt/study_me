import type { RefObject } from 'react';
import type { ChatCoachMessage, ChatCoachSuggestedAction } from '../../lib/chatCoach';
import { ActionCard } from './ActionCard';
import { ConfirmationSheet } from './ConfirmationSheet';
import { Sparkles } from 'lucide-react';

interface ChatCoachThreadProps {
  messages: ChatCoachMessage[];
  isSending: boolean;
  suggestedAction: ChatCoachSuggestedAction | null;
  reviewAction: ChatCoachSuggestedAction | null;
  onReviewAction: (action: ChatCoachSuggestedAction | null) => void;
  onConfirmAction: () => void;
  bottomAnchorRef: RefObject<HTMLDivElement | null>;
  emptyTitle?: string;
  emptyBody?: string;
  surface: 'floating' | 'page';
}

export function ChatCoachThread({
  messages,
  isSending,
  suggestedAction,
  reviewAction,
  onReviewAction,
  onConfirmAction,
  bottomAnchorRef,
  emptyTitle = 'What should we tackle today?',
  emptyBody = 'Ask for a study plan, motivation, or a review suggestion and I will keep the path clear.',
  surface,
}: ChatCoachThreadProps) {
  const isFloating = surface === 'floating';
  const emptyShellClassName = isFloating
    ? 'flex min-h-[35vh] flex-col items-center justify-center px-6 text-center sm:min-h-0'
    : 'flex min-h-[40vh] flex-col items-center justify-center px-6 text-center lg:min-h-[24rem]';
  const emptyEyebrowClassName = 'text-black/40';
  const emptyBodyClassName = 'text-black/55';

  return (
    <div className="space-y-6 py-2">
      {messages.length === 0 && (
        <div className={emptyShellClassName}>
          <div className="max-w-md space-y-3">
            <p className={`text-xs uppercase tracking-[0.25em] font-semibold ${emptyEyebrowClassName}`}>Study Coach</p>
            <h2 className="text-2xl font-bold tracking-tight text-black sm:text-3xl">{emptyTitle}</h2>
            <p className={`text-sm leading-relaxed ${emptyBodyClassName}`}>{emptyBody}</p>
          </div>
        </div>
      )}

      {messages.map((message) => {
        if (message.role === 'user') {
          return (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-[20px] bg-black/[0.05] px-4 py-2.5 text-sm text-black leading-relaxed sm:max-w-[75%]">
                {message.content}
              </div>
            </div>
          );
        } else {
          return (
            <div key={message.id} className="flex gap-3 max-w-[92%] px-1 py-1 text-sm text-black sm:max-w-[85%]">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 leading-relaxed text-black/85 pt-0.5 whitespace-pre-line">
                {message.content}
              </div>
            </div>
          );
        }
      })}

      {suggestedAction && <ActionCard action={suggestedAction} onReview={() => onReviewAction(suggestedAction)} />}

      {reviewAction && (
        <ConfirmationSheet action={reviewAction} onConfirm={onConfirmAction} onCancel={() => onReviewAction(null)} />
      )}

      {isSending && (
        <div className="flex gap-3 max-w-[92%] px-1 py-1 text-sm text-black sm:max-w-[85%]">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 leading-relaxed text-black/40 pt-0.5 animate-pulse">
            Thinking through your next study move...
          </div>
        </div>
      )}

      <div ref={bottomAnchorRef} aria-hidden="true" className="h-px w-full" />
    </div>
  );
}
