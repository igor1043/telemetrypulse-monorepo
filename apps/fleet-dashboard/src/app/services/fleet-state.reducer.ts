import {
  AlertEvent,
  VehicleStatus,
} from '@telemetrypulse-monorepo/shared-contracts';

export interface FleetState {
  vehicles: VehicleStatus[];
  alerts: AlertEvent[];
}

export type FleetAction =
  | { kind: 'snapshot'; vehicles: VehicleStatus[]; alerts: AlertEvent[] }
  | { kind: 'telemetry'; vehicle: VehicleStatus }
  | { kind: 'alert'; alert: AlertEvent; vehicle: VehicleStatus };

export const INITIAL_FLEET_STATE: FleetState = { vehicles: [], alerts: [] };
export const MAX_RECENT_ALERTS = 50;

export function reduceFleetState(
  state: FleetState,
  action: FleetAction,
): FleetState {
  switch (action.kind) {
    case 'snapshot':
      return {
        alerts: [...action.alerts]
          .sort(sortAlertDescending)
          .slice(0, MAX_RECENT_ALERTS),
        vehicles: [...action.vehicles].sort(sortVehicleById),
      };
    case 'telemetry':
      return {
        ...state,
        vehicles: upsertVehicle(state.vehicles, action.vehicle),
      };
    case 'alert':
      return {
        alerts: [
          action.alert,
          ...state.alerts.filter((alert) => alert.id !== action.alert.id),
        ]
          .sort(sortAlertDescending)
          .slice(0, MAX_RECENT_ALERTS),
        vehicles: upsertVehicle(state.vehicles, action.vehicle),
      };
  }
}

function upsertVehicle(
  vehicles: VehicleStatus[],
  vehicle: VehicleStatus,
): VehicleStatus[] {
  const existing = vehicles.filter(
    (item) => item.vehicleId !== vehicle.vehicleId,
  );
  return [...existing, vehicle].sort(sortVehicleById);
}

function sortVehicleById(a: VehicleStatus, b: VehicleStatus): number {
  return a.vehicleId.localeCompare(b.vehicleId);
}

function sortAlertDescending(a: AlertEvent, b: AlertEvent): number {
  return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
}
