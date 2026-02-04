import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { GainInput } from './GainInput';

describe('GainInput', () => {
  it('renders with initial gain value', () => {
    render(<GainInput value={0} onChange={vi.fn()} />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input.value).toBe('0.0');
  });

  it('displays dB unit', () => {
    render(<GainInput value={6} onChange={vi.fn()} />);
    expect(screen.getByText('dB')).toBeInTheDocument();
  });

  it('displays positive gain value', () => {
    render(<GainInput value={6} onChange={vi.fn()} />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input.value).toBe('6.0');
  });

  it('displays negative gain value', () => {
    render(<GainInput value={-6} onChange={vi.fn()} />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input.value).toBe('-6.0');
  });

  it('renders slider when showSlider is true', () => {
    render(<GainInput value={0} onChange={vi.fn()} showSlider={true} />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
  });

  it('hides slider when showSlider is false', () => {
    render(<GainInput value={0} onChange={vi.fn()} showSlider={false} />);
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('respects min and max values', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <GainInput value={0} onChange={onChange} min={-24} max={24} />
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '50');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(24);
  });

  it('uses 0.5 step size by default', async () => {
    const onChange = vi.fn();
    const { user } = render(<GainInput value={0} onChange={onChange} />);

    const incrementButton = screen.getByLabelText('Increment');
    await user.click(incrementButton);

    expect(onChange).toHaveBeenCalledWith(0.5);
  });

  it('disables input and slider when disabled', () => {
    render(<GainInput value={0} onChange={vi.fn()} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('slider')).toHaveAttribute('data-disabled');
  });

  it('formats gain with 1 decimal precision', () => {
    render(<GainInput value={3.14159} onChange={vi.fn()} />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input.value).toBe('3.1');
  });
});
