import { TestBed } from '@angular/core/testing';
import {
  AlertEvent,
  TelemetryReading,
  VehicleStatus,
} from '@telemetrypulse-monorepo/shared-contracts';
import { BehaviorSubject, firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { FleetTelemetryService } from './services/fleet-telemetry.service';

describe('App view model', () => {
  let state$: BehaviorSubject<{
    vehicles: VehicleStatus[];
    alerts: AlertEvent[];
  }>;
  let connectionState$: BehaviorSubject<
    'connected' | 'connecting' | 'disconnected'
  >;
  let vehicleHistory: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    state$ = new BehaviorSubject({
      alerts: [
        alert({ id: 1, vehicleId: 'EVT-001', type: 'SPEEDING' }),
        alert({ id: 2, vehicleId: 'EVT-002', type: 'CRITICAL_BATTERY' }),
      ],
      vehicles: [
        vehicle({ vehicleId: 'EVT-001', model: 'Ford E-Transit' }),
        vehicle({ vehicleId: 'EVT-002', model: 'Ford F-150 Lightning' }),
      ],
    });
    connectionState$ = new BehaviorSubject<
      'connected' | 'connecting' | 'disconnected'
    >('connected');
    vehicleHistory = vi.fn();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: FleetTelemetryService,
          useValue: {
            connectionState$: connectionState$.asObservable(),
            state$: state$.asObservable(),
            vehicleHistory,
          },
        },
      ],
    }).compileComponents();
  });

  it('filters vehicles by search text and alerts by type', async () => {
    const fixture = TestBed.createComponent(App);
    const component = fixture.componentInstance;

    component.updateVehicleQuery('EVT-002');
    component.updateAlertType('CRITICAL_BATTERY');

    const vm = await firstValueFrom(component.vm$);

    expect(vm.vehicles.map((item) => item.vehicleId)).toEqual(['EVT-002']);
    expect(vm.alerts.map((item) => item.id)).toEqual([2]);
    expect(vm.totalVehicles).toBe(2);
    expect(vm.connectionState).toBe('connected');
  });

  it('selects vehicles and increments the map selection revision', async () => {
    const fixture = TestBed.createComponent(App);
    const component = fixture.componentInstance;

    component.selectVehicle('EVT-002');

    const vm = await firstValueFrom(component.vm$);

    expect(vm.selectedVehicleId).toBe('EVT-002');
    expect(vm.selectedVehicle?.model).toBe('Ford F-150 Lightning');
    expect(vm.selectionRevision).toBe(1);
  });

  it('opens vehicle history with readings returned by the backend service', () => {
    const fixture = TestBed.createComponent(App);
    const component = fixture.componentInstance;
    const reading = telemetryReading({ vehicleId: 'EVT-001' });
    const historyStates: boolean[] = [];
    vehicleHistory.mockReturnValue(of([reading]));

    const subscription = component.vm$.subscribe((vm) =>
      historyStates.push(vm.historyModal.isOpen),
    );
    component.openVehicleHistory('EVT-001');

    expect(vehicleHistory).toHaveBeenCalledWith('EVT-001');
    expect(historyStates).toEqual([false, true, true]);

    subscription.unsubscribe();
  });

  it('keeps the history modal open with an error state when history loading fails', () => {
    const fixture = TestBed.createComponent(App);
    const component = fixture.componentInstance;
    const errors: Array<string | null> = [];
    vehicleHistory.mockReturnValue(
      throwError(() => new Error('backend unavailable')),
    );

    const subscription = component.vm$.subscribe((vm) =>
      errors.push(vm.historyModal.error),
    );
    component.openVehicleHistory('EVT-002');

    expect(errors).toContain(
      'Não foi possível carregar o histórico do veículo.',
    );

    subscription.unsubscribe();
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

function telemetryReading(
  overrides: Partial<TelemetryReading> = {},
): TelemetryReading {
  return {
    vehicleId: 'EVT-001',
    batteryLevel: 80,
    speedKmh: 48,
    motorTemperatureCelsius: 62,
    latitude: -23.5505,
    longitude: -46.6333,
    recordedAt: '2026-05-25T12:00:00Z',
    ...overrides,
  };
}
