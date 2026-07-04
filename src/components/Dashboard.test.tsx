import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';

const mockHour = (hour: number) => {
  vi.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);
};

describe('Dashboard greeting', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows the morning greeting before noon', () => {
    mockHour(9);

    render(<Dashboard onNavigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Good morning.' })).toBeInTheDocument();
  });

  it('shows the afternoon greeting from noon to 5pm', () => {
    mockHour(15);

    render(<Dashboard onNavigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Good afternoon.' })).toBeInTheDocument();
  });

  it('shows the evening greeting from 6pm onward', () => {
    mockHour(19);

    render(<Dashboard onNavigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Good evening.' })).toBeInTheDocument();
  });
});

describe('Dashboard modules overview', () => {
  it('shows the Calendar module card and no longer shows the Languages card', async () => {
    mockHour(9);

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
