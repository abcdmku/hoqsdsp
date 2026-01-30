import { ChevronDown, Check } from 'lucide-react';

interface UnitSummary {
  unitId: string;
}

interface SignalFlowHeaderProps {
  activeUnitName: string;
  connectedUnits: UnitSummary[];
  effectiveSelectedIds: string[];
  getUnitName: (id: string) => string;
  inputCount: number;
  outputCount: number;
  routeCount: number;
  setSelectedUnitIds: (unitIds: string[]) => void;
  toggleSelectedUnit: (unitId: string) => void;
  unitSelectorOpen: boolean;
  setUnitSelectorOpen: (open: boolean) => void;
  warningCount: number;
}

export function SignalFlowHeader({
  activeUnitName,
  connectedUnits,
  effectiveSelectedIds,
  getUnitName,
  inputCount,
  outputCount,
  routeCount,
  setSelectedUnitIds,
  toggleSelectedUnit,
  unitSelectorOpen,
  setUnitSelectorOpen,
  warningCount,
}: SignalFlowHeaderProps) {
  const hasMultipleSelections = effectiveSelectedIds.length > 1;
  const allSelected = effectiveSelectedIds.length === connectedUnits.length;

  return (
    <div className="border-b border-dsp-primary/30 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-dsp-text">Signal Flow</h1>
            <p className="text-sm text-dsp-text-muted">
              {inputCount} input{inputCount === 1 ? '' : 's'} | {outputCount} output{outputCount === 1 ? '' : 's'} | {routeCount} route{routeCount === 1 ? '' : 's'}
            </p>
          </div>

          {connectedUnits.length > 0 && (
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-md border border-dsp-primary/30 bg-dsp-surface px-3 py-1.5 text-sm text-dsp-text hover:border-dsp-primary/50"
                onClick={() => { setUnitSelectorOpen(!unitSelectorOpen); }}
              >
                <span className="max-w-32 truncate">{activeUnitName}</span>
                {hasMultipleSelections && (
                  <span className="rounded bg-dsp-accent/20 px-1.5 text-xs text-dsp-accent">
                    +{effectiveSelectedIds.length - 1}
                  </span>
                )}
                <ChevronDown className="h-4 w-4" />
              </button>

              {unitSelectorOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => { setUnitSelectorOpen(false); }}
                  />
                  <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-dsp-primary/30 bg-dsp-surface py-1 shadow-lg">
                    <div className="border-b border-dsp-primary/20 px-3 py-2 text-xs font-medium uppercase tracking-wide text-dsp-text-muted">
                      Select Units
                    </div>
                    {connectedUnits.map((unit) => {
                      const isSelected = effectiveSelectedIds.includes(unit.unitId);
                      return (
                        <button
                          key={unit.unitId}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-dsp-text hover:bg-dsp-primary/10"
                          onClick={() => {
                            toggleSelectedUnit(unit.unitId);
                          }}
                        >
                          <div className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected ? 'border-dsp-accent bg-dsp-accent' : 'border-dsp-primary/40'}`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className="truncate">{getUnitName(unit.unitId)}</span>
                        </button>
                      );
                    })}
                    {connectedUnits.length > 1 && (
                      <div className="border-t border-dsp-primary/20 px-3 py-2">
                        <button
                          type="button"
                          className="text-xs text-dsp-accent hover:underline"
                          onClick={() => {
                            if (allSelected) {
                              setSelectedUnitIds([]);
                            } else {
                              setSelectedUnitIds(connectedUnits.map((u) => u.unitId));
                            }
                          }}
                        >
                          {allSelected ? 'Clear selection' : 'Select all'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {warningCount > 0 && (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
            {warningCount} warning{warningCount === 1 ? '' : 's'}
          </div>
        )}
      </div>
    </div>
  );
}
