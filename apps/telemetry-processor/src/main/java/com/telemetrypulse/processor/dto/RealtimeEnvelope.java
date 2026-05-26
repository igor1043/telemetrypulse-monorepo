package com.telemetrypulse.processor.dto;

import java.time.Instant;
import java.util.List;

public record RealtimeEnvelope(
    String eventType,
    VehicleStatusResponse vehicle,
    AlertResponse alert,
    List<VehicleStatusResponse> vehicles,
    List<AlertResponse> alerts,
    Instant emittedAt
) {
    public static RealtimeEnvelope telemetry(VehicleStatusResponse vehicle) {
        return new RealtimeEnvelope("TELEMETRY", vehicle, null, null, null, Instant.now());
    }

    public static RealtimeEnvelope alert(AlertResponse alert, VehicleStatusResponse vehicle) {
        return new RealtimeEnvelope("ALERT", vehicle, alert, null, null, Instant.now());
    }

    public static RealtimeEnvelope snapshot(List<VehicleStatusResponse> vehicles, List<AlertResponse> alerts) {
        return new RealtimeEnvelope("SNAPSHOT", null, null, vehicles, alerts, Instant.now());
    }

    public static RealtimeEnvelope heartbeat() {
        return new RealtimeEnvelope("HEARTBEAT", null, null, null, null, Instant.now());
    }
}
