import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  Skeleton,
  SkeletonText,
  SkeletonButton,
  SkeletonCard,
  SkeletonMeter,
  SkeletonUnitCard,
  SkeletonProcessingBlock,
  SkeletonChannelStrip,
  SkeletonEQEditor,
  SkeletonRoutingMatrix,
} from './Skeleton';

describe('Skeleton Components', () => {
  describe('Skeleton', () => {
    it('renders with base animation class', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('applies custom className', () => {
      const { container } = render(<Skeleton className="custom-class" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('custom-class');
    });

    it('is hidden from screen readers', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('SkeletonText', () => {
    it('renders with text-like dimensions', () => {
      const { container } = render(<SkeletonText />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('h-4', 'w-full');
    });
  });

  describe('SkeletonButton', () => {
    it('renders with button-like dimensions', () => {
      const { container } = render(<SkeletonButton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('h-9', 'w-24');
    });
  });

  describe('SkeletonCard', () => {
    it('renders with card layout', () => {
      const { container } = render(<SkeletonCard />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('p-4', 'bg-dsp-surface');
    });

    it('renders multiple skeleton lines', () => {
      const { container } = render(<SkeletonCard />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(1);
    });
  });

  describe('SkeletonMeter', () => {
    it('renders with meter-like dimensions', () => {
      const { container } = render(<SkeletonMeter />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('h-32', 'w-4');
    });
  });

  describe('SkeletonUnitCard', () => {
    it('renders with unit card layout', () => {
      const { container } = render(<SkeletonUnitCard />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('bg-dsp-surface', 'rounded-lg');
    });
  });

  describe('SkeletonProcessingBlock', () => {
    it('renders with processing block layout', () => {
      const { container } = render(<SkeletonProcessingBlock />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('p-3', 'bg-dsp-surface');
    });
  });

  describe('SkeletonChannelStrip', () => {
    it('renders multiple processing blocks', () => {
      const { container } = render(<SkeletonChannelStrip />);
      // Should have the strip label skeleton + 4 processing block skeletons
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(4);
    });
  });

  describe('SkeletonEQEditor', () => {
    it('renders with EQ editor layout', () => {
      const { container } = render(<SkeletonEQEditor />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('p-4');
    });

    it('renders graph and parameter skeletons', () => {
      const { container } = render(<SkeletonEQEditor />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(3);
    });
  });

  describe('SkeletonRoutingMatrix', () => {
    it('renders with matrix layout', () => {
      const { container } = render(<SkeletonRoutingMatrix />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('p-4');
    });

    it('renders grid of skeletons', () => {
      const { container } = render(<SkeletonRoutingMatrix />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(10);
    });
  });
});
