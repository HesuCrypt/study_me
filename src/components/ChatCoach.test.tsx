import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { ChatCoach } from './ChatCoach';

describe('ChatCoach', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('opens from the launcher, sends a quick prompt, and renders the assistant reply', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Captain, start with 20 minutes on your reviewer and report back.',
          createdAt: '2026-07-03T12:01:00.000Z',
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<ChatCoach currentModule="dashboard" />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.click(screen.getByRole('button', { name: /motivate me to study/i }));

    expect(await screen.findByText(/Captain, start with 20 minutes/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat-coach',
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
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          reply: {
            id: 'assistant-2',
            role: 'assistant',
            content: 'What should we review next, captain?',
            createdAt: '2026-07-03T12:02:00.000Z',
          },
        }),
      })
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
});
