import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { LevelMeter, MultiChannelMeter, MeterBridge } from './LevelMeter';

describe('LevelMeter', () => {
  describe('rendering', () => {
    it('renders with required props', () => {
      render(<LevelMeter rms={-20} peak={-15} />);
      expect(screen.getByRole('meter')).toBeInTheDocument();
    });

    it('renders RMS and peak bars', () => {
      render(<LevelMeter rms={-20} peak={-15} />);
      expect(screen.getByTestId('rms-bar')).toBeInTheDocument();
      expect(screen.getByTestId('peak-bar')).toBeInTheDocument();
    });

    it('renders peak hold indicator when provided', () => {
      render(<LevelMeter rms={-20} peak={-15} peakHold={-10} />);
      expect(screen.getByTestId('peak-indicator')).toBeInTheDocument();
    });

    it('does not render peak hold indicator when not provided', () => {
      render(<LevelMeter rms={-20} peak={-15} />);
      expect(screen.queryByTestId('peak-indicator')).not.toBeInTheDocument();
    });

    it('renders clipping indicator', () => {
      render(<LevelMeter rms={-20} peak={-15} clippedSamples={0} />);
      expect(screen.getByTestId('clipping-indicator')).toBeInTheDocument();
    });
  });

  describe('color coding', () => {
    it('uses green color for normal levels (below -12 dB)', () => {
      render(<LevelMeter rms={-30} peak={-25} />);
      const rmsBar = screen.getByTestId('rms-bar');
      expect(rmsBar).toHaveClass('bg-meter-green');
    });

    it('uses yellow color for warning levels (-12 to -3 dB)', () => {
      render(<LevelMeter rms={-8} peak={-6} />);
      const rmsBar = screen.getByTestId('rms-bar');
      expect(rmsBar).toHaveClass('bg-meter-yellow');
    });

    it('uses red color for clipping levels (above -3 dB)', () => {
      render(<LevelMeter rms={-1} peak={0} />);
      const rmsBar = screen.getByTestId('rms-bar');
      expect(rmsBar).toHaveClass('bg-meter-red');
    });
  });

  describe('clipping indicator', () => {
    it('shows no text when no clipping', () => {
      render(<LevelMeter rms={-20} peak={-15} clippedSamples={0} />);
      const indicator = screen.getByTestId('clipping-indicator');
      expect(indicator).not.toHaveTextContent('CLIP');
    });

    it('shows CLIP text when clipping detected', () => {
      render(<LevelMeter rms={-20} peak={-15} clippedSamples={100} />);
      const indicator = screen.getByTestId('clipping-indicator');
      expect(indicator).toHaveTextContent('CLIP');
    });

    it('shows clipped sample count in title', () => {
      render(<LevelMeter rms={-20} peak={-15} clippedSamples={42} />);
      const indicator = screen.getByTestId('clipping-indicator');
      expect(indicator).toHaveAttribute('title', expect.stringContaining('42'));
    });

    it('calls onClippingReset when clicked', async () => {
      const onReset = vi.fn();
      const { user } = render(
        <LevelMeter rms={-20} peak={-15} clippedSamples={10} onClippingReset={onReset} />
      );

      const indicator = screen.getByTestId('clipping-indicator');
      await user.click(indicator);

      expect(onReset).toHaveBeenCalled();
    });

    it('has pulse animation when clipping', () => {
      render(<LevelMeter rms={-20} peak={-15} clippedSamples={10} />);
      const indicator = screen.getByTestId('clipping-indicator');
      expect(indicator).toHaveClass('animate-pulse');
    });
  });

  describe('orientation', () => {
    it('renders vertical by default', () => {
      render(<LevelMeter rms={-20} peak={-15} />);
      const rmsBar = screen.getByTestId('rms-bar');
      // Vertical orientation uses height for sizing
      expect(rmsBar.className).toContain('bottom-0');
    });

    it('renders horizontal when specified', () => {
      render(<LevelMeter rms={-20} peak={-15} orientation="horizontal" />);
      const rmsBar = screen.getByTestId('rms-bar');
      // Horizontal orientation uses width for sizing
      expect(rmsBar.className).toContain('left-0');
    });
  });

  describe('accessibility', () => {
    it('has meter role', () => {
      render(<LevelMeter rms={-20} peak={-15} />);
      expect(screen.getByRole('meter')).toBeInTheDocument();
    });

    it('sets aria-valuenow to peak level', () => {
      render(<LevelMeter rms={-20} peak={-15} />);
      expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '-15');
    });

    it('sets aria-valuemin and aria-valuemax', () => {
      render(<LevelMeter rms={-20} peak={-15} />);
      const meter = screen.getByRole('meter');
      expect(meter).toHaveAttribute('aria-valuemin', '-60');
      expect(meter).toHaveAttribute('aria-valuemax', '0');
    });

    it('uses custom label when provided', () => {
      render(<LevelMeter rms={-20} peak={-15} label="Left channel" />);
      expect(screen.getByRole('meter')).toHaveAttribute('aria-label', 'Left channel');
    });

    it('uses default label when not provided', () => {
      render(<LevelMeter rms={-20} peak={-15} />);
      expect(screen.getByRole('meter')).toHaveAttribute('aria-label', 'Audio level meter');
    });

    it('clipping indicator has accessible name', () => {
      render(<LevelMeter rms={-20} peak={-15} clippedSamples={0} />);
      const indicator = screen.getByTestId('clipping-indicator');
      expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('No clipping'));
    });

    it('clipping indicator has accessible name when clipping', () => {
      render(<LevelMeter rms={-20} peak={-15} clippedSamples={50} />);
      const indicator = screen.getByTestId('clipping-indicator');
      expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('50 samples'));
    });
  });

  describe('scale', () => {
    it('does not show scale by default', () => {
      render(<LevelMeter rms={-20} peak={-15} />);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('shows scale when showScale is true', () => {
      render(<LevelMeter rms={-20} peak={-15} showScale />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('-12')).toBeInTheDocument();
      expect(screen.getByText('-60')).toBeInTheDocument();
    });
  });

  describe('sizing', () => {
    it('applies custom size', () => {
      const { container } = render(<LevelMeter rms={-20} peak={-15} size={300} />);
      const meterBody = container.querySelector('[style*="height: 300px"]');
      expect(meterBody).toBeInTheDocument();
    });
  });
});

describe('MultiChannelMeter', () => {
  const mockChannels = [
    { rms: -20, peak: -15, peakHold: -10 },
    { rms: -25, peak: -20, peakHold: -15 },
  ];

  it('renders multiple meters', () => {
    render(<MultiChannelMeter channels={mockChannels} />);
    const meters = screen.getAllByRole('meter');
    expect(meters).toHaveLength(2);
  });

  it('passes clippedSamples only to first meter', () => {
    render(<MultiChannelMeter channels={mockChannels} clippedSamples={10} />);
    const clippingIndicators = screen.getAllByTestId('clipping-indicator');
    // Only the first meter should have the clipping indicator
    expect(clippingIndicators).toHaveLength(1);
    expect(clippingIndicators[0]).toHaveTextContent('CLIP');
  });

  it('has group role with label', () => {
    render(<MultiChannelMeter channels={mockChannels} groupLabel="Capture channels" />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Capture channels');
  });

  it('shows scale only on last meter', () => {
    render(<MultiChannelMeter channels={mockChannels} showScale />);
    // Scale should only appear once (on the last meter)
    const scaleMarks = screen.getAllByText('-12');
    expect(scaleMarks).toHaveLength(1);
  });

  it('calls onClippingReset only from first meter', async () => {
    const onReset = vi.fn();
    const { user } = render(
      <MultiChannelMeter channels={mockChannels} clippedSamples={10} onClippingReset={onReset} />
    );

    const indicator = screen.getByTestId('clipping-indicator');
    await user.click(indicator);

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe('MeterBridge', () => {
  const mockCapture = [
    { rms: -20, peak: -15, peakHold: -10 },
    { rms: -25, peak: -20, peakHold: -15 },
  ];

  const mockPlayback = [
    { rms: -18, peak: -12, peakHold: -8 },
    { rms: -22, peak: -16, peakHold: -12 },
  ];

  it('renders capture and playback sections', () => {
    render(<MeterBridge capture={mockCapture} playback={mockPlayback} />);
    expect(screen.getByText('Capture')).toBeInTheDocument();
    expect(screen.getByText('Playback')).toBeInTheDocument();
  });

  it('renders correct number of meters', () => {
    render(<MeterBridge capture={mockCapture} playback={mockPlayback} />);
    const meters = screen.getAllByRole('meter');
    // 2 capture + 2 playback = 4 meters
    expect(meters).toHaveLength(4);
  });

  it('shows clipping indicator only on playback section', () => {
    render(<MeterBridge capture={mockCapture} playback={mockPlayback} clippedSamples={10} />);
    const clippingIndicators = screen.getAllByTestId('clipping-indicator');
    // Only playback section should show clipping indicator
    expect(clippingIndicators).toHaveLength(1);
  });

  it('has correct group labels for sections', () => {
    render(<MeterBridge capture={mockCapture} playback={mockPlayback} />);
    const groups = screen.getAllByRole('group');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAttribute('aria-label', 'Capture channels');
    expect(groups[1]).toHaveAttribute('aria-label', 'Playback channels');
  });

  it('calls onClippingReset when playback clipping indicator is clicked', async () => {
    const onReset = vi.fn();
    const { user } = render(
      <MeterBridge
        capture={mockCapture}
        playback={mockPlayback}
        clippedSamples={10}
        onClippingReset={onReset}
      />
    );

    const indicator = screen.getByTestId('clipping-indicator');
    await user.click(indicator);

    expect(onReset).toHaveBeenCalled();
  });

  it('shows scale on playback section', () => {
    render(<MeterBridge capture={mockCapture} playback={mockPlayback} />);
    // Scale should appear on the last playback meter
    expect(screen.getByText('-12')).toBeInTheDocument();
  });
});
