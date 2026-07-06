import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { ChatCoach } from './ChatCoach';
import { buildApiUrl } from '../lib/api';

const scrollIntoViewMock = vi.fn();

const createJsonResponse = (payload: unknown, ok = true) => ({
  ok,
  text: async () => JSON.stringify(payload),
  headers: {
    get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json; charset=utf-8' : null),
  },
});

describe('ChatCoach', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });
    scrollIntoViewMock.mockClear();
  });

  it('opens from the launcher, sends a quick prompt, and renders the assistant reply', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        reply: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Captain, start with 20 minutes on your reviewer and report back.',
          createdAt: '2026-07-03T12:01:00.000Z',
        },
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    render(<ChatCoach currentModule="dashboard" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.click(screen.getByRole('button', { name: /motivate me to study/i }));

    expect(await screen.findByText(/Captain, start with 20 minutes/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      buildApiUrl('/api/chat-coach'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('shows a friendly fallback message when the request fails', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<ChatCoach currentModule="dashboard" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.type(screen.getByLabelText(/message study coach/i), 'Help me plan tonight');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/We hit a little turbulence/i)).toBeInTheDocument();
  });

  it('stays visible after app navigation because it is mounted at the root', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          reply: {
            id: 'assistant-2',
            role: 'assistant',
            content: 'What should we review next, captain?',
            createdAt: '2026-07-03T12:02:00.000Z',
          },
        })
      )
    );

    render(<App />);

    const launcher = screen.getByRole('button', { name: /open study coach/i });
    expect(launcher).toBeInTheDocument();

    await user.click(screen.getByText('Calendar'));

    await waitFor(() => {
      expect(screen.getByText(/Track exams, birthdays, reminders/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /open study coach/i })).toBeInTheDocument();
  });

  it('persists the selected mode and sends it with the chat request', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        reply: {
          id: 'assistant-3',
          role: 'assistant',
          content: 'Let us move with strict precision, captain.',
          createdAt: '2026-07-03T12:03:00.000Z',
        },
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    render(<ChatCoach currentModule="dashboard" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.click(screen.getByRole('button', { name: /strict/i }));
    await user.type(screen.getByLabelText(/message study coach/i), 'Push me to study');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(localStorage.getItem('study-me-chat-coach-mode')).toBe('strict');
    expect(fetchMock).toHaveBeenCalledWith(
      buildApiUrl('/api/chat-coach'),
      expect.objectContaining({
        body: expect.stringContaining('"mode":"strict"'),
      })
    );
  });

  it('scrolls to the latest message when the chatbot opens', async () => {
    const user = userEvent.setup();

    localStorage.setItem(
      'study-me-chat-coach-history',
      JSON.stringify([
        {
          id: 'assistant-old',
          role: 'assistant',
          content: 'Older message',
          createdAt: '2026-07-04T12:00:00.000Z',
        },
        {
          id: 'assistant-new',
          role: 'assistant',
          content: 'Newest message',
          createdAt: '2026-07-04T12:01:00.000Z',
        },
      ])
    );

    render(<ChatCoach currentModule="dashboard" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  it('scrolls again when a new loading state and assistant reply are appended', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        reply: {
          id: 'assistant-scroll',
          role: 'assistant',
          content: 'Here is your latest reply, captain.',
          createdAt: '2026-07-04T12:02:00.000Z',
        },
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    render(<ChatCoach currentModule="dashboard" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    scrollIntoViewMock.mockClear();

    await user.type(screen.getByLabelText(/message study coach/i), 'Help me focus');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/Here is your latest reply, captain./i)).toBeInTheDocument();
    });

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('renders a task action card and saves after confirmation', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          reply: {
            id: 'assistant-4',
            role: 'assistant',
            content: 'Let us lock in one concrete task.',
            createdAt: '2026-07-03T12:04:00.000Z',
          },
          suggestedAction: {
            kind: 'task',
            label: 'Add to Tasks',
            taskText: 'Review emergency equipment checks',
          },
        })
      )
    );

    render(<ChatCoach currentModule="tasks" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.click(screen.getByRole('button', { name: /motivate me to study/i }));
    await user.click(await screen.findByRole('button', { name: /review task/i }));
    await user.click(screen.getByRole('button', { name: /confirm save/i }));

    const savedTasks = JSON.parse(localStorage.getItem('study-me-tasks') ?? '[]');
    expect(savedTasks[0].text).toBe('Review emergency equipment checks');
    expect(await screen.findByText(/added to daily tasks/i)).toBeInTheDocument();
  });

  it('shows an open full coach action inside the floating chatbot', async () => {
    const user = userEvent.setup();

    render(<ChatCoach currentModule="dashboard" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));

    expect(screen.getByRole('button', { name: /open full coach/i })).toBeInTheDocument();
  });

  it('renders a simplified welcome state with a pinned composer when the floating coach opens', async () => {
    const user = userEvent.setup();

    render(<ChatCoach currentModule="dashboard" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));

    expect(screen.getByRole('heading', { name: /what should we tackle today/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /study coach composer/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /study coach quick prompts/i })).toBeInTheDocument();
  });

  it('keeps the composer visible after the first assistant reply is rendered', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          reply: {
            id: 'assistant-minimal-1',
            role: 'assistant',
            content: 'Start with your weakest topic for 20 focused minutes.',
            createdAt: '2026-07-04T18:00:00.000Z',
          },
        })
      )
    );

    render(<ChatCoach currentModule="dashboard" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.click(screen.getByRole('button', { name: /what should i study next/i }));

    expect(await screen.findByText(/start with your weakest topic/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /study coach composer/i })).toBeInTheDocument();
  });

  it('renders a calendar action card and saves after confirmation', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          reply: {
            id: 'assistant-5',
            role: 'assistant',
            content: 'I prepared your review session as a calendar event.',
            createdAt: '2026-07-03T12:05:00.000Z',
          },
          suggestedAction: {
            kind: 'calendar',
            label: 'Add to Calendar',
            event: {
              title: 'Mock exam review',
              type: 'exam',
              date: '2099-07-05',
              time: '15:30',
              note: 'Cabin procedures',
            },
          },
        })
      )
    );

    render(<ChatCoach currentModule="calendar" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.click(screen.getByRole('button', { name: /help me plan tonight/i }));
    await user.click(await screen.findByRole('button', { name: /review event/i }));
    await user.click(screen.getByRole('button', { name: /confirm save/i }));

    const savedEvents = JSON.parse(localStorage.getItem('study-me-calendar-events') ?? '[]');
    expect(savedEvents[0].title).toBe('Mock exam review');
    expect(await screen.findByText(/added to calendar/i)).toBeInTheDocument();
  });

  it('ignores malformed action payloads and only renders the reply text', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          reply: {
            id: 'assistant-6',
            role: 'assistant',
            content: 'Stay on course, captain.',
            createdAt: '2026-07-03T12:06:00.000Z',
          },
          suggestedAction: {
            kind: 'task',
            label: 'Add to Tasks',
          },
        })
      )
    );

    render(<ChatCoach currentModule="dashboard" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.click(screen.getByRole('button', { name: /motivate me to study/i }));

    expect(await screen.findByText(/Stay on course, captain/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review task/i })).not.toBeInTheDocument();
  });
});
