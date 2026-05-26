package com.telemetrypulse.processor.service;

import com.telemetrypulse.processor.dto.AlertResponse;
import com.telemetrypulse.processor.dto.VehicleStatusResponse;
import java.util.List;

public record ProcessedTelemetry(
    VehicleStatusResponse vehicle,
    List<AlertResponse> alerts
) {
}
