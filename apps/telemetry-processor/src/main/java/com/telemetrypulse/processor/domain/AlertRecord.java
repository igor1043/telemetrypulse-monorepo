package com.telemetrypulse.processor.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(
    name = "alert_records",
    indexes = {
        @Index(name = "idx_alert_vehicle_occurred_at", columnList = "vehicle_id, occurred_at"),
        @Index(name = "idx_alert_type_occurred_at", columnList = "type, occurred_at")
    }
)
public class AlertRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vehicle_id", nullable = false, length = 40)
    private String vehicleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private AlertType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlertSeverity severity;

    @Column(nullable = false, length = 160)
    private String message;

    @Column(name = "measured_value", nullable = false)
    private double value;

    @Column(nullable = false)
    private double threshold;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected AlertRecord() {
    }

    public AlertRecord(
        String vehicleId,
        AlertType type,
        AlertSeverity severity,
        String message,
        double value,
        double threshold,
        Instant occurredAt
    ) {
        this.vehicleId = vehicleId;
        this.type = type;
        this.severity = severity;
        this.message = message;
        this.value = value;
        this.threshold = threshold;
        this.occurredAt = occurredAt;
    }

    public Long getId() {
        return id;
    }

    public String getVehicleId() {
        return vehicleId;
    }

    public AlertType getType() {
        return type;
    }

    public AlertSeverity getSeverity() {
        return severity;
    }

    public String getMessage() {
        return message;
    }

    public double getValue() {
        return value;
    }

    public double getThreshold() {
        return threshold;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }
}
