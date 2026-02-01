import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen, fireEvent } from '../../test/setup';
import userEvent from '@testing-library/user-event';
import { EQEditor } from './EQEditor';
import { EQCanvas } from './EQCanvas';
import { EQNode } from './EQNode';
import { BandSelector } from './BandSelector';
import { BandParameters } from './BandParameters';
import type { EQBand, CanvasDimensions } from './types';
import {
  freqToX,
  gainToY,
  xToFreq,
  yToGain,
  getBandColor,
  getBandFrequency,
  getBandGain,
  getBandQ,
  hasGain,
  hasQ,
  hasSlope,
  BAND_COLORS,
} from './types';

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// Test data
const createTestBand = (overrides?: Partial<EQBand>): EQBand => ({
  id: 'test-band-1',
  enabled: true,
  parameters: {
    type: 'Peaking',
    freq: 1000,
    gain: 3,
    q: 1.0,
  },
  ...overrides,
});

const testDimensions: CanvasDimensions = {
  width: 800,
  height: 400,
  marginTop: 20,
  marginRight: 20,
  marginBottom: 40,
  marginLeft: 50,
};

describe('EQ Editor Type Utilities', () => {
  describe('freqToX', () => {
    it('should convert 20Hz to left margin', () => {
      const x = freqToX(20, testDimensions);
      expect(x).toBeCloseTo(testDimensions.marginLeft);
    });

    it('should convert 20kHz to right edge', () => {
      const x = freqToX(20000, testDimensions);
      const expectedX = testDimensions.width - testDimensions.marginRight;
      expect(x).toBeCloseTo(expectedX);
    });

    it('should convert 1kHz to middle (logarithmic)', () => {
      const x = freqToX(1000, testDimensions);
      // 1kHz is at log10(1000) = 3, range is log10(20)≈1.3 to log10(20000)≈4.3
      // So 3 is about 0.57 along the range
      expect(x).toBeGreaterThan(testDimensions.marginLeft);
      expect(x).toBeLessThan(testDimensions.width - testDimensions.marginRight);
    });
  });

  describe('xToFreq', () => {
    it('should convert left margin to 20Hz', () => {
      const freq = xToFreq(testDimensions.marginLeft, testDimensions);
      expect(freq).toBeCloseTo(20, 0);
    });

    it('should convert right edge to 20kHz', () => {
      const freq = xToFreq(testDimensions.width - testDimensions.marginRight, testDimensions);
      expect(freq).toBeCloseTo(20000, 0);
    });

    it('should be inverse of freqToX', () => {
      const originalFreq = 1000;
      const x = freqToX(originalFreq, testDimensions);
      const recovered = xToFreq(x, testDimensions);
      expect(recovered).toBeCloseTo(originalFreq, 1);
    });
  });

  describe('gainToY', () => {
    it('should convert +24dB to top margin', () => {
      const y = gainToY(24, testDimensions);
      expect(y).toBeCloseTo(testDimensions.marginTop);
    });

    it('should convert -24dB to bottom', () => {
      const y = gainToY(-24, testDimensions);
      const expectedY = testDimensions.height - testDimensions.marginBottom;
      expect(y).toBeCloseTo(expectedY);
    });

    it('should convert 0dB to center', () => {
      const y = gainToY(0, testDimensions);
      const plotHeight = testDimensions.height - testDimensions.marginTop - testDimensions.marginBottom;
      const center = testDimensions.marginTop + plotHeight / 2;
      expect(y).toBeCloseTo(center);
    });
  });

  describe('yToGain', () => {
    it('should convert top margin to +24dB', () => {
      const gain = yToGain(testDimensions.marginTop, testDimensions);
      expect(gain).toBeCloseTo(24);
    });

    it('should convert bottom to -24dB', () => {
      const gain = yToGain(testDimensions.height - testDimensions.marginBottom, testDimensions);
      expect(gain).toBeCloseTo(-24);
    });

    it('should be inverse of gainToY', () => {
      const originalGain = 6;
      const y = gainToY(originalGain, testDimensions);
      const recovered = yToGain(y, testDimensions);
      expect(recovered).toBeCloseTo(originalGain, 1);
    });
  });

  describe('getBandColor', () => {
    it('should return colors for indices 0-8', () => {
      for (let i = 0; i < 9; i++) {
        const color = getBandColor(i);
        expect(color).toBe(BAND_COLORS[i]!);
      }
    });

    it('should wrap around for indices >= 9', () => {
      const color = getBandColor(9);
      expect(color).toBe(BAND_COLORS[0]!);
    });
  });

  describe('getBandFrequency', () => {
    it('should extract freq from Peaking filter', () => {
      const params = { type: 'Peaking' as const, freq: 1000, gain: 3, q: 1 };
      expect(getBandFrequency(params)).toBe(1000);
    });

    it('should extract freq_act from LinkwitzTransform', () => {
      const params = {
        type: 'LinkwitzTransform' as const,
        freq_act: 30,
        q_act: 0.5,
        freq_target: 20,
        q_target: 0.707,
      };
      expect(getBandFrequency(params)).toBe(30);
    });

    it('should return 1000 as default', () => {
      const params = { type: 'ButterworthLowpass' as const, freq: 1000, order: 4 as const };
      expect(getBandFrequency(params)).toBe(1000);
    });
  });

  describe('getBandGain', () => {
    it('should extract gain from Peaking filter', () => {
      const params = { type: 'Peaking' as const, freq: 1000, gain: 3, q: 1 };
      expect(getBandGain(params)).toBe(3);
    });

    it('should return 0 for filters without gain', () => {
      const params = { type: 'Lowpass' as const, freq: 1000, q: 0.707 };
      expect(getBandGain(params)).toBe(0);
    });
  });

  describe('getBandQ', () => {
    it('should extract Q from Peaking filter', () => {
      const params = { type: 'Peaking' as const, freq: 1000, gain: 3, q: 2 };
      expect(getBandQ(params)).toBe(2);
    });

    it('should calculate Q from slope', () => {
      const params = { type: 'Lowshelf' as const, freq: 100, gain: 6, slope: 0.5 };
      expect(getBandQ(params)).toBe(2); // 1 / 0.5
    });

    it('should return default Q for filters without Q or slope', () => {
      const params = { type: 'LowpassFO' as const, freq: 1000 };
      expect(getBandQ(params)).toBeCloseTo(0.707, 3);
    });
  });

  describe('hasGain', () => {
    it('should return true for Peaking', () => {
      expect(hasGain('Peaking')).toBe(true);
    });

    it('should return true for shelf filters', () => {
      expect(hasGain('Lowshelf')).toBe(true);
      expect(hasGain('Highshelf')).toBe(true);
      expect(hasGain('LowshelfFO')).toBe(true);
      expect(hasGain('HighshelfFO')).toBe(true);
    });

    it('should return false for pass filters', () => {
      expect(hasGain('Lowpass')).toBe(false);
      expect(hasGain('Highpass')).toBe(false);
      expect(hasGain('Notch')).toBe(false);
    });
  });

  describe('hasQ', () => {
    it('should return true for filters with Q', () => {
      expect(hasQ('Lowpass')).toBe(true);
      expect(hasQ('Highpass')).toBe(true);
      expect(hasQ('Peaking')).toBe(true);
      expect(hasQ('Notch')).toBe(true);
      expect(hasQ('Bandpass')).toBe(true);
      expect(hasQ('Allpass')).toBe(true);
    });

    it('should return false for first-order filters', () => {
      expect(hasQ('LowpassFO')).toBe(false);
      expect(hasQ('HighpassFO')).toBe(false);
    });
  });

  describe('hasSlope', () => {
    it('should return true for shelf filters', () => {
      expect(hasSlope('Lowshelf')).toBe(true);
      expect(hasSlope('Highshelf')).toBe(true);
    });

    it('should return false for non-shelf filters', () => {
      expect(hasSlope('Peaking')).toBe(false);
      expect(hasSlope('Lowpass')).toBe(false);
    });
  });
});

describe('BandSelector', () => {
  const defaultProps = {
    bands: [createTestBand()],
    selectedIndex: null as number | null,
    onSelect: vi.fn(),
    onAdd: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render band buttons', () => {
    render(<BandSelector {...defaultProps} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should call onSelect when band button is clicked', async () => {
    render(<BandSelector {...defaultProps} />);

    const user = userEvent.setup();
    await user.click(screen.getByText('1'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith(0);
  });

  it('should deselect when selected band is clicked again', async () => {
    render(<BandSelector {...defaultProps} selectedIndex={0} />);

    const user = userEvent.setup();
    await user.click(screen.getByText('1'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith(null);
  });

  it('should call onAdd when add button is clicked', async () => {
    render(<BandSelector {...defaultProps} />);

    const user = userEvent.setup();
    const addButton = screen.getByRole('button', { name: /add band/i });
    await user.click(addButton);
    expect(defaultProps.onAdd).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<BandSelector {...defaultProps} disabled />);

    const bandButton = screen.getByText('1').closest('button');
    expect(bandButton).toBeDisabled();
  });

  it('should render multiple bands', () => {
    const bands = [
      createTestBand({ id: 'band-1' }),
      createTestBand({ id: 'band-2', parameters: { type: 'Highshelf', freq: 8000, gain: -3, slope: 1 } }),
      createTestBand({ id: 'band-3', parameters: { type: 'Lowpass', freq: 200, q: 0.707 } }),
    ];

    render(<BandSelector {...defaultProps} bands={bands} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

describe('BandParameters', () => {
  const defaultProps = {
    band: createTestBand(),
    onChange: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show placeholder when no band is selected', () => {
    render(<BandParameters band={null} onChange={vi.fn()} />);
    expect(screen.getByText('Select a band to edit parameters')).toBeInTheDocument();
  });

  it('should show frequency input for all filter types', () => {
    render(<BandParameters {...defaultProps} />);
    expect(screen.getByText('Frequency')).toBeInTheDocument();
  });

  it('should show gain input for Peaking filter', () => {
    render(<BandParameters {...defaultProps} />);
    expect(screen.getByText('Gain')).toBeInTheDocument();
  });

  it('should show Q input for Peaking filter', () => {
    render(<BandParameters {...defaultProps} />);
    expect(screen.getByText('Q Factor')).toBeInTheDocument();
  });

  it('should not show gain input for Lowpass filter', () => {
    const band = createTestBand({
      parameters: { type: 'Lowpass', freq: 1000, q: 0.707 },
    });
    render(<BandParameters band={band} onChange={vi.fn()} />);
    expect(screen.queryByText('Gain')).not.toBeInTheDocument();
  });

  it('should show slope input for Lowshelf filter', () => {
    const band = createTestBand({
      parameters: { type: 'Lowshelf', freq: 100, gain: 6, slope: 1 },
    });
    render(<BandParameters band={band} onChange={vi.fn()} />);
    expect(screen.getByText('Slope')).toBeInTheDocument();
  });

  it('should not show Q input for Lowshelf filter', () => {
    const band = createTestBand({
      parameters: { type: 'Lowshelf', freq: 100, gain: 6, slope: 1 },
    });
    render(<BandParameters band={band} onChange={vi.fn()} />);
    expect(screen.queryByText('Q Factor')).not.toBeInTheDocument();
  });

  it('should show filter type selector', () => {
    render(<BandParameters {...defaultProps} />);
    expect(screen.getByText('Filter Type')).toBeInTheDocument();
  });
});

describe('EQEditor', () => {
  const defaultProps = {
    bands: [createTestBand()],
    onChange: vi.fn(),
    sampleRate: 48000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<EQEditor {...defaultProps} />);
    expect(screen.getByText('Band Parameters')).toBeInTheDocument();
  });

  it('should render band selector', () => {
    render(<EQEditor {...defaultProps} />);
    // Use getAllByText since there are multiple elements with "1"
    const elements = screen.getAllByText('1');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should render keyboard shortcut hints', () => {
    render(<EQEditor {...defaultProps} />);
    expect(screen.getByText('1-9')).toBeInTheDocument();
    expect(screen.getByText('Select band')).toBeInTheDocument();
  });

  it('should handle band selection via number keys', async () => {
    const onSelectBand = vi.fn();

    render(
      <EQEditor
        {...defaultProps}
        selectedBandIndex={null}
        onSelectBand={onSelectBand}
      />
    );

    // Focus the container
    const container = screen.getByText('Band Parameters').closest<HTMLElement>('div[tabindex="0"]');
    if (container) {
      container.focus();
      fireEvent.keyDown(container, { key: '1' });
      expect(onSelectBand).toHaveBeenCalledWith(0);
    }
  });

  it('should handle Escape key to deselect', async () => {
    const onSelectBand = vi.fn();

    render(
      <EQEditor
        {...defaultProps}
        selectedBandIndex={0}
        onSelectBand={onSelectBand}
      />
    );

    const container = screen.getByText('Band 1').closest<HTMLElement>('div[tabindex="0"]');
    if (container) {
      container.focus();
      fireEvent.keyDown(container, { key: 'Escape' });
      expect(onSelectBand).toHaveBeenCalledWith(null);
    }
  });

  it('should handle Delete key to remove selected band', async () => {
    const onChange = vi.fn();

    render(
      <EQEditor
        {...defaultProps}
        onChange={onChange}
        selectedBandIndex={0}
        onSelectBand={vi.fn()}
      />
    );

    const container = screen.getByText('Band 1').closest<HTMLElement>('div[tabindex="0"]');
    if (container) {
      container.focus();
      fireEvent.keyDown(container, { key: 'Delete' });
      expect(onChange).toHaveBeenCalledWith([]);
    }
  });

  it('should handle B key to toggle bypass', async () => {
    const onChange = vi.fn();

    render(
      <EQEditor
        {...defaultProps}
        onChange={onChange}
        selectedBandIndex={0}
        onSelectBand={vi.fn()}
      />
    );

    const container = screen.getByText('Band 1').closest<HTMLElement>('div[tabindex="0"]');
    if (container) {
      container.focus();
      fireEvent.keyDown(container, { key: 'b' });
      expect(onChange).toHaveBeenCalled();
      const newBands = onChange.mock.calls[0]![0] as { enabled: boolean }[];
      expect(newBands[0]!.enabled).toBe(false);
    }
  });

  it('should show selected band title in parameter panel', () => {
    render(
      <EQEditor
        {...defaultProps}
        selectedBandIndex={0}
        onSelectBand={vi.fn()}
      />
    );
    expect(screen.getByText('Band 1')).toBeInTheDocument();
  });

  it('should be read-only when readOnly prop is true', () => {
    render(<EQEditor {...defaultProps} readOnly />);

    // Add button should be disabled
    const addButton = screen.getByRole('button', { name: /add band/i });
    expect(addButton).toBeDisabled();
  });

  it('should render with multiple bands', () => {
    const bands = [
      createTestBand({ id: 'band-1' }),
      createTestBand({ id: 'band-2', parameters: { type: 'Highshelf', freq: 8000, gain: -3, slope: 1 } }),
    ];

    render(<EQEditor {...defaultProps} bands={bands} />);

    // Use getAllByText since there may be multiple elements with these texts
    const ones = screen.getAllByText('1');
    const twos = screen.getAllByText('2');
    expect(ones.length).toBeGreaterThan(0);
    expect(twos.length).toBeGreaterThan(0);
  });
});

describe('EQCanvas', () => {
  const defaultProps = {
    bands: [createTestBand()],
    sampleRate: 48000,
    selectedBandIndex: null as number | null,
    onSelectBand: vi.fn(),
    onBandChange: vi.fn(),
    dimensions: testDimensions,
    readOnly: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render SVG element', () => {
    const { container } = render(<EQCanvas {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', String(testDimensions.width));
    expect(svg).toHaveAttribute('height', String(testDimensions.height));
  });

  it('should render frequency grid lines', () => {
    render(<EQCanvas {...defaultProps} />);
    // Check for frequency labels
    expect(screen.getByText('1.0k')).toBeInTheDocument(); // 1kHz
    expect(screen.getByText('100')).toBeInTheDocument(); // 100Hz
  });

  it('should render gain grid lines', () => {
    render(<EQCanvas {...defaultProps} />);
    // Check for gain labels - 0 dB is formatted as "0.0" (no plus sign)
    expect(screen.getByText('0.0')).toBeInTheDocument(); // 0dB
  });

  it('should render axis labels', () => {
    render(<EQCanvas {...defaultProps} />);
    expect(screen.getByText('Frequency (Hz)')).toBeInTheDocument();
    expect(screen.getByText('Gain (dB)')).toBeInTheDocument();
  });

  it('should call onSelectBand with null when clicking background', () => {
    const { container } = render(<EQCanvas {...defaultProps} />);
    const svg = container.querySelector('svg');
    if (svg) {
      fireEvent.mouseDown(svg, { button: 0 });
      expect(defaultProps.onSelectBand).toHaveBeenCalledWith(null);
    }
  });

  it('should keep updating newly-added band while dragging', () => {
    function AddBandDragHarness() {
      const [bands, setBands] = useState<EQBand[]>([]);
      const [selectedBandIndex, setSelectedBandIndex] = useState<number | null>(null);
      const dragIndexRef = useRef<number | null>(null);

      return (
        <>
          <EQCanvas
            bands={bands}
            sampleRate={defaultProps.sampleRate}
            selectedBandIndex={selectedBandIndex}
            onSelectBand={defaultProps.onSelectBand}
            onBandChange={defaultProps.onBandChange}
            onBackgroundPointerDown={(freq, gain) => {
              const newBand = createTestBand({
                id: 'new-band',
                parameters: {
                  type: 'Peaking',
                  freq: Math.round(freq),
                  gain: Math.round(gain * 10) / 10,
                  q: 1.0,
                },
              });
              const nextBands = [...bands, newBand];
              setBands(nextBands);
              dragIndexRef.current = nextBands.length - 1;
              setSelectedBandIndex(dragIndexRef.current);
            }}
            onBackgroundPointerMove={(freq, gain) => {
              const index = dragIndexRef.current;
              if (index === null) return;
              const nextBands = [...bands];
              const band = nextBands[index];
              if (!band) return;
              nextBands[index] = {
                ...band,
                parameters: {
                  ...band.parameters,
                  freq: Math.round(freq),
                  gain: Math.round(gain * 10) / 10,
                } as any,
              };
              setBands(nextBands);
            }}
            onBackgroundPointerUp={() => { dragIndexRef.current = null; }}
            dimensions={defaultProps.dimensions}
            readOnly={defaultProps.readOnly}
          />
          <div data-testid="band-freq">{bands[0] ? String(getBandFrequency(bands[0].parameters)) : ''}</div>
        </>
      );
    }

    const { container } = render(<AddBandDragHarness />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    const startX = freqToX(1000, testDimensions);
    const startY = gainToY(0, testDimensions);
    fireEvent.mouseDown(svg!, { clientX: startX, clientY: startY, button: 0 });

    const nodeGroup = container.querySelector('g.eq-node');
    expect(nodeGroup).toBeInTheDocument();
    const circles = nodeGroup!.querySelectorAll('circle');
    const mainCircle = Array.from(circles).find((circle) => {
      const fill = circle.getAttribute('fill');
      return fill && fill !== 'none' && fill !== 'transparent';
    });
    expect(mainCircle).toBeTruthy();
    const mainCircleEl = mainCircle as SVGCircleElement;
    expect(mainCircleEl).not.toHaveClass('transition-all');

    const moveX = freqToX(2000, testDimensions);
    const moveY = gainToY(6, testDimensions);
    fireEvent.mouseMove(window, { clientX: moveX, clientY: moveY });

    expect(screen.getByTestId('band-freq')).toHaveTextContent(String(Math.round(xToFreq(moveX, testDimensions))));

    fireEvent.mouseUp(window);
    expect(mainCircle).toHaveClass('transition-all');
  });
});

describe('EQNode', () => {
  const defaultProps = {
    band: createTestBand(),
    index: 0,
    isSelected: false,
    dimensions: testDimensions,
    onSelect: vi.fn(),
    onDrag: vi.fn(),
    onDragEnd: vi.fn(),
    onQChange: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a node at correct position', () => {
    const { container } = render(
      <svg>
        <EQNode {...defaultProps} />
      </svg>
    );

    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(0);

    // Check the main circle position
    const mainCircle = Array.from(circles).find((circle) => {
      const fill = circle.getAttribute('fill');
      return fill && fill !== 'none' && fill !== 'transparent';
    });
    expect(mainCircle).toBeTruthy();
    const mainCircleEl = mainCircle as SVGCircleElement;
    const cx = parseFloat(mainCircleEl.getAttribute('cx') || '0');
    const cy = parseFloat(mainCircleEl.getAttribute('cy') || '0');

    expect(cx).toBeCloseTo(freqToX(1000, testDimensions), 0);
    expect(cy).toBeCloseTo(gainToY(3, testDimensions), 0);
  });

  it('should call onSelect when clicked', () => {
    const { container } = render(
      <svg>
        <EQNode {...defaultProps} />
      </svg>
    );

    const group = container.querySelector('g.eq-node');
    if (group) {
      fireEvent.mouseDown(group);
      expect(defaultProps.onSelect).toHaveBeenCalled();
    }
  });

  it('should display band number', () => {
    render(
      <svg>
        <EQNode {...defaultProps} />
      </svg>
    );

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should show tooltip when selected', () => {
    render(
      <svg>
        <EQNode {...defaultProps} isSelected={true} />
      </svg>
    );

    // Should show frequency in tooltip (1000 Hz = 1.0k Hz)
    expect(screen.getByText('1.0k Hz')).toBeInTheDocument();
    // Should show gain in tooltip (+3.0 dB with space before dB)
    expect(screen.getByText('+3.0 dB')).toBeInTheDocument();
  });

  it('should have reduced opacity when disabled', () => {
    const disabledBand = { ...defaultProps.band, enabled: false };
    const { container } = render(
      <svg>
        <EQNode {...defaultProps} band={disabledBand} />
      </svg>
    );

    const group = container.querySelector('g.eq-node');
    expect(group).toHaveStyle({ opacity: '0.4' });
  });

  it('should call onQChange on wheel event', () => {
    const { container } = render(
      <svg>
        <EQNode {...defaultProps} isSelected={true} />
      </svg>
    );

    const group = container.querySelector('g.eq-node');
    if (group) {
      fireEvent.wheel(group, { deltaY: -100 });
      expect(defaultProps.onQChange).toHaveBeenCalled();
    }
  });
});
