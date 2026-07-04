import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmationSheet } from './ConfirmationSheet';

describe('ConfirmationSheet', () => {
  it('shows read-only task confirmation content and confirm button', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmationSheet
        action={{ kind: 'task', label: 'Add to Tasks', taskText: 'Review passenger announcements' }}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText(/review passenger announcements/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm save/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
