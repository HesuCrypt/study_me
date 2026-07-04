import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

describe('ChatDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  const createJsonResponse = (payload: unknown, ok = true) => ({
    ok,
    text: async () => JSON.stringify(payload),
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json; charset=utf-8' : null),
    },
  });

  it('opens the dedicated chatbot page from app navigation and keeps the floating launcher visible', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.click(screen.getByRole('button', { name: /open full coach/i }));

    expect(await screen.findByRole('heading', { name: /study coach cockpit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open study coach/i })).toBeInTheDocument();
  });

  it('reuses persisted history inside the dedicated chatbot page', async () => {
    const user = userEvent.setup();

    localStorage.setItem(
      'study-me-chat-coach-history',
      JSON.stringify([
        {
          id: 'assistant-seeded',
          role: 'assistant',
          content: 'Seeded shared history',
          createdAt: '2026-07-04T12:00:00.000Z',
        },
      ])
    );

    render(<App />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.click(screen.getByRole('button', { name: /open full coach/i }));

    expect((await screen.findAllByText(/Seeded shared history/i)).length).toBeGreaterThan(0);
  });

  it('shares selected mode between the floating coach and the dedicated chatbot page', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /open study coach/i }));
    await user.click(screen.getByRole('button', { name: /strict/i }));
    await user.click(screen.getByRole('button', { name: /open full coach/i }));

    const strictButtons = await screen.findAllByRole('button', { name: /strict/i });
    strictButtons.forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('opens the chatbot dashboard from a dashboard entry point', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /open coach cockpit/i }));

    expect(await screen.findByRole('heading', { name: /study coach cockpit/i })).toBeInTheDocument();
  });

  it('sends a message from the dedicated chatbot page and renders the assistant reply', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          reply: {
            id: 'assistant-dashboard-1',
            role: 'assistant',
            content: 'Let us map your evening study block, captain.',
            createdAt: '2026-07-04T12:30:00.000Z',
          },
        })
      )
    );

    render(<App />);

    await user.click(screen.getByRole('button', { name: /open coach cockpit/i }));
    await user.type(screen.getByLabelText(/message study coach/i), 'Plan my review tonight');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/Let us map your evening study block, captain./i)).toBeInTheDocument();
  });
});
