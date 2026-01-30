import { useEffect, useRef, useState } from 'react';
import { ColorPicker } from '../../ui/ColorPicker';
import { InlineLevelMeter } from '../../ui/InlineLevelMeter';

interface ChannelCardHeaderProps {
  label: string;
  channelColor?: string;
  level?: number;
  peakHold?: number;
  onColorChange?: (color: string) => void;
  onLabelChange?: (label: string) => void;
}

export function ChannelCardHeader({
  label,
  channelColor,
  level,
  peakHold,
  onColorChange,
  onLabelChange,
}: ChannelCardHeaderProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editingLabel, setEditingLabel] = useState(label);
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [isEditingLabel]);

  useEffect(() => {
    if (!isEditingLabel) {
      setEditingLabel(label);
    }
  }, [isEditingLabel, label]);

  const handleLabelSave = () => {
    const trimmed = editingLabel.trim();
    if (trimmed && trimmed !== label) {
      onLabelChange?.(trimmed);
    } else {
      setEditingLabel(label);
    }
    setIsEditingLabel(false);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <ColorPicker
          value={channelColor ?? '#22d3ee'}
          onChange={(color) => {
            onColorChange?.(color);
          }}
        />

        {isEditingLabel ? (
          <input
            ref={labelInputRef}
            type="text"
            value={editingLabel}
            onChange={(e) => { setEditingLabel(e.target.value); }}
            onBlur={handleLabelSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLabelSave();
              } else if (e.key === 'Escape') {
                setEditingLabel(label);
                setIsEditingLabel(false);
              }
            }}
            onClick={(e) => { e.stopPropagation(); }}
            className="min-w-0 flex-1 truncate border-b border-dsp-accent bg-transparent text-left font-medium text-dsp-text outline-none"
          />
        ) : (
          <button
            type="button"
            className="min-w-0 truncate text-left font-medium text-dsp-text transition-colors hover:text-dsp-accent"
            onClick={(e) => {
              e.stopPropagation();
              setEditingLabel(label);
              setIsEditingLabel(true);
            }}
            title="Click to edit name"
          >
            {label}
          </button>
        )}
      </div>

      <InlineLevelMeter
        level={level ?? -100}
        peakHold={peakHold}
        minDb={-100}
        maxDb={12}
        showValue
        showScale
        scalePosition="top"
        valuePosition="right"
        smoothingMs={100}
        className="mx-1 mb-2 flex-1"
        meterClassName="min-w-12"
      />
    </div>
  );
}
