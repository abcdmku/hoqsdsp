import { Button } from '../../ui';
import type { CorrectableFilterUi } from './useFirSelection';

interface FilterSelectionPanelProps {
  correctableUi: CorrectableFilterUi[];
  selectedFilterNames: Set<string>;
  onSelectedFilterNamesChange: (updater: (prev: Set<string>) => Set<string>) => void;
  onSelectAllFilters: () => void;
  onClearFilters: () => void;
}

export function FilterSelectionPanel({
  correctableUi,
  selectedFilterNames,
  onSelectedFilterNamesChange,
  onSelectAllFilters,
  onClearFilters,
}: FilterSelectionPanelProps) {
  return (
    <div className="rounded-md border border-dsp-primary/20 bg-dsp-bg/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-dsp-text">Filters to Linearize</p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onSelectAllFilters}>
            All
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
            None
          </Button>
        </div>
      </div>

      {correctableUi.length === 0 ? (
        <p className="text-xs text-dsp-text-muted">No upstream Biquad/DiffEq filters found.</p>
      ) : (
        <div className="space-y-1.5">
          {correctableUi.map((f) => (
            <label key={f.name} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedFilterNames.has(f.name)}
                onChange={(e) => {
                  onSelectedFilterNamesChange((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(f.name);
                    else next.delete(f.name);
                    return next;
                  });
                }}
              />
              <span className="min-w-0">
                <span className="block truncate text-dsp-text">{f.displayName}</span>
                {f.summary && <span className="block truncate text-xs text-dsp-text-muted">{f.summary}</span>}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
