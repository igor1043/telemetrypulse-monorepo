import {
  AlertEvent,
  VehicleStatus,
} from '@telemetrypulse-monorepo/shared-contracts';
import { describe, expect, it } from 'vitest';
import {
  INITIAL_FLEET_STATE,
  MAX_RECENT_ALERTS,
  reduceFleetState,
} from './fleet-state.reducer';

describe('reduceFleetState', () => {
  it('sorts snapshot vehicles by id and alerts by newest occurrence', () => {
    const olderAlert = alert({ id: 1, occurredAt: '2026-05-25T10:00:00Z' });
    const newerAlert = alert({ id: 2, occurredAt: '2026-05-25T10:05:00Z' });

    const state = reduceFleetState(INITIAL_FLEET_STATE, {
      kind: 'snapshot',
      alerts: [olderAlert, newerAlert],
      vehicles: [
        vehicle({ vehicleId: 'EVT-010' }),
        vehicle({ vehicleId: 'EVT-002' }),
      ],
    });

    expect(state.vehicles.map((item) => item.vehicleId)).toEqual([
      'EVT-002',
      'EVT-010',
    ]);
    expect(state.alerts.map((item) => item.id)).toEqual([2, 1]);
  });

  it('upserts telemetry without duplicating vehicles', () => {
    const currentVehicle = vehicle({ vehicleId: 'EVT-001', batteryLevel: 60 });
    const updatedVehicle = vehicle({ vehicleId: 'EVT-001', batteryLevel: 55 });

    const state = reduceFleetState(
      { vehicles: [currentVehicle], alerts: [] },
      { kind: 'telemetry', vehicle: updatedVehicle },
    );

    expect(state.vehicles).toHaveLength(1);
    expect(state.vehicles[0]).toMatchObject({
      vehicleId: 'EVT-001',
      batteryLevel: 55,
    });
  });

  it('adds alert events, deduplicates by id, updates vehicle and keeps only the latest 50 alerts', () => {
    const existingAlerts = Array.from(
      { length: MAX_RECENT_ALERTS },
      (_, index) =>
        alert({
          id: index + 1,
          occurredAt: new Date(Date.UTC(2026, 4, 25, 10, index)).toISOString(),
        }),
    );
    const selectedVehicle = vehicle({ vehicleId: 'EVT-005', speedKmh: 132 });
    const newestAlert = alert({
      id: 10,
      vehicleId: 'EVT-005',
      occurredAt: '2026-05-25T12:00:00Z',
    });

    const state = reduceFleetState(
      {
        alerts: existingAlerts,
        vehicles: [vehicle({ vehicleId: 'EVT-005', speedKmh: 50 })],
      },
      {
        kind: 'alert',
        alert: newestAlert,
        vehicle: selectedVehicle,
      },
    );

    expect(state.alerts).toHaveLength(MAX_RECENT_ALERTS);
    expect(state.alerts[0]).toMatchObject({
      id: 10,
      vehicleId: 'EVT-005',
    });
    expect(state.alerts.filter((item) => item.id === 10)).toHaveLength(1);
    expect(state.vehicles[0]).toMatchObject({
      vehicleId: 'EVT-005',
      speedKmh: 132,
    });
  });
});

function vehicle(overrides: Partial<VehicleStatus> = {}): VehicleStatus {
  return {
    vehicleId: 'EVT-001',
    model: 'Ford E-Transit',
    imageUrl: '/vehicles/sedan-silver.png',
    status: 'MOVING',
    batteryLevel: 80,
    speedKmh: 48,
    motorTemperatureCelsius: 62,
    latitude: -23.5505,
    longitude: -46.6333,
    lastUpdatedAt: '2026-05-25T12:00:00Z',
    ...overrides,
  };
}

function alert(overrides: Partial<AlertEvent> = {}): AlertEvent {
  return {
    id: 1,
    vehicleId: 'EVT-001',
    type: 'SPEEDING',
    severity: 'WARNING',
    message: 'Excesso de Velocidade',
    value: 130,
    threshold: 120,
    occurredAt: '2026-05-25T12:00:00Z',
    ...overrides,
  };
}
