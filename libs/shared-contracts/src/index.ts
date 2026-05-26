export type VehicleStatusKind = 'MOVING' | 'IDLE' | 'OFFLINE';

export type AlertType = 'SPEEDING' | 'CRITICAL_BATTERY';

export type AlertSeverity = 'WARNING' | 'CRITICAL';

export interface VehicleStatus {
  vehicleId: string;
  model: string;
  imageUrl: string;
  status: VehicleStatusKind;
  batteryLevel: number;
  speedKmh: number;
  motorTemperatureCelsius: number;
  latitude: number;
  longitude: number;
  lastUpdatedAt: string;
}

export interface TelemetryReading {
  vehicleId: string;
  batteryLevel: number;
  speedKmh: number;
  motorTemperatureCelsius: number;
  latitude: number;
  longitude: number;
  recordedAt: string;
}

export interface AlertEvent {
  id: number;
  vehicleId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  occurredAt: string;
}

export interface SnapshotEvent {
  eventType: 'SNAPSHOT';
  vehicles: VehicleStatus[];
  alerts: AlertEvent[];
  emittedAt: string;
}

export interface TelemetryRealtimeEvent {
  eventType: 'TELEMETRY';
  vehicle: VehicleStatus;
  emittedAt: string;
}

export interface AlertRealtimeEvent {
  eventType: 'ALERT';
  alert: AlertEvent;
  vehicle: VehicleStatus;
  emittedAt: string;
}

export interface HeartbeatRealtimeEvent {
  eventType: 'HEARTBEAT';
  emittedAt: string;
}

export type RealtimeEvent =
  | SnapshotEvent
  | TelemetryRealtimeEvent
  | AlertRealtimeEvent
  | HeartbeatRealtimeEvent;

export * from './labels';
