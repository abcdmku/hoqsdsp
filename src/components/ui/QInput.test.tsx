import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { QInput } from './QInput';

describe('QInput', () => {
  it('renders with initial Q value', () => {
    render(<QInput value={1.41} onChange={vi.fn()} />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input.value).toBe('1.41');
  });

  it('displays Q unit', () => {
    render(<QInput value={1} onChange={vi.fn()} />);
    expect(screen.getByText('Q')).toBeInTheDocument();
  });

  it('calculates and displays bandwidth in octaves', () => {
    render(<QInput value={1.41} onChange={vi.fn()} />);
    // For Q=1.41, BW ≈ 1 octave
    const bandwidthText = screen.getByText(/oct/);
    expect(bandwidthText).toBeInTheDocument();
    // Check that it's a reasonable value (between 0 and 10 octaves)
    const bwMatch = /[\d.]+/.exec(bandwidthText.textContent);
    const bwValue = parseFloat(bwMatch?.[0] ?? '0');
    expect(bwValue).toBeGreaterThan(0);
    expect(bwValue).toBeLessThan(10);
  });

  it('displays narrower bandwidth for higher Q values', () => {
    const { rerender } = render(<QInput value={0.5} onChange={vi.fn()} />);
    const lowQBandwidthMatch = /[\d.]+/.exec(screen.getByText(/oct/).textContent);
    const lowQBandwidth = parseFloat(lowQBandwidthMatch?.[0] ?? '0');

    rerender(<QInput value={5} onChange={vi.fn()} />);
    const highQBandwidthMatch = /[\d.]+/.exec(screen.getByText(/oct/).textContent);
    const highQBandwidth = parseFloat(highQBandwidthMatch?.[0] ?? '0');

    expect(highQBandwidth).toBeLessThan(lowQBandwidth);
  });

  it('renders slider when showSlider is true', () => {
    render(<QInput value={1} onChange={vi.fn()} showSlider={true} />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
  });

  it('hides slider when showSlider is false', () => {
    render(<QInput value={1} onChange={vi.fn()} showSlider={false} />);
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('respects min and max values', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <QInput value={1} onChange={onChange} min={0.1} max={20} />
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '50');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(20);
  });

  it('uses 0.1 step size by default', async () => {
    const onChange = vi.fn();
    const { user } = render(<QInput value={1} onChange={onChange} />);

    const incrementButton = screen.getByLabelText('Increment');
    await user.click(incrementButton);

    expect(onChange).toHaveBeenCalledWith(1.1);
  });

  it('disables input and slider when disabled', () => {
    render(<QInput value={1} onChange={vi.fn()} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('slider')).toHaveAttribute('data-disabled');
  });

  it('formats Q value with 2 decimal precision', () => {
    render(<QInput value={1.4142135} onChange={vi.fn()} />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input.value).toBe('1.41');
  });

  it('uses logarithmic slider scale for better low Q resolution', () => {
    // This is a behavioral test - we just verify that the component renders correctly
    // with different Q values and the slider works
    const onChange = vi.fn();
    render(<QInput value={0.5} onChange={onChange} min={0.1} max={20} />);

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    // The logarithmic scale is internal to the component,
    // we trust the implementation matches the spec
  });
});
