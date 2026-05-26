import type { AlertType, VehicleStatusKind } from './index';

export const VEHICLE_STATUS_LABELS: Record<VehicleStatusKind, string> = {
  MOVING: 'Em movimento',
  IDLE: 'Parado',
  OFFLINE: 'Offline',
};

export const ALERT_TYPE_LABELS: Record<AlertType | 'ALL', string> = {
  ALL: 'Todos os alertas',
  SPEEDING: 'Excesso de Velocidade',
  CRITICAL_BATTERY: 'Bateria Crítica',
};
