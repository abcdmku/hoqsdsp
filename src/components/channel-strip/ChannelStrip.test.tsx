import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ChannelStrip, type ChannelFilter, type ChannelStripProps } from './ChannelStrip';
import { TooltipProvider } from '../ui/Tooltip';

// Mock the child components to simplify testing
vi.mock('./ProcessingBlock', () => ({
  ProcessingBlock: ({ filter, isSelected, onSelect, onBypass, onDelete, onCopy }: {
    filter: ChannelFilter;
    isSelected: boolean;
    onSelect: () => void;
    onBypass: () => void;
    onDelete: () => void;
    onCopy: () => void;
  }) => (
    <div
      data-testid={`processing-block-${filter.id}`}
      data-selected={isSelected}
      onClick={onSelect}
    >
      <span>{filter.name}</span>
      <button onClick={onBypass} data-testid={`bypass-${filter.id}`}>Bypass</button>
      <button onClick={onDelete} data-testid={`delete-${filter.id}`}>Delete</button>
      <button onClick={onCopy} data-testid={`copy-${filter.id}`}>Copy</button>
    </div>
  ),
}));

vi.mock('./ChannelMeter', () => ({
  ChannelMeter: ({ label }: { label: string }) => (
    <div data-testid={`channel-meter-${label.toLowerCase()}`}>{label}</div>
  ),
}));

const mockFilters: ChannelFilter[] = [
  {
    id: 'filter-1',
    name: 'EQ Band 1',
    config: { type: 'Biquad', parameters: { type: 'Peaking', freq: 1000, gain: 3, q: 1 } },
    bypassed: false,
  },
  {
    id: 'filter-2',
    name: 'Delay',
    config: { type: 'Delay', parameters: { delay: 10, unit: 'ms', subsample: false } },
    bypassed: false,
  },
];

const defaultProps: ChannelStripProps = {
  channelId: 0,
  name: 'Left',
  filters: mockFilters,
  muted: false,
  solo: false,
  gain: 0,
  inputLevel: -20,
  outputLevel: -18,
};

// Helper to render with TooltipProvider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

describe('ChannelStrip', () => {
  describe('Rendering', () => {
    it('should render channel name and number', () => {
      renderWithProvider(<ChannelStrip {...defaultProps} />);

      expect(screen.getByText('Left')).toBeInTheDocument();
      expect(screen.getByText('Ch 1')).toBeInTheDocument();
    });

    it('should render all filters as processing blocks', () => {
      renderWithProvider(<ChannelStrip {...defaultProps} />);

      expect(screen.getByTestId('processing-block-filter-1')).toBeInTheDocument();
      expect(screen.getByTestId('processing-block-filter-2')).toBeInTheDocument();
    });

    it('should render input and output meters', () => {
      renderWithProvider(<ChannelStrip {...defaultProps} />);

      expect(screen.getByTestId('channel-meter-input')).toBeInTheDocument();
      expect(screen.getByTestId('channel-meter-output')).toBeInTheDocument();
    });

    it('should display current gain value', () => {
      renderWithProvider(<ChannelStrip {...defaultProps} gain={-6.5} />);

      expect(screen.getByText('-6.5 dB')).toBeInTheDocument();
    });

    it('should display positive gain with plus sign', () => {
      renderWithProvider(<ChannelStrip {...defaultProps} gain={3} />);

      expect(screen.getByText('+3.0 dB')).toBeInTheDocument();
    });

    it('should show empty state when no filters', () => {
      renderWithProvider(<ChannelStrip {...defaultProps} filters={[]} />);

      expect(screen.getByText('No filters')).toBeInTheDocument();
      expect(screen.getByText('Click + to add')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should call onSelect when clicked', async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      renderWithProvider(<ChannelStrip {...defaultProps} onSelect={onSelect} />);

      await user.click(screen.getByRole('button', { name: /channel left/i }));

      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect on keyboard Enter', () => {
      const onSelect = vi.fn();
      renderWithProvider(<ChannelStrip {...defaultProps} onSelect={onSelect} />);

      const channelStrip = screen.getByRole('button', { name: /channel left/i });
      fireEvent.keyDown(channelStrip, { key: 'Enter' });

      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect on keyboard Space', () => {
      const onSelect = vi.fn();
      renderWithProvider(<ChannelStrip {...defaultProps} onSelect={onSelect} />);

      const channelStrip = screen.getByRole('button', { name: /channel left/i });
      fireEvent.keyDown(channelStrip, { key: ' ' });

      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should apply selected styling when isSelected is true', () => {
      const { container } = renderWithProvider(<ChannelStrip {...defaultProps} isSelected />);

      const strip = container.querySelector('[role="button"]');
      expect(strip).toHaveClass('border-dsp-accent');
    });
  });

  describe('Mute/Solo Controls', () => {
    it('should call onMuteToggle when mute button clicked', async () => {
      const onMuteToggle = vi.fn();
      const user = userEvent.setup();
      renderWithProvider(<ChannelStrip {...defaultProps} onMuteToggle={onMuteToggle} />);

      await user.click(screen.getByRole('button', { name: /mute/i }));

      expect(onMuteToggle).toHaveBeenCalledTimes(1);
    });

    it('should call onSoloToggle when solo button clicked', async () => {
      const onSoloToggle = vi.fn();
      const user = userEvent.setup();
      renderWithProvider(<ChannelStrip {...defaultProps} onSoloToggle={onSoloToggle} />);

      await user.click(screen.getByRole('button', { name: /solo/i }));

      expect(onSoloToggle).toHaveBeenCalledTimes(1);
    });

    it('should show muted state correctly', () => {
      renderWithProvider(<ChannelStrip {...defaultProps} muted />);

      expect(screen.getByRole('button', { name: /unmute/i })).toBeInTheDocument();
    });

    it('should show solo state correctly', () => {
      renderWithProvider(<ChannelStrip {...defaultProps} solo />);

      expect(screen.getByRole('button', { name: /unsolo/i })).toBeInTheDocument();
    });

    it('should apply muted styling when isMutedBySolo', () => {
      const { container } = renderWithProvider(<ChannelStrip {...defaultProps} isMutedBySolo />);

      const strip = container.querySelector('[role="button"]');
      expect(strip).toHaveClass('opacity-60');
    });
  });

  describe('Filter Operations', () => {
    it('should call onFilterSelect when filter is clicked', async () => {
      const onFilterSelect = vi.fn();
      const user = userEvent.setup();
      renderWithProvider(<ChannelStrip {...defaultProps} onFilterSelect={onFilterSelect} />);

      await user.click(screen.getByTestId('processing-block-filter-1'));

      expect(onFilterSelect).toHaveBeenCalledWith('filter-1');
    });

    it('should call onFilterBypass when bypass clicked', async () => {
      const onFilterBypass = vi.fn();
      const user = userEvent.setup();
      renderWithProvider(<ChannelStrip {...defaultProps} onFilterBypass={onFilterBypass} />);

      await user.click(screen.getByTestId('bypass-filter-1'));

      expect(onFilterBypass).toHaveBeenCalledWith('filter-1');
    });

    it('should call onFilterDelete when delete clicked', async () => {
      const onFilterDelete = vi.fn();
      const user = userEvent.setup();
      renderWithProvider(<ChannelStrip {...defaultProps} onFilterDelete={onFilterDelete} />);

      await user.click(screen.getByTestId('delete-filter-1'));

      expect(onFilterDelete).toHaveBeenCalledWith('filter-1');
    });

    it('should call onFilterCopy when copy clicked', async () => {
      const onFilterCopy = vi.fn();
      const user = userEvent.setup();
      renderWithProvider(<ChannelStrip {...defaultProps} onFilterCopy={onFilterCopy} />);

      await user.click(screen.getByTestId('copy-filter-1'));

      expect(onFilterCopy).toHaveBeenCalledWith('filter-1');
    });

    it('should show selected filter', () => {
      renderWithProvider(<ChannelStrip {...defaultProps} selectedFilterId="filter-1" />);

      const block = screen.getByTestId('processing-block-filter-1');
      expect(block).toHaveAttribute('data-selected', 'true');
    });
  });

  describe('Quick Add', () => {
    it('should call onQuickAdd with position 0 for start button', async () => {
      const onQuickAdd = vi.fn();
      const user = userEvent.setup();
      renderWithProvider(<ChannelStrip {...defaultProps} onQuickAdd={onQuickAdd} />);

      await user.click(screen.getByRole('button', { name: /add filter at start/i }));

      expect(onQuickAdd).toHaveBeenCalledWith(0);
    });

    it('should call onQuickAdd with correct position for between-filter buttons', async () => {
      const onQuickAdd = vi.fn();
      const user = userEvent.setup();
      renderWithProvider(<ChannelStrip {...defaultProps} onQuickAdd={onQuickAdd} />);

      // Click add button after first filter
      const addButtons = screen.getAllByRole('button', { name: /add filter after/i });
      await user.click(addButtons[0]!);

      expect(onQuickAdd).toHaveBeenCalledWith(1);
    });
  });

  describe('Accessibility', () => {
    it('should have correct aria-label on channel', () => {
      renderWithProvider(<ChannelStrip {...defaultProps} />);

      expect(screen.getByRole('button', { name: /channel left/i })).toBeInTheDocument();
    });

    it('should have tabIndex on channel for keyboard navigation', () => {
      renderWithProvider(<ChannelStrip {...defaultProps} />);

      const strip = screen.getByRole('button', { name: /channel left/i });
      expect(strip).toHaveAttribute('tabIndex', '0');
    });

    it('should have aria-pressed on mute button', () => {
      renderWithProvider(<ChannelStrip {...defaultProps} muted onMuteToggle={vi.fn()} />);

      const muteButton = screen.getByRole('button', { name: /unmute/i });
      expect(muteButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have aria-pressed on solo button', () => {
      renderWithProvider(<ChannelStrip {...defaultProps} solo onSoloToggle={vi.fn()} />);

      const soloButton = screen.getByRole('button', { name: /unsolo/i });
      expect(soloButton).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
