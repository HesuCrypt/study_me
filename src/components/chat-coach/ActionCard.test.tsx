import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionCard } from './ActionCard';

describe('ActionCard', () => {
  it('renders task suggestion content and review button', async () => {
    const user = userEvent.setup();
    const onReview = vi.fn();

    render(
      <ActionCard
        action={{ kind: 'task', label: 'Add to Tasks', taskText: 'Review meal service steps' }}
        onReview={onReview}
      />
    );

    expect(screen.getByText(/review meal service steps/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /review task/i }));
    expect(onReview).toHaveBeenCalled();
  });
});
