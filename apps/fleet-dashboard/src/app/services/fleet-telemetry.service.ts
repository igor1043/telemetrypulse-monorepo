import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AlertEvent,
  RealtimeEvent,
  TelemetryReading,
  VehicleStatus,
} from '@telemetrypulse-monorepo/shared-contracts';
import {
  BehaviorSubject,
  Observable,
  catchError,
  forkJoin,
  map,
  merge,
  of,
  scan,
  shareReplay,
  startWith,
} from 'rxjs';
import { ConnectionState } from '@telemetrypulse-monorepo/shared-ui';
import {
  FleetAction,
  INITIAL_FLEET_STATE,
  reduceFleetState,
} from './fleet-state.reducer';

const API_BASE = '/api';

@Injectable({ providedIn: 'root' })
export class FleetTelemetryService {
  private readonly http = inject(HttpClient);
  private readonly connectionStateSubject =
    new BehaviorSubject<ConnectionState>('connecting');

  readonly connectionState$ = this.connectionStateSubject.asObservable();

  readonly state$ = merge(this.loadSnapshot(), this.openRealtimeStream()).pipe(
    scan(
      (state, action) => reduceFleetState(state, action),
      INITIAL_FLEET_STATE,
    ),
    startWith(INITIAL_FLEET_STATE),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  vehicleHistory(vehicleId: string): Observable<TelemetryReading[]> {
    return this.http.get<TelemetryReading[]>(
      `${API_BASE}/telemetry/${encodeURIComponent(vehicleId)}`,
    );
  }

  private loadSnapshot(): Observable<FleetAction> {
    return forkJoin({
      vehicles: this.http.get<VehicleStatus[]>(`${API_BASE}/vehicles`),
      alerts: this.http.get<AlertEvent[]>(`${API_BASE}/alerts/recent`),
    }).pipe(
      map(
        ({ vehicles, alerts }) =>
          ({ kind: 'snapshot', vehicles, alerts }) as FleetAction,
      ),
      catchError(() =>
        of({ kind: 'snapshot', vehicles: [], alerts: [] } as FleetAction),
      ),
    );
  }

  private openRealtimeStream(): Observable<FleetAction> {
    return new Observable<FleetAction>((observer) => {
      this.connectionStateSubject.next('connecting');
      const source = new EventSource(`${API_BASE}/stream`);

      source.onopen = () => this.connectionStateSubject.next('connected');
      source.onerror = () => this.connectionStateSubject.next('disconnected');
      source.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as RealtimeEvent;

          if (event.eventType === 'SNAPSHOT') {
            observer.next({
              kind: 'snapshot',
              vehicles: event.vehicles,
              alerts: event.alerts,
            });
          }

          if (event.eventType === 'TELEMETRY') {
            observer.next({ kind: 'telemetry', vehicle: event.vehicle });
          }

          if (event.eventType === 'ALERT') {
            observer.next({
              kind: 'alert',
              alert: event.alert,
              vehicle: event.vehicle,
            });
          }
        } catch (error) {
          observer.error(error);
        }
      };

      return () => source.close();
    });
  }
}
