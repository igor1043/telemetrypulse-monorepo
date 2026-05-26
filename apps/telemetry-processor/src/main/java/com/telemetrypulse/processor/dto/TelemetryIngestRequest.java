package com.telemetrypulse.processor.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

public record TelemetryIngestRequest(
    @NotBlank String vehicleId,
    String model,
    String imageUrl,
    @DecimalMin("0.0") @DecimalMax("100.0") double batteryLevel,
    @DecimalMin("0.0") double speedKmh,
    @DecimalMin("-40.0") double motorTemperatureCelsius,
    @DecimalMin("-90.0") @DecimalMax("90.0") double latitude,
    @DecimalMin("-180.0") @DecimalMax("180.0") double longitude,
    Instant recordedAt
) {
    public TelemetryIngestRequest {
        model = model == null || model.isBlank() ? "Veiculo eletrico" : model;
        imageUrl = imageUrl == null || imageUrl.isBlank() ? "/vehicles/sedan-silver.png" : imageUrl;
    }
}
