package com.telemetrypulse.processor.repository;

import com.telemetrypulse.processor.domain.TelemetryReading;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TelemetryReadingRepository extends JpaRepository<TelemetryReading, Long> {
    List<TelemetryReading> findTop200ByVehicleIdAndRecordedAtBetweenOrderByRecordedAtDesc(
        String vehicleId,
        Instant from,
        Instant to
    );
}
