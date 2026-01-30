import { useMemo } from 'react';
import type { DSPUnit } from '../../types';

export function useZoneGroups(units: DSPUnit[]) {
  return useMemo(() => {
    const grouped: Record<string, DSPUnit[]> = {};
    const ungrouped: DSPUnit[] = [];

    for (const unit of units) {
      if (unit.zone) {
        (grouped[unit.zone] ??= []).push(unit);
      } else {
        ungrouped.push(unit);
      }
    }

    return { zoneGroups: grouped, ungroupedUnits: ungrouped };
  }, [units]);
}
