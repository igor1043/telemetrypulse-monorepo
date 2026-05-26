package com.telemetrypulse.processor.service;

import com.telemetrypulse.processor.domain.AlertRecord;
import com.telemetrypulse.processor.domain.AlertSeverity;
import com.telemetrypulse.processor.domain.AlertType;
import com.telemetrypulse.processor.domain.TelemetryReading;
import com.telemetrypulse.processor.domain.VehicleStatusKind;
import com.telemetrypulse.processor.dto.AlertResponse;
import com.telemetrypulse.processor.dto.RealtimeEnvelope;
import com.telemetrypulse.processor.dto.TelemetryIngestRequest;
import com.telemetrypulse.processor.dto.VehicleStatusResponse;
import com.telemetrypulse.processor.repository.AlertRecordRepository;
import com.telemetrypulse.processor.repository.TelemetryReadingRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TelemetryProcessingService {
    public static final double SPEED_LIMIT_KMH = 120.0;
    public static final double CRITICAL_BATTERY_PERCENT = 15.0;

    private static final Duration OFFLINE_AFTER = Duration.ofSeconds(30);

    private final TelemetryReadingRepository telemetryRepository;
    private final AlertRecordRepository alertRepository;
    private final RealtimeEventService realtimeEventService;
    private final Map<String, VehicleStatusResponse> currentVehicles = new ConcurrentHashMap<>();

    public TelemetryProcessingService(
        TelemetryReadingRepository telemetryRepository,
        AlertRecordRepository alertRepository,
        RealtimeEventService realtimeEventService
    ) {
        this.telemetryRepository = telemetryRepository;
        this.alertRepository = alertRepository;
        this.realtimeEventService = realtimeEventService;
    }

    @Transactional
    public ProcessedTelemetry ingest(TelemetryIngestRequest request) {
        Instant recordedAt = Optional.ofNullable(request.recordedAt()).orElseGet(Instant::now);
        TelemetryReading reading = telemetryRepository.save(
            new TelemetryReading(
                request.vehicleId(),
                request.batteryLevel(),
                request.speedKmh(),
                request.motorTemperatureCelsius(),
                request.latitude(),
                request.longitude(),
                recordedAt
            )
        );

        VehicleStatusResponse vehicle = toVehicleStatus(request, recordedAt);
        currentVehicles.put(vehicle.vehicleId(), vehicle);

        List<AlertResponse> alerts = evaluateRules(reading).stream()
            .map(alertRepository::save)
            .map(this::toAlertResponse)
            .toList();

        realtimeEventService.publish(RealtimeEnvelope.telemetry(vehicle));
        alerts.forEach((alert) -> realtimeEventService.publish(RealtimeEnvelope.alert(alert, vehicle)));

        return new ProcessedTelemetry(vehicle, alerts);
    }

    public List<VehicleStatusResponse> currentVehicles() {
        Instant now = Instant.now();
        return currentVehicles.values().stream()
            .map((vehicle) -> refreshStatus(vehicle, now))
            .sorted(Comparator.comparing(VehicleStatusResponse::vehicleId))
            .toList();
    }

    public List<AlertResponse> recentAlerts() {
        return alertRepository.findTop50ByOrderByOccurredAtDesc().stream()
            .map(this::toAlertResponse)
            .toList();
    }

    public List<TelemetryReading> history(String vehicleId, Instant from, Instant to) {
        return telemetryRepository.findTop200ByVehicleIdAndRecordedAtBetweenOrderByRecordedAtDesc(
            vehicleId,
            from,
            to
        );
    }

    private VehicleStatusResponse toVehicleStatus(TelemetryIngestRequest request, Instant recordedAt) {
        return new VehicleStatusResponse(
            request.vehicleId(),
            request.model(),
            request.imageUrl(),
            request.speedKmh() >= 5 ? VehicleStatusKind.MOVING : VehicleStatusKind.IDLE,
            round(request.batteryLevel()),
            round(request.speedKmh()),
            round(request.motorTemperatureCelsius()),
            request.latitude(),
            request.longitude(),
            recordedAt
        );
    }

    private List<AlertRecord> evaluateRules(TelemetryReading reading) {
        List<AlertRecord> alerts = new ArrayList<>();

        if (reading.getSpeedKmh() > SPEED_LIMIT_KMH) {
            alerts.add(
                new AlertRecord(
                    reading.getVehicleId(),
                    AlertType.SPEEDING,
                    AlertSeverity.WARNING,
                    "Excesso de Velocidade",
                    reading.getSpeedKmh(),
                    SPEED_LIMIT_KMH,
                    reading.getRecordedAt()
                )
            );
        }

        if (reading.getBatteryLevel() < CRITICAL_BATTERY_PERCENT) {
            alerts.add(
                new AlertRecord(
                    reading.getVehicleId(),
                    AlertType.CRITICAL_BATTERY,
                    AlertSeverity.CRITICAL,
                    "Bateria Crítica",
                    reading.getBatteryLevel(),
                    CRITICAL_BATTERY_PERCENT,
                    reading.getRecordedAt()
                )
            );
        }

        return alerts;
    }

    private VehicleStatusResponse refreshStatus(VehicleStatusResponse vehicle, Instant now) {
        if (Duration.between(vehicle.lastUpdatedAt(), now).compareTo(OFFLINE_AFTER) <= 0) {
            return vehicle;
        }

        return new VehicleStatusResponse(
            vehicle.vehicleId(),
            vehicle.model(),
            vehicle.imageUrl(),
            VehicleStatusKind.OFFLINE,
            vehicle.batteryLevel(),
            0,
            vehicle.motorTemperatureCelsius(),
            vehicle.latitude(),
            vehicle.longitude(),
            vehicle.lastUpdatedAt()
        );
    }

    private AlertResponse toAlertResponse(AlertRecord alert) {
        return new AlertResponse(
            alert.getId(),
            alert.getVehicleId(),
            alert.getType(),
            alert.getSeverity(),
            alert.getMessage(),
            round(alert.getValue()),
            round(alert.getThreshold()),
            alert.getOccurredAt()
        );
    }

    private static double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
