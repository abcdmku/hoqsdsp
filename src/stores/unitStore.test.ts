import { describe, it, expect, beforeEach } from 'vitest';
import { useUnitStore, selectUnits, selectUnitById, selectZones } from './unitStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('unitStore', () => {
  beforeEach(() => {
    // Clear localStorage and reset store
    localStorageMock.clear();
    useUnitStore.setState({
      units: [],
    });
  });

  describe('addUnit', () => {
    it('should add a new unit with generated id', () => {
      const { addUnit } = useUnitStore.getState();

      const id = addUnit({
        name: 'Living Room',
        address: '192.168.1.100',
        port: 1234,
      });

      expect(id).toBeDefined();
      expect(id).toMatch(/^unit_\d+_[a-z0-9]+$/);

      const unit = useUnitStore.getState().getUnit(id);
      expect(unit).toBeDefined();
      expect(unit?.name).toBe('Living Room');
      expect(unit?.address).toBe('192.168.1.100');
      expect(unit?.port).toBe(1234);
    });

    it('should add a unit with zone', () => {
      const { addUnit } = useUnitStore.getState();

      const id = addUnit({
        name: 'Bedroom',
        address: '192.168.1.101',
        port: 1234,
        zone: 'upstairs',
      });

      const unit = useUnitStore.getState().getUnit(id);
      expect(unit?.zone).toBe('upstairs');
    });

    it('should generate unique IDs', () => {
      const { addUnit } = useUnitStore.getState();

      const id1 = addUnit({
        name: 'Unit 1',
        address: '192.168.1.100',
        port: 1234,
      });

      const id2 = addUnit({
        name: 'Unit 2',
        address: '192.168.1.101',
        port: 1234,
      });

      expect(id1).not.toBe(id2);
    });
  });

  describe('removeUnit', () => {
    it('should remove a unit', () => {
      const { addUnit, removeUnit } = useUnitStore.getState();

      const id = addUnit({
        name: 'Living Room',
        address: '192.168.1.100',
        port: 1234,
      });

      removeUnit(id);

      const unit = useUnitStore.getState().getUnit(id);
      expect(unit).toBeUndefined();
    });

    it('should not affect other units', () => {
      const { addUnit, removeUnit } = useUnitStore.getState();

      const id1 = addUnit({
        name: 'Unit 1',
        address: '192.168.1.100',
        port: 1234,
      });

      const id2 = addUnit({
        name: 'Unit 2',
        address: '192.168.1.101',
        port: 1234,
      });

      removeUnit(id1);

      const unit1 = useUnitStore.getState().getUnit(id1);
      const unit2 = useUnitStore.getState().getUnit(id2);

      expect(unit1).toBeUndefined();
      expect(unit2).toBeDefined();
    });
  });

  describe('updateUnit', () => {
    it('should update a unit', () => {
      const { addUnit, updateUnit } = useUnitStore.getState();

      const id = addUnit({
        name: 'Living Room',
        address: '192.168.1.100',
        port: 1234,
      });

      updateUnit(id, {
        name: 'Updated Name',
        port: 5678,
      });

      const unit = useUnitStore.getState().getUnit(id);
      expect(unit?.name).toBe('Updated Name');
      expect(unit?.port).toBe(5678);
      expect(unit?.address).toBe('192.168.1.100'); // Unchanged
    });

    it('should not update other units', () => {
      const { addUnit, updateUnit } = useUnitStore.getState();

      const id1 = addUnit({
        name: 'Unit 1',
        address: '192.168.1.100',
        port: 1234,
      });

      const id2 = addUnit({
        name: 'Unit 2',
        address: '192.168.1.101',
        port: 1234,
      });

      updateUnit(id1, { name: 'Updated Unit 1' });

      const unit1 = useUnitStore.getState().getUnit(id1);
      const unit2 = useUnitStore.getState().getUnit(id2);

      expect(unit1?.name).toBe('Updated Unit 1');
      expect(unit2?.name).toBe('Unit 2');
    });

    it('should handle updating nonexistent unit gracefully', () => {
      const { updateUnit } = useUnitStore.getState();

      // Should not throw
      updateUnit('nonexistent', { name: 'Test' });

      const units = useUnitStore.getState().units;
      expect(units).toHaveLength(0);
    });
  });

  describe('getUnit', () => {
    it('should return a unit by id', () => {
      const { addUnit, getUnit } = useUnitStore.getState();

      const id = addUnit({
        name: 'Living Room',
        address: '192.168.1.100',
        port: 1234,
      });

      const unit = getUnit(id);
      expect(unit?.id).toBe(id);
      expect(unit?.name).toBe('Living Room');
    });

    it('should return undefined for nonexistent unit', () => {
      const { getUnit } = useUnitStore.getState();

      const unit = getUnit('nonexistent');
      expect(unit).toBeUndefined();
    });
  });

  describe('getUnitsByZone', () => {
    it('should return units in a zone', () => {
      const { addUnit, getUnitsByZone } = useUnitStore.getState();

      addUnit({
        name: 'Unit 1',
        address: '192.168.1.100',
        port: 1234,
        zone: 'upstairs',
      });

      addUnit({
        name: 'Unit 2',
        address: '192.168.1.101',
        port: 1234,
        zone: 'upstairs',
      });

      addUnit({
        name: 'Unit 3',
        address: '192.168.1.102',
        port: 1234,
        zone: 'downstairs',
      });

      const upstairsUnits = getUnitsByZone('upstairs');
      expect(upstairsUnits).toHaveLength(2);
      expect(upstairsUnits.every(u => u.zone === 'upstairs')).toBe(true);
    });

    it('should return empty array for zone with no units', () => {
      const { getUnitsByZone } = useUnitStore.getState();

      const units = getUnitsByZone('nonexistent');
      expect(units).toHaveLength(0);
    });
  });

  describe('persistence', () => {
    it('should maintain state after adding units', () => {
      const { addUnit } = useUnitStore.getState();

      // Add a unit
      const id = addUnit({
        name: 'Living Room',
        address: '192.168.1.100',
        port: 1234,
      });

      // Verify the unit is in the store
      const unit = useUnitStore.getState().getUnit(id);
      expect(unit).toBeDefined();
      expect(unit?.name).toBe('Living Room');

      // Verify it's in the units array
      const units = useUnitStore.getState().units;
      expect(units).toHaveLength(1);
      expect(units[0]?.id).toBe(id);
    });
  });

  describe('selectors', () => {
    it('selectUnits should return all units', () => {
      const { addUnit } = useUnitStore.getState();

      addUnit({
        name: 'Unit 1',
        address: '192.168.1.100',
        port: 1234,
      });

      addUnit({
        name: 'Unit 2',
        address: '192.168.1.101',
        port: 1234,
      });

      const state = useUnitStore.getState();
      const units = selectUnits(state);

      expect(units).toHaveLength(2);
    });

    it('selectUnitById should return the unit with matching id', () => {
      const { addUnit } = useUnitStore.getState();

      const id = addUnit({
        name: 'Living Room',
        address: '192.168.1.100',
        port: 1234,
      });

      const state = useUnitStore.getState();
      const selector = selectUnitById(id);
      const unit = selector(state);

      expect(unit?.id).toBe(id);
      expect(unit?.name).toBe('Living Room');
    });

    it('selectUnitById should return undefined for nonexistent id', () => {
      const state = useUnitStore.getState();
      const selector = selectUnitById('nonexistent');
      const unit = selector(state);

      expect(unit).toBeUndefined();
    });

    it('selectZones should return unique zones', () => {
      const { addUnit } = useUnitStore.getState();

      addUnit({
        name: 'Unit 1',
        address: '192.168.1.100',
        port: 1234,
        zone: 'upstairs',
      });

      addUnit({
        name: 'Unit 2',
        address: '192.168.1.101',
        port: 1234,
        zone: 'upstairs',
      });

      addUnit({
        name: 'Unit 3',
        address: '192.168.1.102',
        port: 1234,
        zone: 'downstairs',
      });

      addUnit({
        name: 'Unit 4',
        address: '192.168.1.103',
        port: 1234,
      });

      const state = useUnitStore.getState();
      const zones = selectZones(state);

      expect(zones).toHaveLength(2);
      expect(zones).toContain('upstairs');
      expect(zones).toContain('downstairs');
    });

    it('selectZones should return empty array when no units have zones', () => {
      const { addUnit } = useUnitStore.getState();

      addUnit({
        name: 'Unit 1',
        address: '192.168.1.100',
        port: 1234,
      });

      const state = useUnitStore.getState();
      const zones = selectZones(state);

      expect(zones).toHaveLength(0);
    });
  });
});
