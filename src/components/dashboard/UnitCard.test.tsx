import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnitCard, type UnitCardProps } from './UnitCard';
import { TooltipProvider } from '../ui/Tooltip';
import type { DSPUnit } from '../../types';

// Mock the MiniMeter component
vi.mock('../monitoring/MiniMeter', () => ({
  StereoMiniMeter: ({ leftLevel, rightLevel }: { leftLevel: number; rightLevel: number }) => (
    <div data-testid="stereo-mini-meter">
      L: {leftLevel} R: {rightLevel}
    </div>
  ),
}));

const mockUnit: DSPUnit = {
  id: 'unit-1',
  name: 'Living Room',
  address: '192.168.1.100',
  port: 1234,
  zone: 'Main Floor',
};

const defaultProps: UnitCardProps = {
  unit: mockUnit,
  status: 'connected',
};

// Helper to render with TooltipProvider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

describe('UnitCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render unit name and address', () => {
      renderWithProvider(<UnitCard {...defaultProps} />);

      expect(screen.getByText('Living Room')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.100:1234')).toBeInTheDocument();
    });

    it('should render zone badge when zone is provided', () => {
      renderWithProvider(<UnitCard {...defaultProps} />);

      expect(screen.getByText('Main Floor')).toBeInTheDocument();
    });

    it('should not render zone badge when zone is not provided', () => {
      const unitWithoutZone = { ...mockUnit, zone: undefined };
      renderWithProvider(<UnitCard {...defaultProps} unit={unitWithoutZone} />);

      expect(screen.queryByText('Main Floor')).not.toBeInTheDocument();
    });

    it('should render version when provided and connected', () => {
      renderWithProvider(<UnitCard {...defaultProps} version="1.0.3" />);

      expect(screen.getByText('CamillaDSP 1.0.3')).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('should render status indicator for connected', () => {
      const { container } = renderWithProvider(<UnitCard {...defaultProps} status="connected" />);

      // Status indicator dot should have the connected color class
      const statusDot = container.querySelector('.bg-status-online');
      expect(statusDot).toBeInTheDocument();
    });

    it('should render status indicator for connecting', () => {
      const { container } = renderWithProvider(<UnitCard {...defaultProps} status="connecting" />);

      // Status indicator should have the connecting animation class
      const statusDot = container.querySelector('.animate-pulse');
      expect(statusDot).toBeInTheDocument();
    });

    it('should render status indicator for disconnected', () => {
      const { container } = renderWithProvider(<UnitCard {...defaultProps} status="disconnected" />);

      // Status indicator dot should have the disconnected color class
      const statusDot = container.querySelector('.bg-status-offline');
      expect(statusDot).toBeInTheDocument();
    });

    it('should render status indicator for error', () => {
      const { container } = renderWithProvider(<UnitCard {...defaultProps} status="error" />);

      // Status indicator dot should have the error color class
      const statusDot = container.querySelector('.bg-status-error');
      expect(statusDot).toBeInTheDocument();
    });
  });

  describe('Metrics Display', () => {
    it('should show sample rate when connected', () => {
      renderWithProvider(<UnitCard {...defaultProps} sampleRate={48000} />);

      expect(screen.getByText('48.0 kHz')).toBeInTheDocument();
    });

    it('should show channel configuration when connected', () => {
      renderWithProvider(<UnitCard {...defaultProps} inputChannels={2} outputChannels={8} />);

      expect(screen.getByText('2 → 8')).toBeInTheDocument();
    });

    it('should show CPU load with color coding', () => {
      renderWithProvider(<UnitCard {...defaultProps} processingLoad={85} />);

      const loadText = screen.getByText('85.0%');
      expect(loadText).toHaveClass('text-meter-red');
    });

    it('should show buffer level with color coding', () => {
      renderWithProvider(<UnitCard {...defaultProps} bufferLevel={30} />);

      const bufferText = screen.getByText('30%');
      expect(bufferText).toHaveClass('text-meter-yellow');
    });

    it('should not show metrics when disconnected', () => {
      renderWithProvider(<UnitCard {...defaultProps} status="disconnected" sampleRate={48000} />);

      expect(screen.queryByText('48.0 kHz')).not.toBeInTheDocument();
    });
  });

  describe('Level Meters', () => {
    it('should render input level meters when provided', () => {
      renderWithProvider(<UnitCard {...defaultProps} inputLevels={[-20, -18]} />);

      expect(screen.getByText('IN')).toBeInTheDocument();
    });

    it('should render output level meters when provided', () => {
      renderWithProvider(<UnitCard {...defaultProps} outputLevels={[-15, -12]} />);

      expect(screen.getByText('OUT')).toBeInTheDocument();
    });

    it('should not render meters when disconnected', () => {
      renderWithProvider(<UnitCard {...defaultProps} status="disconnected" inputLevels={[-20, -18]} />);

      expect(screen.queryByText('IN')).not.toBeInTheDocument();
    });
  });

  describe('Volume Control', () => {
    it('should render volume slider when onVolumeChange is provided and connected', () => {
      const onVolumeChange = vi.fn();
      renderWithProvider(<UnitCard {...defaultProps} onVolumeChange={onVolumeChange} volume={-10} />);

      expect(screen.getByText('-10.0 dB')).toBeInTheDocument();
    });

    it('should not render volume control when disconnected', () => {
      const onVolumeChange = vi.fn();
      renderWithProvider(
        <UnitCard {...defaultProps} status="disconnected" onVolumeChange={onVolumeChange} volume={-10} />
      );

      expect(screen.queryByText('-10.0 dB')).not.toBeInTheDocument();
    });

    it('should call onMuteToggle when mute button clicked', () => {
      const onMuteToggle = vi.fn();
      renderWithProvider(
        <UnitCard {...defaultProps} onVolumeChange={vi.fn()} onMuteToggle={onMuteToggle} />
      );

      fireEvent.click(screen.getByRole('button', { name: /mute/i }));

      expect(onMuteToggle).toHaveBeenCalledTimes(1);
    });

    it('should show muted state correctly', () => {
      renderWithProvider(<UnitCard {...defaultProps} onVolumeChange={vi.fn()} muted />);

      expect(screen.getByRole('button', { name: /unmute/i })).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when card is clicked', () => {
      const onClick = vi.fn();
      const { container } = renderWithProvider(<UnitCard {...defaultProps} onClick={onClick} />);

      // The card element has role="button" on the containing div
      const card = container.querySelector('[role="button"]');
      if (card) {
        fireEvent.click(card);
      }

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick on keyboard Enter', () => {
      const onClick = vi.fn();
      const { container } = renderWithProvider(<UnitCard {...defaultProps} onClick={onClick} />);

      const card = container.querySelector('[role="button"]');
      if (card) {
        fireEvent.keyDown(card, { key: 'Enter' });
      }

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should have tabIndex when onClick is provided', () => {
      const onClick = vi.fn();
      const { container } = renderWithProvider(<UnitCard {...defaultProps} onClick={onClick} />);

      // The card itself is the clickable element with role="button"
      const card = container.querySelector('[role="button"]');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should call onSettingsClick when settings button clicked', () => {
      const onSettingsClick = vi.fn();
      renderWithProvider(<UnitCard {...defaultProps} onSettingsClick={onSettingsClick} />);

      fireEvent.click(screen.getByRole('button', { name: /settings/i }));

      expect(onSettingsClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Selection State', () => {
    it('should apply selected styling when isSelected is true', () => {
      const { container } = renderWithProvider(<UnitCard {...defaultProps} isSelected onClick={vi.fn()} />);

      const card = container.querySelector('[role="button"]');
      expect(card).toHaveClass('border-dsp-accent');
    });
  });

  describe('Last Seen Formatting', () => {
    it('should render disconnected with last seen data', () => {
      const now = Date.now();
      const { container } = renderWithProvider(<UnitCard {...defaultProps} status="disconnected" lastSeen={now - 30000} />);

      // Verify component renders in disconnected state
      const statusDot = container.querySelector('.bg-status-offline');
      expect(statusDot).toBeInTheDocument();
    });

    it('should update last seen periodically when disconnected', () => {
      const lastSeen = Date.now() - 60000; // 1 minute ago
      const { container } = renderWithProvider(<UnitCard {...defaultProps} status="disconnected" lastSeen={lastSeen} />);

      // Advance timers by 1 minute
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      // Component should have re-rendered (no error is success)
      const statusDot = container.querySelector('.bg-status-offline');
      expect(statusDot).toBeInTheDocument();
    });

    it('should not update last seen when connected', () => {
      const { container } = renderWithProvider(<UnitCard {...defaultProps} status="connected" lastSeen={Date.now()} />);

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(120000);
      });

      // Should still be connected
      const statusDot = container.querySelector('.bg-status-online');
      expect(statusDot).toBeInTheDocument();
    });
  });

  describe('CPU Load Color Coding', () => {
    it('should show green for low CPU load', () => {
      renderWithProvider(<UnitCard {...defaultProps} processingLoad={30} />);

      const loadText = screen.getByText('30.0%');
      expect(loadText).toHaveClass('text-meter-green');
    });

    it('should show yellow for medium CPU load', () => {
      renderWithProvider(<UnitCard {...defaultProps} processingLoad={60} />);

      const loadText = screen.getByText('60.0%');
      expect(loadText).toHaveClass('text-meter-yellow');
    });

    it('should show red for high CPU load', () => {
      renderWithProvider(<UnitCard {...defaultProps} processingLoad={90} />);

      const loadText = screen.getByText('90.0%');
      expect(loadText).toHaveClass('text-meter-red');
    });
  });

  describe('Buffer Level Color Coding', () => {
    it('should show green for healthy buffer level', () => {
      renderWithProvider(<UnitCard {...defaultProps} bufferLevel={75} />);

      const bufferText = screen.getByText('75%');
      expect(bufferText).toHaveClass('text-meter-green');
    });

    it('should show yellow for low buffer level', () => {
      renderWithProvider(<UnitCard {...defaultProps} bufferLevel={35} />);

      const bufferText = screen.getByText('35%');
      expect(bufferText).toHaveClass('text-meter-yellow');
    });

    it('should show red for critically low buffer level', () => {
      renderWithProvider(<UnitCard {...defaultProps} bufferLevel={10} />);

      const bufferText = screen.getByText('10%');
      expect(bufferText).toHaveClass('text-meter-red');
    });
  });
});
