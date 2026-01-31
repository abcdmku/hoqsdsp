import { useCallback, useRef } from 'react';

interface UseAddBandDragParams<TBand> {
  readOnly: boolean;
  bands: TBand[];
  onChange: (bands: TBand[]) => void;
  onSelectBand: (index: number | null) => void;
  createBand: (freq: number, gain: number) => TBand;
  updateBand: (index: number, freq: number, gain: number) => void;
}

export function useAddBandDrag<TBand>({
  readOnly,
  bands,
  onChange,
  onSelectBand,
  createBand,
  updateBand,
}: UseAddBandDragParams<TBand>) {
  const addDragIndexRef = useRef<number | null>(null);

  const handleAddBandStart = useCallback(
    (freq: number, gain: number) => {
      if (readOnly) return;
      const newBand = createBand(Math.round(freq), Math.round(gain * 10) / 10);
      const nextBands = [...bands, newBand];
      onChange(nextBands);
      const nextIndex = nextBands.length - 1;
      onSelectBand(nextIndex);
      addDragIndexRef.current = nextIndex;
    },
    [bands, createBand, onChange, onSelectBand, readOnly],
  );

  const handleAddBandMove = useCallback(
    (freq: number, gain: number) => {
      if (readOnly) return;
      const index = addDragIndexRef.current;
      if (index === null) return;
      updateBand(index, Math.round(freq), Math.round(gain * 10) / 10);
    },
    [readOnly, updateBand],
  );

  const handleAddBandEnd = useCallback(() => {
    addDragIndexRef.current = null;
  }, []);

  return { handleAddBandStart, handleAddBandMove, handleAddBandEnd };
}
