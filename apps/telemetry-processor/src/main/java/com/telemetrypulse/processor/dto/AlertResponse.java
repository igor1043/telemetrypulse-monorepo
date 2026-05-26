package com.telemetrypulse.processor.dto;

import com.telemetrypulse.processor.domain.AlertSeverity;
import com.telemetrypulse.processor.domain.AlertType;
import java.time.Instant;

public record AlertResponse(
    Long id,
    String vehicleId,
    AlertType type,
    AlertSeverity severity,
    String message,
    double value,
    double threshold,
    Instant occurredAt
) {
}
