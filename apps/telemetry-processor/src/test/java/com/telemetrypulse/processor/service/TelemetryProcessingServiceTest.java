package com.telemetrypulse.processor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.telemetrypulse.processor.domain.AlertRecord;
import com.telemetrypulse.processor.domain.AlertSeverity;
import com.telemetrypulse.processor.domain.AlertType;
import com.telemetrypulse.processor.domain.TelemetryReading;
import com.telemetrypulse.processor.domain.VehicleStatusKind;
import com.telemetrypulse.processor.dto.RealtimeEnvelope;
import com.telemetrypulse.processor.dto.TelemetryIngestRequest;
import com.telemetrypulse.processor.repository.AlertRecordRepository;
import com.telemetrypulse.processor.repository.TelemetryReadingRepository;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TelemetryProcessingServiceTest {
    @Mock
    private TelemetryReadingRepository telemetryRepository;

    @Mock
    private AlertRecordRepository alertRepository;

    @Mock
    private RealtimeEventService realtimeEventService;

    private TelemetryProcessingService service;

    @BeforeEach
    void setUp() {
        lenient().when(telemetryRepository.save(any(TelemetryReading.class)))
            .thenAnswer((invocation) -> invocation.getArgument(0));
        lenient().when(alertRepository.save(any(AlertRecord.class)))
            .thenAnswer((invocation) -> invocation.getArgument(0));

        service = new TelemetryProcessingService(
            telemetryRepository,
            alertRepository,
            realtimeEventService
        );
    }

    @Test
    void doesNotCreateAlertsWhenValuesAreExactlyAtThresholds() {
        TelemetryIngestRequest request = request("EVT-001", 15, 120, Instant.parse("2026-05-25T12:00:00Z"));

        ProcessedTelemetry processed = service.ingest(request);

        assertThat(processed.alerts()).isEmpty();
        assertThat(processed.vehicle().status()).isEqualTo(VehicleStatusKind.MOVING);
        assertThat(processed.vehicle().batteryLevel()).isEqualTo(15);
        assertThat(processed.vehicle().speedKmh()).isEqualTo(120);

        verify(alertRepository, never()).save(any());
        ArgumentCaptor<RealtimeEnvelope> envelopeCaptor = ArgumentCaptor.forClass(RealtimeEnvelope.class);
        verify(realtimeEventService).publish(envelopeCaptor.capture());
        assertThat(envelopeCaptor.getValue().eventType()).isEqualTo("TELEMETRY");
        assertThat(envelopeCaptor.getValue().vehicle().vehicleId()).isEqualTo("EVT-001");
    }

    @Test
    void createsSpeedingAndCriticalBatteryAlertsAndPublishesRealtimeEvents() {
        TelemetryIngestRequest request = request("EVT-002", 14.94, 130.25, Instant.parse("2026-05-25T12:01:00Z"));

        ProcessedTelemetry processed = service.ingest(request);

        assertThat(processed.alerts())
            .extracting("type")
            .containsExactly(AlertType.SPEEDING, AlertType.CRITICAL_BATTERY);
        assertThat(processed.alerts())
            .extracting("severity")
            .containsExactly(AlertSeverity.WARNING, AlertSeverity.CRITICAL);
        assertThat(processed.vehicle().batteryLevel()).isEqualTo(14.9);
        assertThat(processed.vehicle().speedKmh()).isEqualTo(130.3);

        ArgumentCaptor<AlertRecord> alertCaptor = ArgumentCaptor.forClass(AlertRecord.class);
        verify(alertRepository, org.mockito.Mockito.times(2)).save(alertCaptor.capture());
        assertThat(alertCaptor.getAllValues())
            .extracting(AlertRecord::getThreshold)
            .containsExactly(120.0, 15.0);

        ArgumentCaptor<RealtimeEnvelope> envelopeCaptor = ArgumentCaptor.forClass(RealtimeEnvelope.class);
        verify(realtimeEventService, org.mockito.Mockito.times(3)).publish(envelopeCaptor.capture());
        assertThat(envelopeCaptor.getAllValues())
            .extracting(RealtimeEnvelope::eventType)
            .containsExactly("TELEMETRY", "ALERT", "ALERT");
    }

    @Test
    void marksStaleVehiclesOfflineWithoutMutatingTheLastTelemetryCoordinates() {
        TelemetryIngestRequest request = request(
            "EVT-003",
            80,
            42,
            Instant.now().minusSeconds(60)
        );

        service.ingest(request);

        assertThat(service.currentVehicles()).singleElement().satisfies((vehicle) -> {
            assertThat(vehicle.vehicleId()).isEqualTo("EVT-003");
            assertThat(vehicle.status()).isEqualTo(VehicleStatusKind.OFFLINE);
            assertThat(vehicle.speedKmh()).isZero();
            assertThat(vehicle.latitude()).isEqualTo(-23.5505);
            assertThat(vehicle.longitude()).isEqualTo(-46.6333);
        });
    }

    @Test
    void exposesCurrentVehiclesSortedByVehicleId() {
        service.ingest(request("EVT-010", 70, 0, Instant.now()));
        service.ingest(request("EVT-002", 80, 9, Instant.now()));

        List<String> vehicleIds = service.currentVehicles().stream()
            .map((vehicle) -> vehicle.vehicleId())
            .toList();

        assertThat(vehicleIds).containsExactly("EVT-002", "EVT-010");
        assertThat(service.currentVehicles())
            .extracting("status")
            .containsExactly(VehicleStatusKind.MOVING, VehicleStatusKind.IDLE);
    }

    @Test
    void delegatesHistoryQueryToRepositoryWithProvidedPeriod() {
        Instant from = Instant.parse("2026-05-25T10:00:00Z");
        Instant to = Instant.parse("2026-05-25T11:00:00Z");
        TelemetryReading reading = new TelemetryReading("EVT-004", 70, 50, 60, -23.5, -46.6, from);
        when(telemetryRepository.findTop200ByVehicleIdAndRecordedAtBetweenOrderByRecordedAtDesc("EVT-004", from, to))
            .thenReturn(List.of(reading));

        assertThat(service.history("EVT-004", from, to)).containsExactly(reading);
        verifyNoInteractions(realtimeEventService);
    }

    @Test
    void normalizesMissingVehicleMetadataAtDtoBoundary() {
        TelemetryIngestRequest request = new TelemetryIngestRequest(
            "EVT-900",
            "",
            "",
            55,
            45,
            62,
            -23.55,
            -46.63,
            Instant.now()
        );

        assertThat(request.model()).isEqualTo("Veiculo eletrico");
        assertThat(request.imageUrl()).isEqualTo("/vehicles/sedan-silver.png");
    }

    private static TelemetryIngestRequest request(
        String vehicleId,
        double batteryLevel,
        double speedKmh,
        Instant recordedAt
    ) {
        return new TelemetryIngestRequest(
            vehicleId,
            "Ford E-Transit",
            "/vehicles/sedan-silver.png",
            batteryLevel,
            speedKmh,
            62.44,
            -23.5505,
            -46.6333,
            recordedAt
        );
    }
}
