import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import {
  ProcessingMetrics,
  ProcessingMetricsCard,
  StatusBarMetrics,
} from './ProcessingMetrics';

describe('ProcessingMetrics', () => {
  const defaultProps = {
    processingLoad: 45.5,
    bufferLevel: 60,
    captureSampleRate: 48000,
  };

  describe('rendering', () => {
    it('renders with required props', () => {
      render(<ProcessingMetrics {...defaultProps} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('displays CPU load percentage', () => {
      render(<ProcessingMetrics {...defaultProps} />);
      expect(screen.getByText('45.5%')).toBeInTheDocument();
    });

    it('displays buffer level percentage', () => {
      render(<ProcessingMetrics {...defaultProps} />);
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('displays sample rate in kHz', () => {
      render(<ProcessingMetrics {...defaultProps} />);
      expect(screen.getByText('48.0 kHz')).toBeInTheDocument();
    });

    it('displays placeholder when sample rate is 0', () => {
      render(<ProcessingMetrics {...defaultProps} captureSampleRate={0} />);
      expect(screen.getByText('-- kHz')).toBeInTheDocument();
    });
  });

  describe('rate adjust', () => {
    it('does not show rate adjust by default', () => {
      render(<ProcessingMetrics {...defaultProps} rateAdjust={1.0002} />);
      expect(screen.queryByText('1.0002x')).not.toBeInTheDocument();
    });

    it('shows rate adjust when showRateAdjust is true', () => {
      render(
        <ProcessingMetrics
          {...defaultProps}
          rateAdjust={1.0002}
          showRateAdjust
        />
      );
      expect(screen.getByText('1.0002x')).toBeInTheDocument();
    });
  });

  describe('color coding - CPU load', () => {
    it('uses green color for normal CPU load (below 50%)', () => {
      const { container } = render(
        <ProcessingMetrics {...defaultProps} processingLoad={30} />
      );
      expect(container.querySelector('.text-meter-green')).toBeInTheDocument();
    });

    it('uses yellow color for warning CPU load (50-80%)', () => {
      const { container } = render(
        <ProcessingMetrics {...defaultProps} processingLoad={65} />
      );
      expect(container.querySelector('.text-meter-yellow')).toBeInTheDocument();
    });

    it('uses red color for critical CPU load (above 80%)', () => {
      const { container } = render(
        <ProcessingMetrics {...defaultProps} processingLoad={90} />
      );
      expect(container.querySelector('.text-meter-red')).toBeInTheDocument();
    });
  });

  describe('color coding - buffer level', () => {
    it('uses green color for healthy buffer level (30-80%)', () => {
      const { container } = render(
        <ProcessingMetrics {...defaultProps} bufferLevel={50} />
      );
      // Check that there's a green indicator (could be either CPU or buffer)
      const greenElements = container.querySelectorAll('.text-meter-green');
      expect(greenElements.length).toBeGreaterThan(0);
    });

    it('uses yellow color for low buffer warning (20-30%)', () => {
      const { container } = render(
        <ProcessingMetrics {...defaultProps} processingLoad={30} bufferLevel={25} />
      );
      // Should have yellow for buffer
      expect(container.querySelector('.text-meter-yellow')).toBeInTheDocument();
    });

    it('uses yellow color for high buffer warning (80-90%)', () => {
      const { container } = render(
        <ProcessingMetrics {...defaultProps} processingLoad={30} bufferLevel={85} />
      );
      expect(container.querySelector('.text-meter-yellow')).toBeInTheDocument();
    });

    it('uses red color for critically low buffer (<20%)', () => {
      const { container } = render(
        <ProcessingMetrics {...defaultProps} processingLoad={30} bufferLevel={15} />
      );
      expect(container.querySelector('.text-meter-red')).toBeInTheDocument();
    });

    it('uses red color for critically high buffer (>90%)', () => {
      const { container } = render(
        <ProcessingMetrics {...defaultProps} processingLoad={30} bufferLevel={95} />
      );
      expect(container.querySelector('.text-meter-red')).toBeInTheDocument();
    });
  });

  describe('layouts', () => {
    it('renders horizontal layout by default', () => {
      const { container } = render(<ProcessingMetrics {...defaultProps} />);
      // Default flex direction is row, so just check it's a flex container with gap
      expect(container.firstChild).toHaveClass('flex');
      expect(container.firstChild).toHaveClass('items-center');
      expect(container.firstChild).toHaveClass('gap-6');
    });

    it('renders vertical layout', () => {
      const { container } = render(
        <ProcessingMetrics {...defaultProps} layout="vertical" />
      );
      expect(container.firstChild).toHaveClass('flex-col');
    });

    it('renders compact layout', () => {
      render(<ProcessingMetrics {...defaultProps} layout="compact" />);
      // Compact layout still shows values
      expect(screen.getByText('45.5%')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has status role', () => {
      render(<ProcessingMetrics {...defaultProps} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-label', () => {
      render(<ProcessingMetrics {...defaultProps} />);
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Processing metrics'
      );
    });
  });
});

describe('ProcessingMetricsCard', () => {
  const defaultProps = {
    processingLoad: 45.5,
    bufferLevel: 60,
    captureSampleRate: 48000,
  };

  it('renders with default title', () => {
    render(<ProcessingMetricsCard {...defaultProps} />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<ProcessingMetricsCard {...defaultProps} title="DSP Status" />);
    expect(screen.getByText('DSP Status')).toBeInTheDocument();
  });

  it('uses vertical layout', () => {
    const { container } = render(<ProcessingMetricsCard {...defaultProps} />);
    // Card should contain vertical ProcessingMetrics
    const statusElement = container.querySelector('[role="status"]');
    expect(statusElement).toHaveClass('flex-col');
  });

  it('displays all metrics', () => {
    render(<ProcessingMetricsCard {...defaultProps} />);
    expect(screen.getByText('45.5%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('48.0 kHz')).toBeInTheDocument();
  });
});

describe('StatusBarMetrics', () => {
  const defaultProps = {
    processingLoad: 45.5,
    bufferLevel: 60,
    captureSampleRate: 48000,
  };

  it('renders with required props', () => {
    render(<StatusBarMetrics {...defaultProps} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays CPU load with label', () => {
    render(<StatusBarMetrics {...defaultProps} />);
    expect(screen.getByText(/CPU:/)).toBeInTheDocument();
    expect(screen.getByText(/45.5%/)).toBeInTheDocument();
  });

  it('displays buffer level with label', () => {
    render(<StatusBarMetrics {...defaultProps} />);
    expect(screen.getByText(/Buffer:/)).toBeInTheDocument();
    expect(screen.getByText(/60%/)).toBeInTheDocument();
  });

  it('displays sample rate', () => {
    render(<StatusBarMetrics {...defaultProps} />);
    expect(screen.getByText('48.0 kHz')).toBeInTheDocument();
  });

  it('displays placeholder when sample rate is 0', () => {
    render(<StatusBarMetrics {...defaultProps} captureSampleRate={0} />);
    expect(screen.getByText('-- kHz')).toBeInTheDocument();
  });

  describe('color coding', () => {
    it('applies correct color to CPU icon for normal load', () => {
      const { container } = render(
        <StatusBarMetrics {...defaultProps} processingLoad={30} />
      );
      const cpuIcon = container.querySelector('svg.text-meter-green');
      expect(cpuIcon).toBeInTheDocument();
    });

    it('applies correct color to CPU icon for warning load', () => {
      const { container } = render(
        <StatusBarMetrics {...defaultProps} processingLoad={65} />
      );
      const yellowIcon = container.querySelector('svg.text-meter-yellow');
      expect(yellowIcon).toBeInTheDocument();
    });

    it('applies correct color to CPU icon for critical load', () => {
      const { container } = render(
        <StatusBarMetrics {...defaultProps} processingLoad={90} />
      );
      const redIcon = container.querySelector('svg.text-meter-red');
      expect(redIcon).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has status role', () => {
      render(<StatusBarMetrics {...defaultProps} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-label', () => {
      render(<StatusBarMetrics {...defaultProps} />);
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Processing status'
      );
    });
  });
});
