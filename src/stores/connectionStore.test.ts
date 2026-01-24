import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore, selectActiveConnection, selectAllConnections, selectConnectionStatus } from './connectionStore';
import type { ConnectionStatus } from '../types';

describe('connectionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useConnectionStore.setState({
      connections: new Map(),
      activeUnitId: null,
    });
  });

  describe('setConnection', () => {
    it('should add a new connection', () => {
      const { setConnection } = useConnectionStore.getState();

      setConnection('unit1', {
        unitId: 'unit1',
        status: 'connected',
        version: '1.0.0',
      });

      const connection = useConnectionStore.getState().getConnection('unit1');
      expect(connection).toBeDefined();
      expect(connection?.unitId).toBe('unit1');
      expect(connection?.status).toBe('connected');
      expect(connection?.version).toBe('1.0.0');
    });

    it('should update an existing connection', () => {
      const { setConnection } = useConnectionStore.getState();

      setConnection('unit1', {
        unitId: 'unit1',
        status: 'connected',
        version: '1.0.0',
      });

      setConnection('unit1', {
        version: '2.0.0',
      });

      const connection = useConnectionStore.getState().getConnection('unit1');
      expect(connection?.version).toBe('2.0.0');
      expect(connection?.status).toBe('connected');
    });

    it('should default status to disconnected for new connections', () => {
      const { setConnection } = useConnectionStore.getState();

      setConnection('unit1', {
        unitId: 'unit1',
      });

      const connection = useConnectionStore.getState().getConnection('unit1');
      expect(connection?.status).toBe('disconnected');
    });
  });

  describe('removeConnection', () => {
    it('should remove a connection', () => {
      const { setConnection, removeConnection } = useConnectionStore.getState();

      setConnection('unit1', {
        unitId: 'unit1',
        status: 'connected',
      });

      removeConnection('unit1');

      const connection = useConnectionStore.getState().getConnection('unit1');
      expect(connection).toBeUndefined();
    });

    it('should clear activeUnitId when removing the active unit', () => {
      const { setConnection, removeConnection, setActiveUnit } = useConnectionStore.getState();

      setConnection('unit1', {
        unitId: 'unit1',
        status: 'connected',
      });

      setActiveUnit('unit1');
      expect(useConnectionStore.getState().activeUnitId).toBe('unit1');

      removeConnection('unit1');
      expect(useConnectionStore.getState().activeUnitId).toBeNull();
    });

    it('should not clear activeUnitId when removing a different unit', () => {
      const { setConnection, removeConnection, setActiveUnit } = useConnectionStore.getState();

      setConnection('unit1', {
        unitId: 'unit1',
        status: 'connected',
      });
      setConnection('unit2', {
        unitId: 'unit2',
        status: 'connected',
      });

      setActiveUnit('unit1');
      removeConnection('unit2');

      expect(useConnectionStore.getState().activeUnitId).toBe('unit1');
    });
  });

  describe('setActiveUnit', () => {
    it('should set the active unit', () => {
      const { setActiveUnit } = useConnectionStore.getState();

      setActiveUnit('unit1');

      expect(useConnectionStore.getState().activeUnitId).toBe('unit1');
    });

    it('should allow setting to null', () => {
      const { setActiveUnit } = useConnectionStore.getState();

      setActiveUnit('unit1');
      setActiveUnit(null);

      expect(useConnectionStore.getState().activeUnitId).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update the status of a connection', () => {
      const { setConnection, updateStatus } = useConnectionStore.getState();

      setConnection('unit1', {
        unitId: 'unit1',
        status: 'disconnected',
      });

      updateStatus('unit1', 'connected');

      const connection = useConnectionStore.getState().getConnection('unit1');
      expect(connection?.status).toBe('connected');
    });

    it('should set lastSeen when status becomes connected', () => {
      const { setConnection, updateStatus } = useConnectionStore.getState();

      setConnection('unit1', {
        unitId: 'unit1',
        status: 'disconnected',
      });

      const beforeTime = Date.now();
      updateStatus('unit1', 'connected');
      const afterTime = Date.now();

      const connection = useConnectionStore.getState().getConnection('unit1');
      expect(connection?.lastSeen).toBeGreaterThanOrEqual(beforeTime);
      expect(connection?.lastSeen).toBeLessThanOrEqual(afterTime);
    });

    it('should preserve lastSeen when disconnecting', () => {
      const { setConnection, updateStatus } = useConnectionStore.getState();

      setConnection('unit1', {
        unitId: 'unit1',
        status: 'disconnected',
      });

      updateStatus('unit1', 'connected');
      const connection = useConnectionStore.getState().getConnection('unit1');
      const lastSeen = connection?.lastSeen;

      updateStatus('unit1', 'disconnected');
      const updatedConnection = useConnectionStore.getState().getConnection('unit1');
      expect(updatedConnection?.lastSeen).toBe(lastSeen);
    });

    it('should set error message', () => {
      const { setConnection, updateStatus } = useConnectionStore.getState();

      setConnection('unit1', {
        unitId: 'unit1',
        status: 'disconnected',
      });

      updateStatus('unit1', 'error', 'Connection failed');

      const connection = useConnectionStore.getState().getConnection('unit1');
      expect(connection?.status).toBe('error');
      expect(connection?.error).toBe('Connection failed');
    });

    it('should not update if connection does not exist', () => {
      const { updateStatus } = useConnectionStore.getState();

      updateStatus('nonexistent', 'connected');

      const connection = useConnectionStore.getState().getConnection('nonexistent');
      expect(connection).toBeUndefined();
    });
  });

  describe('selectors', () => {
    it('selectActiveConnection should return undefined when no active unit', () => {
      const state = useConnectionStore.getState();
      const activeConnection = selectActiveConnection(state);

      expect(activeConnection).toBeUndefined();
    });

    it('selectActiveConnection should return the active connection', () => {
      const { setConnection, setActiveUnit } = useConnectionStore.getState();

      setConnection('unit1', {
        unitId: 'unit1',
        status: 'connected',
      });

      setActiveUnit('unit1');

      const state = useConnectionStore.getState();
      const activeConnection = selectActiveConnection(state);

      expect(activeConnection?.unitId).toBe('unit1');
    });

    it('selectAllConnections should return all connections as array', () => {
      const { setConnection } = useConnectionStore.getState();

      setConnection('unit1', {
        unitId: 'unit1',
        status: 'connected',
      });
      setConnection('unit2', {
        unitId: 'unit2',
        status: 'disconnected',
      });

      const state = useConnectionStore.getState();
      const connections = selectAllConnections(state);

      expect(connections).toHaveLength(2);
      expect(connections.map(c => c.unitId)).toContain('unit1');
      expect(connections.map(c => c.unitId)).toContain('unit2');
    });

    it('selectConnectionStatus should return the status for a unit', () => {
      const { setConnection } = useConnectionStore.getState();

      setConnection('unit1', {
        unitId: 'unit1',
        status: 'connected' as ConnectionStatus,
      });

      const state = useConnectionStore.getState();
      const selector = selectConnectionStatus('unit1');
      const status = selector(state);

      expect(status).toBe('connected');
    });

    it('selectConnectionStatus should return disconnected for nonexistent unit', () => {
      const state = useConnectionStore.getState();
      const selector = selectConnectionStatus('nonexistent');
      const status = selector(state);

      expect(status).toBe('disconnected');
    });
  });
});
