import { useCallback, useRef, useState, useEffect, memo } from 'react';
import {
  type EQNodeProps,
  freqToX,
  gainToY,
  xToFreq,
  yToGain,
  getBandColor,
  getBandFrequency,
  getBandGain,
  hasGain,
  MIN_FREQUENCY,
  MAX_FREQUENCY,
  MIN_GAIN,
  MAX_GAIN,
} from './types';

export const EQNode = memo(function EQNode({
  band,
  index,
  isSelected,
  isExternalDragging = false,
  dimensions,
  onSelect,
  onDrag,
  onDragEnd,
  onQChange,
  disabled = false,
}: EQNodeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; freq: number; gain: number } | null>(null);
  const nodeRef = useRef<SVGGElement>(null);

  const freq = getBandFrequency(band.parameters);
  const gain = hasGain(band.parameters.type) ? getBandGain(band.parameters) : 0;
  const color = getBandColor(index);

  const x = freqToX(freq, dimensions);
  const y = gainToY(gain, dimensions);

  // Handle mouse down to start dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();

    onSelect();
    setIsDragging(true);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      freq,
      gain,
    };
  }, [disabled, onSelect, freq, gain]);

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging || disabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !nodeRef.current) return;

      const svg = nodeRef.current.ownerSVGElement;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const svgX = e.clientX - rect.left;
      const svgY = e.clientY - rect.top;

      // Convert to frequency and gain
      let newFreq = xToFreq(svgX, dimensions);
      let newGain = yToGain(svgY, dimensions);

      // Clamp values
      newFreq = Math.max(MIN_FREQUENCY, Math.min(MAX_FREQUENCY, newFreq));
      newGain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, newGain));

      // If this filter doesn't have gain, keep it at 0
      if (!hasGain(band.parameters.type)) {
        newGain = 0;
      }

      onDrag(newFreq, newGain);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      onDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, disabled, dimensions, band.parameters.type, onDrag, onDragEnd]);

  // Handle wheel for Q adjustment
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    // Select if not already selected
    if (!isSelected) {
      onSelect();
    }

    // Calculate Q delta based on scroll direction
    // Negative deltaY (scroll up) = increase Q, positive (scroll down) = decrease Q
    const delta = -e.deltaY * 0.002;
    onQChange(delta);
  }, [disabled, isSelected, onSelect, onQChange]);

  // Node radius based on state
  const baseRadius = isSelected ? 12 : 10;
  const showHover = !disabled && !isSelected && isHovered;
  const radius = baseRadius + (showHover ? 2 : 0);
  const hitRadius = baseRadius + 20;
  const strokeWidth = isSelected ? 3 : (showHover ? 3 : 2);
  const isActivelyDragging = isDragging || isExternalDragging;

  // Show filter type indicator
  const getFilterTypeSymbol = () => {
    const type = band.parameters.type;
    switch (type) {
      case 'Lowpass':
      case 'LowpassFO':
      case 'ButterworthLowpass':
      case 'LinkwitzRileyLowpass':
        return '↘';
      case 'Highpass':
      case 'HighpassFO':
      case 'ButterworthHighpass':
      case 'LinkwitzRileyHighpass':
        return '↗';
      case 'Lowshelf':
      case 'LowshelfFO':
        return '⌊';
      case 'Highshelf':
      case 'HighshelfFO':
        return '⌈';
      case 'Notch':
        return 'N';
      case 'Bandpass':
        return 'B';
      case 'Allpass':
      case 'AllpassFO':
        return 'φ';
      default:
        return '';
    }
  };

  const symbol = getFilterTypeSymbol();

  return (
    <g
      ref={nodeRef}
      className={`eq-node ${disabled ? 'cursor-default' : 'cursor-grab'} ${isActivelyDragging ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onMouseEnter={() => {
        if (disabled) return;
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      style={{ opacity: band.enabled ? 1 : 0.4 }}
    >
      {/* Invisible hit target (larger than the visible node) */}
      <circle
        cx={x}
        cy={y}
        r={hitRadius}
        fill="transparent"
        pointerEvents="all"
      />

      {/* Hover ring */}
      {showHover && (
        <circle
          cx={x}
          cy={y}
          r={radius + 4}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity="0.35"
        />
      )}

      {/* Outer glow when selected */}
      {isSelected && (
        <circle
          cx={x}
          cy={y}
          r={radius + 4}
          fill="none"
          stroke={color}
          strokeWidth="1"
          opacity="0.3"
          className="animate-pulse"
        />
      )}

      {/* Main node circle */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={band.enabled ? color : '#4b5563'}
        stroke={isSelected || showHover ? '#ffffff' : color}
        strokeWidth={strokeWidth}
        className={isActivelyDragging ? '' : 'transition-all duration-100'}
      />

      {/* Filter type symbol */}
      {symbol && (
        <text
          x={x}
          y={y + 3}
          textAnchor="middle"
          className="fill-white text-xs font-bold pointer-events-none"
          style={{ fontSize: '8px' }}
        >
          {symbol}
        </text>
      )}

      {/* Band number */}
      <text
        x={x}
        y={y - radius - 6}
        textAnchor="middle"
        className="fill-dsp-text text-xs font-medium pointer-events-none"
        style={{ fontSize: '10px' }}
      >
        {index + 1}
      </text>

      {/* Frequency/Gain tooltip when selected or dragging */}
      {(isSelected || isActivelyDragging) && (
        <g>
          {(() => {
            const showGain = hasGain(band.parameters.type);
            const hzText = freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : freq.toFixed(0);
            const gainText = `${gain > 0 ? '+' : ''}${gain.toFixed(1)} dB`;
            const lines = showGain ? [`${hzText} Hz`, gainText] : [`${hzText} Hz`];
            const approxCharWidth = 6;
            const contentWidth = Math.max(...lines.map((line) => line.length)) * approxCharWidth;
            const boxWidth = Math.max(64, Math.min(118, contentWidth + 16));
            const boxHeight = showGain ? 36 : 22;
            const preferLeft = x - 16 - boxWidth >= dimensions.marginLeft + 4;
            const boxX = preferLeft ? x - 16 - boxWidth : x + 16;
            const boxY = y - (showGain ? 24 : 16);
            const textX = boxX + 8;
            const hzY = y - (showGain ? 8 : 2);
            const gainY = y + 4;

            return (
              <>
                <rect
                  x={boxX}
                  y={boxY}
                  width={boxWidth}
                  height={boxHeight}
                  rx={4}
                  className="fill-dsp-surface stroke-dsp-primary"
                  strokeWidth="1"
                />
                <text
                  x={textX}
                  y={hzY}
                  className="fill-dsp-text text-xs"
                  style={{ fontSize: '10px' }}
                >
                  {hzText} Hz
                </text>
                {showGain && (
                  <text
                    x={textX}
                    y={gainY}
                    className="fill-dsp-text-muted text-xs"
                    style={{ fontSize: '10px' }}
                  >
                    {gainText}
                  </text>
                )}
              </>
            );
          })()}
        </g>
      )}
    </g>
  );
});
