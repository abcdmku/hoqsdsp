import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutingMatrix } from './RoutingMatrix';
import { CrosspointCell } from './CrosspointCell';
import { CrosspointEditor } from './CrosspointEditor';
import type { MixerConfig, MixerSource } from '../../types';

// Test data factories
const createTestMixer = (overrides?: Partial<MixerConfig>): MixerConfig => ({
  channels: { in: 4, out: 4 },
  mapping: [],
  ...overrides,
});

const createTestSource = (overrides?: Partial<MixerSource>): MixerSource => ({
  channel: 0,
  gain: 0,
  inverted: false,
  mute: false,
  ...overrides,
});

describe('CrosspointCell', () => {
  const defaultProps = {
    source: undefined as MixerSource | undefined,
    isSelected: false,
    isFocused: false,
    inputIndex: 0,
    outputIndex: 0,
    onClick: vi.fn(),
    onToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty cell when no source', () => {
    render(<CrosspointCell {...defaultProps} />);
    const button = screen.getByRole('gridcell');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('not connected'));
  });

  it('should render connected cell with gain display', () => {
    const source = createTestSource({ gain: 3 });
    render(<CrosspointCell {...defaultProps} source={source} />);
    expect(screen.getByText('+3.0 dB')).toBeInTheDocument();
  });

  it('should render negative gain correctly', () => {
    const source = createTestSource({ gain: -6 });
    render(<CrosspointCell {...defaultProps} source={source} />);
    expect(screen.getByText('-6.0 dB')).toBeInTheDocument();
  });

  it('should render zero gain correctly', () => {
    const source = createTestSource({ gain: 0 });
    render(<CrosspointCell {...defaultProps} source={source} />);
    expect(screen.getByText('0.0 dB')).toBeInTheDocument();
  });

  it('should show phase invert indicator', () => {
    const source = createTestSource({ inverted: true });
    render(<CrosspointCell {...defaultProps} source={source} />);
    expect(screen.getByText('180°')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    render(<CrosspointCell {...defaultProps} />);

    await user.click(screen.getByRole('gridcell'));
    expect(defaultProps.onClick).toHaveBeenCalled();
  });

  it('should call onToggle when double-clicked', async () => {
    const user = userEvent.setup();
    render(<CrosspointCell {...defaultProps} />);

    await user.dblClick(screen.getByRole('gridcell'));
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('should have selected styling when isSelected is true', () => {
    render(<CrosspointCell {...defaultProps} isSelected={true} />);
    const button = screen.getByRole('gridcell');
    expect(button).toHaveClass('ring-2');
    expect(button).toHaveAttribute('aria-selected', 'true');
  });

  it('should have focused styling when isFocused is true', () => {
    render(<CrosspointCell {...defaultProps} isFocused={true} />);
    const button = screen.getByRole('gridcell');
    expect(button).toHaveAttribute('tabIndex', '0');
  });

  it('should have correct aria-label for connected source', () => {
    const source = createTestSource({ gain: -3.5, inverted: true, mute: false });
    render(<CrosspointCell {...defaultProps} source={source} inputIndex={1} outputIndex={2} />);
    const button = screen.getByRole('gridcell');
    expect(button).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Input 2 to Output 3')
    );
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('-3.5 dB'));
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('phase inverted'));
  });

  it('should show muted styling for muted source', () => {
    const source = createTestSource({ mute: true });
    render(<CrosspointCell {...defaultProps} source={source} />);
    const button = screen.getByRole('gridcell');
    expect(button).toHaveClass('bg-dsp-primary/15');
  });
});

describe('CrosspointEditor', () => {
  const defaultProps = {
    source: undefined as MixerSource | undefined,
    inputChannel: 0,
    inputLabel: 'In 1',
    outputLabel: 'Out 1',
    onSourceChange: vi.fn(),
    onAddConnection: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show add connection message when no source', () => {
    render(<CrosspointEditor {...defaultProps} />);
    expect(screen.getByText(/No connection/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Connection/i })).toBeInTheDocument();
  });

  it('should call onAddConnection when add button is clicked', async () => {
    const user = userEvent.setup();
    render(<CrosspointEditor {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Add Connection/i }));
    expect(defaultProps.onAddConnection).toHaveBeenCalled();
  });

  it('should show editor controls when source exists', () => {
    const source = createTestSource();
    render(<CrosspointEditor {...defaultProps} source={source} />);

    expect(screen.getByText('Gain')).toBeInTheDocument();
    expect(screen.getByText('Phase')).toBeInTheDocument();
    expect(screen.getByText('Mute')).toBeInTheDocument();
  });

  it('should display input-output labels', () => {
    const source = createTestSource();
    render(
      <CrosspointEditor
        {...defaultProps}
        source={source}
        inputLabel="Left"
        outputLabel="Main L"
      />
    );
    expect(screen.getByText((content) => content.includes('Left') && content.includes('Main L'))).toBeInTheDocument();
  });

  it('should show inverted state in phase button', () => {
    const source = createTestSource({ inverted: true });
    render(<CrosspointEditor {...defaultProps} source={source} />);
    expect(screen.getByRole('button', { name: '180°' })).toBeInTheDocument();
  });

  it('should show normal state in phase button', () => {
    const source = createTestSource({ inverted: false });
    render(<CrosspointEditor {...defaultProps} source={source} />);
    expect(screen.getByRole('button', { name: '0°' })).toBeInTheDocument();
  });

  it('should show muted state in mute button', () => {
    const source = createTestSource({ mute: true });
    render(<CrosspointEditor {...defaultProps} source={source} />);
    expect(screen.getByRole('button', { name: 'Muted' })).toBeInTheDocument();
  });

  it('should show active state in mute button', () => {
    const source = createTestSource({ mute: false });
    render(<CrosspointEditor {...defaultProps} source={source} />);
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
  });

  it('should call onSourceChange with updated inverted when phase button clicked', async () => {
    const user = userEvent.setup();
    const source = createTestSource({ inverted: false });
    render(<CrosspointEditor {...defaultProps} source={source} />);

    await user.click(screen.getByRole('button', { name: '0°' }));
    expect(defaultProps.onSourceChange).toHaveBeenCalledWith(
      expect.objectContaining({ inverted: true })
    );
  });

  it('should call onSourceChange with updated mute when mute button clicked', async () => {
    const user = userEvent.setup();
    const source = createTestSource({ mute: false });
    render(<CrosspointEditor {...defaultProps} source={source} />);

    await user.click(screen.getByRole('button', { name: 'Active' }));
    expect(defaultProps.onSourceChange).toHaveBeenCalledWith(
      expect.objectContaining({ mute: true })
    );
  });

  it('should call onSourceChange with null when remove button clicked', async () => {
    const user = userEvent.setup();
    const source = createTestSource();
    render(<CrosspointEditor {...defaultProps} source={source} />);

    await user.click(screen.getByRole('button', { name: /Remove Connection/i }));
    expect(defaultProps.onSourceChange).toHaveBeenCalledWith(null);
  });

  it('should call onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const source = createTestSource();
    render(<CrosspointEditor {...defaultProps} source={source} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should display gain value', () => {
    const source = createTestSource({ gain: -6 });
    render(<CrosspointEditor {...defaultProps} source={source} />);
    expect(screen.getByText('-6.0 dB')).toBeInTheDocument();
  });
});

describe('RoutingMatrix', () => {
  const defaultProps = {
    mixer: createTestMixer(),
    onMixerChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Toolbar tools', () => {
    it('should toggle a tool active state when clicked', async () => {
      const user = userEvent.setup();
      render(<RoutingMatrix {...defaultProps} />);

      const phase = screen.getByRole('button', { name: 'Phase' });
      expect(phase).toHaveAttribute('aria-pressed', 'false');

      await user.click(phase);
      expect(phase).toHaveAttribute('aria-pressed', 'true');

      await user.click(phase);
      expect(phase).toHaveAttribute('aria-pressed', 'false');
    });

    it('should apply gain tool on cell click and not open the editor', async () => {
      const user = userEvent.setup();
      const onMixerChange = vi.fn();
      render(<RoutingMatrix mixer={createTestMixer({ channels: { in: 2, out: 2 } })} onMixerChange={onMixerChange} />);

      await user.click(screen.getByRole('button', { name: 'Gain' }));

      const gainInput = screen.getByRole('textbox', { name: 'Tool gain' });
      await user.clear(gainInput);
      await user.type(gainInput, '-6');
      fireEvent.blur(gainInput);

      const cells = screen.getAllByRole('gridcell');
      await user.click(cells[0]!);

      expect(onMixerChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mapping: expect.arrayContaining([
            expect.objectContaining({
              dest: 0,
              sources: expect.arrayContaining([
                expect.objectContaining({ channel: 0, gain: -6 }),
              ]),
            }),
          ]),
        }),
      );

      expect(screen.queryByText(/No connection/)).not.toBeInTheDocument();
    });

    it('should toggle phase with shift+click when no tool is active', () => {
      const onMixerChange = vi.fn();
      const mixer = createTestMixer({
        channels: { in: 2, out: 2 },
        mapping: [
          { dest: 0, sources: [{ channel: 0, gain: 0, inverted: false, mute: false }] },
        ],
      });

      render(<RoutingMatrix mixer={mixer} onMixerChange={onMixerChange} />);
      const cell = screen.getAllByRole('gridcell')[0]!;
      fireEvent.click(cell, { shiftKey: true });

      expect(onMixerChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mapping: expect.arrayContaining([
            expect.objectContaining({
              dest: 0,
              sources: expect.arrayContaining([
                expect.objectContaining({ inverted: true }),
              ]),
            }),
          ]),
        }),
      );

      expect(screen.queryByText(/No connection/)).not.toBeInTheDocument();
    });

    it('should disconnect an existing connection when disconnect tool is active', async () => {
      const user = userEvent.setup();
      const onMixerChange = vi.fn();
      const mixer = createTestMixer({
        channels: { in: 1, out: 1 },
        mapping: [
          { dest: 0, sources: [{ channel: 0, gain: 0, inverted: false, mute: false }] },
        ],
      });

      render(<RoutingMatrix mixer={mixer} onMixerChange={onMixerChange} />);

      await user.click(screen.getByRole('button', { name: 'Disconnect' }));
      await user.click(screen.getAllByRole('gridcell')[0]!);

      expect(onMixerChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mapping: [],
        }),
      );
    });

    it('should apply gain to all connections in an input channel when clicking its header', async () => {
      const user = userEvent.setup();
      const onMixerChange = vi.fn();
      const mixer = createTestMixer({
        channels: { in: 2, out: 2 },
        mapping: [
          { dest: 0, sources: [{ channel: 0, gain: 0, inverted: false, mute: false }, { channel: 1, gain: 0, inverted: false, mute: false }] },
          { dest: 1, sources: [{ channel: 0, gain: -3, inverted: false, mute: false }] },
        ],
      });

      render(<RoutingMatrix mixer={mixer} onMixerChange={onMixerChange} />);

      await user.click(screen.getByRole('button', { name: 'Gain' }));
      const gainInput = screen.getByRole('textbox', { name: 'Tool gain' });
      await user.clear(gainInput);
      await user.type(gainInput, '6');
      fireEvent.blur(gainInput);

      const inputHeader = screen.getByText('In 1').closest('button');
      expect(inputHeader).toBeTruthy();
      await user.click(inputHeader!);

      expect(onMixerChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mapping: expect.arrayContaining([
            expect.objectContaining({
              dest: 0,
              sources: expect.arrayContaining([
                expect.objectContaining({ channel: 0, gain: 6 }),
                expect.objectContaining({ channel: 1, gain: 0 }),
              ]),
            }),
            expect.objectContaining({
              dest: 1,
              sources: expect.arrayContaining([
                expect.objectContaining({ channel: 0, gain: 6 }),
              ]),
            }),
          ]),
        }),
      );
    });

    it('should apply mute to all connections when clicking a device action', async () => {
      const user = userEvent.setup();
      const onMixerChange = vi.fn();
      const mixer = createTestMixer({
        channels: { in: 2, out: 2 },
        mapping: [
          { dest: 0, sources: [{ channel: 0, gain: 0, inverted: false, mute: false }] },
          { dest: 1, sources: [{ channel: 1, gain: 0, inverted: false, mute: true }] },
        ],
      });

      render(<RoutingMatrix mixer={mixer} onMixerChange={onMixerChange} />);

      await user.click(screen.getByRole('button', { name: 'Mute' }));
      await user.click(screen.getByRole('button', { name: 'Capture' }));

      expect(onMixerChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mapping: expect.arrayContaining([
            expect.objectContaining({
              dest: 0,
              sources: expect.arrayContaining([
                expect.objectContaining({ mute: true }),
              ]),
            }),
            expect.objectContaining({
              dest: 1,
              sources: expect.arrayContaining([
                expect.objectContaining({ mute: true }),
              ]),
            }),
          ]),
        }),
      );
    });
  });

  it('should render matrix with correct dimensions', () => {
    const mixer = createTestMixer({ channels: { in: 2, out: 3 } });
    render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

    // Should have 2 input rows
    expect(screen.getByText('In 1')).toBeInTheDocument();
    expect(screen.getByText('In 2')).toBeInTheDocument();

    // Should have 3 output columns
    expect(screen.getByText('Out 1')).toBeInTheDocument();
    expect(screen.getByText('Out 2')).toBeInTheDocument();
    expect(screen.getByText('Out 3')).toBeInTheDocument();
  });

  it('should render with custom input/output labels', () => {
    render(
      <RoutingMatrix
        {...defaultProps}
        inputLabels={['Left', 'Right', 'Center', 'LFE']}
        outputLabels={['Main L', 'Main R', 'Sub', 'Rear']}
      />
    );

    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Main L')).toBeInTheDocument();
  });

  it('should show connected crosspoints', () => {
    const mixer = createTestMixer({
      mapping: [
        { dest: 0, sources: [{ channel: 0, gain: 0, inverted: false, mute: false }] },
      ],
    });
    render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

    // Check for gain display in connected cell
    expect(screen.getByText('0.0 dB')).toBeInTheDocument();
  });

  it('should show crosspoint editor when cell is selected', async () => {
    const user = userEvent.setup();
    render(<RoutingMatrix {...defaultProps} />);

    // Click on a cell
    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]!);

    // Editor should appear
    expect(screen.getByText(/No connection/)).toBeInTheDocument();
  });

  it('should toggle connection on double-click', async () => {
    const user = userEvent.setup();
    const onMixerChange = vi.fn();
    render(<RoutingMatrix mixer={createTestMixer()} onMixerChange={onMixerChange} />);

    const cells = screen.getAllByRole('gridcell');
    await user.dblClick(cells[0]!);

    expect(onMixerChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mapping: expect.arrayContaining([
          expect.objectContaining({
            dest: 0,
            sources: expect.arrayContaining([
              expect.objectContaining({ channel: 0, gain: 0 }),
            ]),
          }),
        ]),
      })
    );
  });

  it('should remove connection on double-click when connected', async () => {
    const user = userEvent.setup();
    const onMixerChange = vi.fn();
    const mixer = createTestMixer({
      mapping: [
        { dest: 0, sources: [{ channel: 0, gain: 0, inverted: false, mute: false }] },
      ],
    });
    render(<RoutingMatrix mixer={mixer} onMixerChange={onMixerChange} />);

    const cells = screen.getAllByRole('gridcell');
    await user.dblClick(cells[0]!);

    expect(onMixerChange).toHaveBeenCalled();
    const newMixer = onMixerChange.mock.calls[0]![0];
    // Mapping should be empty since removing the only source removes the mapping
    expect(newMixer.mapping).toHaveLength(0);
  });

  it('should render legend', () => {
    render(<RoutingMatrix {...defaultProps} />);
    expect(screen.getByText(/Connected/)).toBeInTheDocument();
    expect(screen.getByText(/Muted/)).toBeInTheDocument();
    expect(screen.getByText('180°')).toBeInTheDocument();
  });

  it('should render keyboard shortcuts help', () => {
    render(<RoutingMatrix {...defaultProps} />);
    expect(screen.getByText(/Arrow keys to navigate/)).toBeInTheDocument();
  });

  describe('Keyboard navigation', () => {
    it('should navigate with arrow keys', () => {
      const mixer = createTestMixer({ channels: { in: 3, out: 3 } });
      render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

      const grid = screen.getByRole('grid');

      // Navigate down
      fireEvent.keyDown(grid, { key: 'ArrowDown' });
      // Navigate right
      fireEvent.keyDown(grid, { key: 'ArrowRight' });
      // Navigate up
      fireEvent.keyDown(grid, { key: 'ArrowUp' });
      // Navigate left
      fireEvent.keyDown(grid, { key: 'ArrowLeft' });

      // Just verify no errors occur
      expect(grid).toBeInTheDocument();
    });

    it('should toggle connection with Space key', () => {
      const onMixerChange = vi.fn();
      render(<RoutingMatrix mixer={createTestMixer()} onMixerChange={onMixerChange} />);

      const grid = screen.getByRole('grid');
      fireEvent.keyDown(grid, { key: ' ' });

      expect(onMixerChange).toHaveBeenCalled();
    });

    it('should toggle connection with Enter key', () => {
      const onMixerChange = vi.fn();
      render(<RoutingMatrix mixer={createTestMixer()} onMixerChange={onMixerChange} />);

      const grid = screen.getByRole('grid');
      fireEvent.keyDown(grid, { key: 'Enter' });

      expect(onMixerChange).toHaveBeenCalled();
    });

    it('should toggle phase with I key', () => {
      const onMixerChange = vi.fn();
      const mixer = createTestMixer({
        mapping: [
          { dest: 0, sources: [{ channel: 0, gain: 0, inverted: false, mute: false }] },
        ],
      });
      render(<RoutingMatrix mixer={mixer} onMixerChange={onMixerChange} />);

      const grid = screen.getByRole('grid');
      fireEvent.keyDown(grid, { key: 'i' });

      expect(onMixerChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mapping: expect.arrayContaining([
            expect.objectContaining({
              sources: expect.arrayContaining([
                expect.objectContaining({ inverted: true }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should toggle mute with M key', () => {
      const onMixerChange = vi.fn();
      const mixer = createTestMixer({
        mapping: [
          { dest: 0, sources: [{ channel: 0, gain: 0, inverted: false, mute: false }] },
        ],
      });
      render(<RoutingMatrix mixer={mixer} onMixerChange={onMixerChange} />);

      const grid = screen.getByRole('grid');
      fireEvent.keyDown(grid, { key: 'm' });

      expect(onMixerChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mapping: expect.arrayContaining([
            expect.objectContaining({
              sources: expect.arrayContaining([
                expect.objectContaining({ mute: true }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should remove connection with Delete key', () => {
      const onMixerChange = vi.fn();
      const mixer = createTestMixer({
        mapping: [
          { dest: 0, sources: [{ channel: 0, gain: 0, inverted: false, mute: false }] },
        ],
      });
      render(<RoutingMatrix mixer={mixer} onMixerChange={onMixerChange} />);

      const grid = screen.getByRole('grid');
      fireEvent.keyDown(grid, { key: 'Delete' });

      expect(onMixerChange).toHaveBeenCalled();
    });

    it('should deselect with Escape key', async () => {
      const user = userEvent.setup();
      render(<RoutingMatrix {...defaultProps} />);

      // Select a cell first
      const cells = screen.getAllByRole('gridcell');
      await user.click(cells[0]!);
      expect(screen.getByText(/No connection/)).toBeInTheDocument();

      // Press Escape
      const grid = screen.getByRole('grid');
      fireEvent.keyDown(grid, { key: 'Escape' });

      // Editor should be closed (no "No connection" message)
      expect(screen.queryByText(/No connection/)).not.toBeInTheDocument();
    });
  });

  describe('Multiple inputs to single output (summing)', () => {
    it('should display multiple sources for single output', () => {
      const mixer = createTestMixer({
        channels: { in: 2, out: 1 },
        mapping: [
          {
            dest: 0,
            sources: [
              { channel: 0, gain: 0, inverted: false, mute: false },
              { channel: 1, gain: -6, inverted: false, mute: false },
            ],
          },
        ],
      });
      render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

      expect(screen.getByText('0.0 dB')).toBeInTheDocument();
      expect(screen.getByText('-6.0 dB')).toBeInTheDocument();
    });
  });

  describe('Single input to multiple outputs (splitting)', () => {
    it('should display same input connected to multiple outputs', () => {
      const mixer = createTestMixer({
        channels: { in: 1, out: 2 },
        mapping: [
          { dest: 0, sources: [{ channel: 0, gain: 0, inverted: false, mute: false }] },
          { dest: 1, sources: [{ channel: 0, gain: -3, inverted: false, mute: false }] },
        ],
      });
      render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

      expect(screen.getByText('0.0 dB')).toBeInTheDocument();
      expect(screen.getByText('-3.0 dB')).toBeInTheDocument();
    });
  });

  describe('ARIA accessibility', () => {
    it('should have proper grid role', () => {
      render(<RoutingMatrix {...defaultProps} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should have aria-label on grid', () => {
      render(<RoutingMatrix {...defaultProps} />);
      expect(screen.getByRole('grid')).toHaveAttribute(
        'aria-label',
        'Audio routing matrix'
      );
    });

    it('should have row and columnheader roles', () => {
      render(<RoutingMatrix {...defaultProps} />);
      expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
      // 4 output columns + input/output device headers = 7 columnheaders
      expect(screen.getAllByRole('columnheader').length).toBe(7);
    });
  });
});
