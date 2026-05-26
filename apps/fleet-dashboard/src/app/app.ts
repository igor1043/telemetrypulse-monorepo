import { AsyncPipe, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  ALERT_TYPE_LABELS,
  AlertEvent,
} from '@telemetrypulse-monorepo/shared-contracts';
import {
  FordSearchInputComponent,
  FordSelectComponent,
  FordSelectOption,
  VehicleListItemComponent,
} from '@telemetrypulse-monorepo/shared-ui';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';
import { FleetMapComponent } from './components/fleet-map/fleet-map.component';
import {
  VehicleHistoryModalComponent,
  VehicleHistoryModalState,
} from './components/vehicle-history-modal/vehicle-history-modal.component';
import { FleetTelemetryService } from './services/fleet-telemetry.service';

const CLOSED_HISTORY_MODAL: VehicleHistoryModalState = {
  error: null,
  isLoading: false,
  isOpen: false,
  readings: [],
  vehicleId: null,
};

@Component({
  imports: [
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    FleetMapComponent,
    FordSearchInputComponent,
    FordSelectComponent,
    NgClass,
    VehicleHistoryModalComponent,
    VehicleListItemComponent,
  ],
  selector: 'tp-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly telemetry = inject(FleetTelemetryService);
  private readonly selectedVehicleIdSubject = new BehaviorSubject<
    string | null
  >(null);
  private readonly vehicleQuerySubject = new BehaviorSubject('');
  private readonly alertTypeSubject = new BehaviorSubject<
    'ALL' | AlertEvent['type']
  >('ALL');
  private readonly selectionRevisionSubject = new BehaviorSubject(0);
  private readonly historyVehicleIdSubject = new BehaviorSubject<string | null>(
    null,
  );

  private readonly historyModal$ = this.historyVehicleIdSubject.pipe(
    switchMap((vehicleId) => {
      if (!vehicleId) {
        return of(CLOSED_HISTORY_MODAL);
      }

      return this.telemetry.vehicleHistory(vehicleId).pipe(
        map(
          (readings): VehicleHistoryModalState => ({
            error: null,
            isLoading: false,
            isOpen: true,
            readings,
            vehicleId,
          }),
        ),
        startWith({
          error: null,
          isLoading: true,
          isOpen: true,
          readings: [],
          vehicleId,
        } satisfies VehicleHistoryModalState),
        catchError(() =>
          of({
            error: 'Não foi possível carregar o histórico do veículo.',
            isLoading: false,
            isOpen: true,
            readings: [],
            vehicleId,
          } satisfies VehicleHistoryModalState),
        ),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly alertTypeOptions: FordSelectOption[] = [
    { label: ALERT_TYPE_LABELS.ALL, value: 'ALL' },
    { label: ALERT_TYPE_LABELS.SPEEDING, value: 'SPEEDING' },
    { label: ALERT_TYPE_LABELS.CRITICAL_BATTERY, value: 'CRITICAL_BATTERY' },
  ];

  readonly vm$ = combineLatest([
    this.telemetry.state$,
    this.telemetry.connectionState$,
    this.selectedVehicleIdSubject,
    this.selectionRevisionSubject,
    this.vehicleQuerySubject,
    this.alertTypeSubject,
    this.historyModal$,
  ]).pipe(
    map(
      ([
        state,
        connectionState,
        selectedVehicleId,
        selectionRevision,
        vehicleQuery,
        alertType,
        historyModal,
      ]) => {
        const normalizedQuery = vehicleQuery.trim().toLowerCase();
        const vehicles = normalizedQuery
          ? state.vehicles.filter((vehicle) =>
              [vehicle.vehicleId, vehicle.model]
                .join(' ')
                .toLowerCase()
                .includes(normalizedQuery),
            )
          : state.vehicles;

        const alerts = state.alerts.filter((alert) => {
          const matchesType = alertType === 'ALL' || alert.type === alertType;
          const matchesVehicle =
            !normalizedQuery ||
            alert.vehicleId.toLowerCase().includes(normalizedQuery);
          return matchesType && matchesVehicle;
        });

        const selectedVehicle =
          state.vehicles.find(
            (vehicle) => vehicle.vehicleId === selectedVehicleId,
          ) ??
          state.vehicles[0] ??
          null;

        return {
          alerts,
          alertType,
          connectionState,
          historyModal,
          selectionRevision,
          selectedVehicle,
          selectedVehicleId,
          totalVehicles: state.vehicles.length,
          vehicleQuery,
          vehicles,
        };
      },
    ),
  );

  selectVehicle(vehicleId: string): void {
    this.selectedVehicleIdSubject.next(vehicleId);
    this.selectionRevisionSubject.next(
      this.selectionRevisionSubject.value + 1,
    );
  }

  updateVehicleQuery(query: string): void {
    this.vehicleQuerySubject.next(query);
  }

  updateAlertType(alertType: string): void {
    this.alertTypeSubject.next(alertType as 'ALL' | AlertEvent['type']);
  }

  openVehicleHistory(vehicleId: string): void {
    this.historyVehicleIdSubject.next(vehicleId);
  }

  closeVehicleHistory(): void {
    this.historyVehicleIdSubject.next(null);
  }
}
