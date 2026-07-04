import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModeSwitcher } from './ModeSwitcher';

describe('ModeSwitcher', () => {
  it('renders all three modes and notifies on change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ModeSwitcher activeMode="gentle" recommendedMode="exam" onChange={onChange} />);

    expect(screen.getByRole('button', { name: /gentle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /strict/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exam mode/i })).toBeInTheDocument();
    expect(screen.getByText(/recommended: exam mode/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /strict/i }));
    expect(onChange).toHaveBeenCalledWith('strict');
  });
});
