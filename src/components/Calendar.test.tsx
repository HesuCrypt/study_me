import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Calendar } from './Calendar';

describe('Calendar page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds an event and shows it in the selected day and upcoming lists', async () => {
    const user = userEvent.setup();

    render(<Calendar onNavigate={() => {}} />);

    await user.click(screen.getByRole('button', { name: /add event/i }));
    await user.type(screen.getByLabelText(/event title/i), 'Nursing exam');
    await user.selectOptions(screen.getByLabelText(/event type/i), 'exam');
    await user.clear(screen.getByLabelText(/event date/i));
    await user.type(screen.getByLabelText(/event date/i), '2099-07-03');
    await user.clear(screen.getByLabelText(/event time/i));
    await user.type(screen.getByLabelText(/event time/i), '13:30');
    await user.type(screen.getByLabelText(/event note/i), 'Bring reviewer');

    await user.click(screen.getAllByRole('button', { name: /^add event$/i })[1]);

    expect(screen.getAllByText('Nursing exam').length).toBeGreaterThan(0);
    expect(screen.getByText(/bring reviewer/i)).toBeInTheDocument();
    expect(screen.getByText(/2099-07-03 at 13:30/i)).toBeInTheDocument();
  });
});
