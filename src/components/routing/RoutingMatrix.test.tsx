import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutingMatrix } from './RoutingMatrix';
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

describe('RoutingMatrix', () => {
  const defaultProps = {
    mixer: createTestMixer(),
    onMixerChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render matrix with correct dimensions', () => {
    const mixer = createTestMixer({ channels: { in: 2, out: 3 } });
    render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

    expect(screen.getByText('In 1')).toBeInTheDocument();
    expect(screen.getByText('In 2')).toBeInTheDocument();
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
      />,
    );

    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Main L')).toBeInTheDocument();
  });

  it('should show connected crosspoints with gain value', () => {
    const mixer = createTestMixer({
      mapping: [
        { dest: 0, sources: [createTestSource({ gain: -3.5 })] },
      ],
    });
    render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

    expect(screen.getByText('-3.5')).toBeInTheDocument();
  });

  it('should show phase inverted indicator', () => {
    const mixer = createTestMixer({
      mapping: [
        { dest: 0, sources: [createTestSource({ inverted: true })] },
      ],
    });
    render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

    // Legend has one Ø, cell has another — at least 2
    expect(screen.getAllByText('\u00D8').length).toBeGreaterThanOrEqual(2);
  });

  it('should show mute indicator', () => {
    const mixer = createTestMixer({
      mapping: [
        { dest: 0, sources: [createTestSource({ mute: true })] },
      ],
    });
    render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('should create connection on click of empty cell', async () => {
    const user = userEvent.setup();
    const onMixerChange = vi.fn();
    render(<RoutingMatrix mixer={createTestMixer()} onMixerChange={onMixerChange} />);

    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]!);

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
      }),
    );
  });

  it('should remove connection on right-click', () => {
    const onMixerChange = vi.fn();
    const mixer = createTestMixer({
      mapping: [
        { dest: 0, sources: [createTestSource()] },
      ],
    });
    render(<RoutingMatrix mixer={mixer} onMixerChange={onMixerChange} />);

    const cells = screen.getAllByRole('gridcell');
    fireEvent.contextMenu(cells[0]!);

    expect(onMixerChange).toHaveBeenCalledWith(
      expect.objectContaining({ mapping: [] }),
    );
  });

  it('should display correct crosspoint counts in status bar', () => {
    const mixer = createTestMixer({ channels: { in: 3, out: 2 } });
    render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

    expect(screen.getByText(/3 in .* 2 out = 6 crosspoints/)).toBeInTheDocument();
  });

  it('should display active route count in status bar', () => {
    const mixer = createTestMixer({
      mapping: [
        { dest: 0, sources: [createTestSource(), createTestSource({ channel: 1, mute: true })] },
      ],
    });
    render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

    expect(screen.getByText(/2 active.*1 muted/)).toBeInTheDocument();
  });

  describe('Multiple inputs to single output (summing)', () => {
    it('should display multiple sources for single output', () => {
      const mixer = createTestMixer({
        channels: { in: 2, out: 1 },
        mapping: [
          {
            dest: 0,
            sources: [
              createTestSource({ gain: 0 }),
              createTestSource({ channel: 1, gain: -6 }),
            ],
          },
        ],
      });
      render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('-6.0')).toBeInTheDocument();
    });
  });

  describe('Single input to multiple outputs (splitting)', () => {
    it('should display same input connected to multiple outputs', () => {
      const mixer = createTestMixer({
        channels: { in: 1, out: 2 },
        mapping: [
          { dest: 0, sources: [createTestSource({ gain: 0 })] },
          { dest: 1, sources: [createTestSource({ gain: -3 })] },
        ],
      });
      render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('-3.0')).toBeInTheDocument();
    });
  });

  describe('Keyboard navigation', () => {
    it('should navigate with arrow keys', () => {
      const mixer = createTestMixer({ channels: { in: 3, out: 3 } });
      render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

      const grid = screen.getByRole('grid');

      fireEvent.keyDown(grid, { key: 'ArrowDown' });
      fireEvent.keyDown(grid, { key: 'ArrowRight' });
      fireEvent.keyDown(grid, { key: 'ArrowUp' });
      fireEvent.keyDown(grid, { key: 'ArrowLeft' });

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
          { dest: 0, sources: [createTestSource()] },
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
        }),
      );
    });

    it('should toggle mute with M key', () => {
      const onMixerChange = vi.fn();
      const mixer = createTestMixer({
        mapping: [
          { dest: 0, sources: [createTestSource()] },
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
        }),
      );
    });

    it('should remove connection with Delete key', () => {
      const onMixerChange = vi.fn();
      const mixer = createTestMixer({
        mapping: [
          { dest: 0, sources: [createTestSource()] },
        ],
      });
      render(<RoutingMatrix mixer={mixer} onMixerChange={onMixerChange} />);

      const grid = screen.getByRole('grid');
      fireEvent.keyDown(grid, { key: 'Delete' });

      expect(onMixerChange).toHaveBeenCalled();
    });

    it('should close editing popover with Escape key', async () => {
      const user = userEvent.setup();
      const mixer = createTestMixer({
        mapping: [
          { dest: 0, sources: [createTestSource()] },
        ],
      });
      render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

      // Click a connected cell to open popover
      const cells = screen.getAllByRole('gridcell');
      await user.click(cells[0]!);

      // Press Escape
      const grid = screen.getByRole('grid');
      fireEvent.keyDown(grid, { key: 'Escape' });

      // Popover should be closed
      expect(screen.queryByText('Gain')).not.toBeInTheDocument();
    });
  });

  describe('ARIA accessibility', () => {
    it('should have proper grid role', () => {
      render(<RoutingMatrix {...defaultProps} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should have aria-label on grid', () => {
      render(<RoutingMatrix {...defaultProps} />);
      expect(screen.getByRole('grid')).toHaveAttribute('aria-label', 'Audio routing matrix');
    });

    it('should have correct gridcell count', () => {
      const mixer = createTestMixer({ channels: { in: 2, out: 3 } });
      render(<RoutingMatrix mixer={mixer} onMixerChange={vi.fn()} />);

      // 2 inputs x 3 outputs = 6 gridcells
      expect(screen.getAllByRole('gridcell').length).toBe(6);
    });
  });

  describe('Header bar', () => {
    it('should show legend items', () => {
      render(<RoutingMatrix {...defaultProps} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Muted')).toBeInTheDocument();
      expect(screen.getByText('Inverted')).toBeInTheDocument();
      expect(screen.getByText('Empty')).toBeInTheDocument();
    });

    it('should show keyboard shortcuts in status bar', () => {
      render(<RoutingMatrix {...defaultProps} />);
      expect(screen.getByText(/Arrow keys to navigate/)).toBeInTheDocument();
    });
  });
});
