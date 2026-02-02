import { describe, it, expect } from 'vitest';
import { render } from '../../../test/utils';
import { VolumeMeter } from './VolumeMeter';

describe('VolumeMeter', () => {
  it('renders a meter role', () => {
    const { getByRole } = render(<VolumeMeter level={-20} peak={-10} />);
    expect(getByRole('meter')).toBeInTheDocument();
  });

  it('uses a transform-based mask for smooth gradient mode', () => {
    const { container, rerender } = render(<VolumeMeter level={-60} peak={-60} mode="gradient" orientation="vertical" />);

    const mask = container.querySelector('.dsp-meter-motion-transform') as HTMLElement | null;
    expect(mask).toBeInTheDocument();
    expect(mask?.style.transform).toBe('scaleY(1)');

    // -30 dB is mid-scale in the default -60..0 mapping.
    rerender(<VolumeMeter level={-30} peak={-30} mode="gradient" orientation="vertical" />);
    const maskAfter = container.querySelector('.dsp-meter-motion-transform') as HTMLElement | null;
    expect(maskAfter?.style.transform).toBe('scaleY(0.5)');

    const meterBody = maskAfter?.parentElement as HTMLElement | null;
    expect(meterBody?.style.getPropertyValue('--meter-motion-ms')).toMatch(/ms$/);
  });

  it('renders a peak indicator when peak is above level', () => {
    const { container } = render(<VolumeMeter level={-30} peak={-20} mode="gradient" orientation="vertical" />);
    const indicator = container.querySelector('.dsp-meter-motion-position') as HTMLElement | null;
    expect(indicator).toBeInTheDocument();
    expect(indicator?.style.bottom).toMatch(/%$/);
  });

  it('supports horizontal orientation in gradient mode', () => {
    const { container } = render(<VolumeMeter level={-30} peak={-30} mode="gradient" orientation="horizontal" />);
    const mask = container.querySelector('.dsp-meter-motion-transform') as HTMLElement | null;
    expect(mask).toBeInTheDocument();
    expect(mask?.style.transform).toBe('scaleX(0.5)');
  });

  it('applies motion classes to segmented mode', () => {
    const { container } = render(<VolumeMeter level={-20} mode="segmented" />);
    const segments = container.querySelectorAll('.dsp-meter-motion-opacity');
    expect(segments.length).toBeGreaterThan(0);
  });
});

