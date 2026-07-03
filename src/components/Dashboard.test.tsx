import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';

describe('Dashboard modules overview', () => {
  it('shows the Calendar module card and no longer shows the Languages card', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(<Dashboard onNavigate={onNavigate} />);

    const calendarCard = screen.getByText('Calendar');
    expect(calendarCard).toBeInTheDocument();
    expect(screen.queryByText('Languages')).not.toBeInTheDocument();

    await user.click(calendarCard);

    expect(onNavigate).toHaveBeenCalledWith('calendar');
  });
});
