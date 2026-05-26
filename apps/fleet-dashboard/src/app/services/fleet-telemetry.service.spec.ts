import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  AlertEvent,
  RealtimeEvent,
  VehicleStatus,
} from '@telemetrypulse-monorepo/shared-contracts';
import { Subscription } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FleetTelemetryService } from './fleet-telemetry.service';
import { FleetState } from './fleet-state.reducer';

class EventSourceStub {
  static instances: EventSourceStub[] = [];

  onerror: ((event: Event) => void) | null = null;
  onmessage: ((message: MessageEvent) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readonly close = vi.fn();

  constructor(readonly url: string) {
    EventSourceStub.instances.push(this);
  }

  emit(event: RealtimeEvent): void {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent);
  }
}

describe('FleetTelemetryService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    EventSourceStub.instances = [];
    vi.stubGlobal('EventSource', EventSourceStub);

    TestBed.configureTestingModule({
      providers: [
        FleetTelemetryService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  it('requests encoded telemetry history for a selected vehicle', () => {
    const service = TestBed.inject(FleetTelemetryService);

    service.vehicleHistory('EVT/001').subscribe((history) => {
      expect(history).toEqual([]);
    });

    const request = http.expectOne('/api/telemetry/EVT%2F001');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('loads the initial REST snapshot and then reduces realtime events', () => {
    const service = TestBed.inject(FleetTelemetryService);
    const states: FleetState[] = [];
    const subscription: Subscription = service.state$.subscribe((state) =>
      states.push(state),
    );

    http.expectOne('/api/vehicles').flush([vehicle({ vehicleId: 'EVT-002' })]);
    http.expectOne('/api/alerts/recent').flush([alert({ id: 1 })]);

    expect(EventSourceStub.instances).toHaveLength(1);
    const source = EventSourceStub.instances[0];
    expect(source.url).toBe('/api/stream');
    expect(latest(states)).toMatchObject({
      alerts: [{ id: 1 }],
      vehicles: [{ vehicleId: 'EVT-002' }],
    });

    source.emit({
      eventType: 'TELEMETRY',
      emittedAt: '2026-05-25T12:01:00Z',
      vehicle: vehicle({ vehicleId: 'EVT-001', speedKmh: 66 }),
    });
    expect(latest(states).vehicles.map((item) => item.vehicleId)).toEqual([
      'EVT-001',
      'EVT-002',
    ]);

    source.emit({
      eventType: 'ALERT',
      emittedAt: '2026-05-25T12:02:00Z',
      alert: alert({ id: 2, vehicleId: 'EVT-001' }),
      vehicle: vehicle({ vehicleId: 'EVT-001', speedKmh: 132 }),
    });
    expect(latest(states).alerts.map((item) => item.id)).toEqual([2, 1]);
    expect(latest(states).vehicles[0]).toMatchObject({
      vehicleId: 'EVT-001',
      speedKmh: 132,
    });

    subscription.unsubscribe();
    expect(source.close).toHaveBeenCalledOnce();
  });

  it('updates connection state from EventSource lifecycle callbacks', () => {
    const service = TestBed.inject(FleetTelemetryService);
    const connectionStates: string[] = [];
    const connectionSubscription = service.connectionState$.subscribe((state) =>
      connectionStates.push(state),
    );
    const stateSubscription = service.state$.subscribe();

    http.expectOne('/api/vehicles').flush([]);
    http.expectOne('/api/alerts/recent').flush([]);

    const source = EventSourceStub.instances[0];
    source.onopen?.(new Event('open'));
    source.onerror?.(new Event('error'));

    expect(connectionStates).toEqual([
      'connecting',
      'connecting',
      'connected',
      'disconnected',
    ]);

    stateSubscription.unsubscribe();
    connectionSubscription.unsubscribe();
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

function latest<T>(items: T[]): T {
  return items[items.length - 1];
}
