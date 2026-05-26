package com.telemetrypulse.processor.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(
    name = "telemetry_readings",
    indexes = {
        @Index(name = "idx_telemetry_vehicle_recorded_at", columnList = "vehicle_id, recorded_at"),
        @Index(name = "idx_telemetry_recorded_at", columnList = "recorded_at")
    }
)
public class TelemetryReading {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vehicle_id", nullable = false, length = 40)
    private String vehicleId;

    @Column(name = "battery_level", nullable = false)
    private double batteryLevel;

    @Column(name = "speed_kmh", nullable = false)
    private double speedKmh;

    @Column(name = "motor_temperature_celsius", nullable = false)
    private double motorTemperatureCelsius;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    protected TelemetryReading() {
    }

    public TelemetryReading(
        String vehicleId,
        double batteryLevel,
        double speedKmh,
        double motorTemperatureCelsius,
        double latitude,
        double longitude,
        Instant recordedAt
    ) {
        this.vehicleId = vehicleId;
        this.batteryLevel = batteryLevel;
        this.speedKmh = speedKmh;
        this.motorTemperatureCelsius = motorTemperatureCelsius;
        this.latitude = latitude;
        this.longitude = longitude;
        this.recordedAt = recordedAt;
    }

    public Long getId() {
        return id;
    }

    public String getVehicleId() {
        return vehicleId;
    }

    public double getBatteryLevel() {
        return batteryLevel;
    }

    public double getSpeedKmh() {
        return speedKmh;
    }

    public double getMotorTemperatureCelsius() {
        return motorTemperatureCelsius;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }
}
