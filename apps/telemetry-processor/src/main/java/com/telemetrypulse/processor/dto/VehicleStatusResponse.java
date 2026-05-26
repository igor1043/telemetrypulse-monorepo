package com.telemetrypulse.processor.dto;

import com.telemetrypulse.processor.domain.VehicleStatusKind;
import java.time.Instant;

public record VehicleStatusResponse(
    String vehicleId,
    String model,
    String imageUrl,
    VehicleStatusKind status,
    double batteryLevel,
    double speedKmh,
    double motorTemperatureCelsius,
    double latitude,
    double longitude,
    Instant lastUpdatedAt
) {
}
