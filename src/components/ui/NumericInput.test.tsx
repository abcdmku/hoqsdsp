import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { NumericInput } from './NumericInput';

describe('NumericInput', () => {
  it('renders with initial value', () => {
    render(<NumericInput value={42} onChange={vi.fn()} />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input.value).toBe('42.00');
  });

  it('renders with custom precision', () => {
    render(<NumericInput value={42.123} onChange={vi.fn()} precision={3} />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input.value).toBe('42.123');
  });

  it('displays unit when provided', () => {
    render(<NumericInput value={100} onChange={vi.fn()} unit="Hz" />);
    expect(screen.getByText('Hz')).toBeInTheDocument();
  });

  it('calls onChange with clamped value when input exceeds max', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <NumericInput value={10} onChange={onChange} min={0} max={100} />
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '150');
    await user.tab(); // Trigger blur

    expect(onChange).toHaveBeenCalledWith(100);
  });

  it('calls onChange with clamped value when input is below min', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <NumericInput value={10} onChange={onChange} min={0} max={100} />
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '-10');
    await user.tab(); // Trigger blur

    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('increments value when up button is clicked', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <NumericInput value={10} onChange={onChange} step={1} />
    );

    const incrementButton = screen.getByLabelText('Increment');
    await user.click(incrementButton);

    expect(onChange).toHaveBeenCalledWith(11);
  });

  it('decrements value when down button is clicked', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <NumericInput value={10} onChange={onChange} step={1} />
    );

    const decrementButton = screen.getByLabelText('Decrement');
    await user.click(decrementButton);

    expect(onChange).toHaveBeenCalledWith(9);
  });

  it('increments value with arrow up key', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <NumericInput value={10} onChange={onChange} step={1} />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{ArrowUp}');

    expect(onChange).toHaveBeenCalledWith(11);
  });

  it('decrements value with arrow down key', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <NumericInput value={10} onChange={onChange} step={1} />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{ArrowDown}');

    expect(onChange).toHaveBeenCalledWith(9);
  });

  it('hides stepper when showStepper is false', () => {
    render(<NumericInput value={10} onChange={vi.fn()} showStepper={false} />);
    expect(screen.queryByLabelText('Increment')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Decrement')).not.toBeInTheDocument();
  });

  it('disables input and buttons when disabled', () => {
    render(<NumericInput value={10} onChange={vi.fn()} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByLabelText('Increment')).toBeDisabled();
    expect(screen.getByLabelText('Decrement')).toBeDisabled();
  });

  it('disables increment button at max value', () => {
    render(<NumericInput value={100} onChange={vi.fn()} max={100} />);
    expect(screen.getByLabelText('Increment')).toBeDisabled();
    expect(screen.getByLabelText('Decrement')).not.toBeDisabled();
  });

  it('disables decrement button at min value', () => {
    render(<NumericInput value={0} onChange={vi.fn()} min={0} />);
    expect(screen.getByLabelText('Decrement')).toBeDisabled();
    expect(screen.getByLabelText('Increment')).not.toBeDisabled();
  });

  it('resets to original value on blur if input is invalid', async () => {
    const onChange = vi.fn();
    const { user } = render(<NumericInput value={10} onChange={onChange} precision={2} />);

    const input = screen.getByRole<HTMLInputElement>('textbox');
    await user.clear(input);
    await user.type(input, 'invalid');
    await user.tab(); // Trigger blur

    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('10.00');
  });
});
