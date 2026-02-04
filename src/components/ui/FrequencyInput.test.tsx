import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { FrequencyInput } from './FrequencyInput';

describe('FrequencyInput', () => {
  it('renders with initial frequency value', () => {
    render(<FrequencyInput value={1000} onChange={vi.fn()} />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input.value).toBe('1000');
  });

  it('displays Hz unit', () => {
    render(<FrequencyInput value={100} onChange={vi.fn()} />);
    expect(screen.getByText('Hz')).toBeInTheDocument();
  });

  it('renders slider when showSlider is true', () => {
    render(<FrequencyInput value={1000} onChange={vi.fn()} showSlider={true} />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
  });

  it('hides slider when showSlider is false', () => {
    render(<FrequencyInput value={1000} onChange={vi.fn()} showSlider={false} />);
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('respects min and max values', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <FrequencyInput value={1000} onChange={onChange} min={20} max={20000} />
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '30000');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(20000);
  });

  it('uses adaptive step size based on frequency value', () => {
    // Low frequency (< 100): step = 1
    const { rerender } = render(<FrequencyInput value={50} onChange={vi.fn()} />);
    let input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input).toBeInTheDocument();

    // Medium frequency (100-1000): step = 5
    rerender(<FrequencyInput value={500} onChange={vi.fn()} />);
    input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input).toBeInTheDocument();

    // High frequency (>= 1000): step = 10
    rerender(<FrequencyInput value={5000} onChange={vi.fn()} />);
    input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input).toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    render(<FrequencyInput value={1000} onChange={vi.fn()} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('slider')).toHaveAttribute('data-disabled');
  });
});
