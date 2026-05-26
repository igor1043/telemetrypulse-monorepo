package com.telemetrypulse.processor.controller;

import com.telemetrypulse.processor.domain.TelemetryReading;
import com.telemetrypulse.processor.dto.AlertResponse;
import com.telemetrypulse.processor.dto.RealtimeEnvelope;
import com.telemetrypulse.processor.dto.TelemetryIngestRequest;
import com.telemetrypulse.processor.dto.VehicleStatusResponse;
import com.telemetrypulse.processor.service.ProcessedTelemetry;
import com.telemetrypulse.processor.service.RealtimeEventService;
import com.telemetrypulse.processor.service.TelemetryProcessingService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200"})
public class TelemetryController {
    private final TelemetryProcessingService processingService;
    private final RealtimeEventService realtimeEventService;

    public TelemetryController(
        TelemetryProcessingService processingService,
        RealtimeEventService realtimeEventService
    ) {
        this.processingService = processingService;
        this.realtimeEventService = realtimeEventService;
    }

    @PostMapping("/telemetry")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ProcessedTelemetry ingest(@Valid @RequestBody TelemetryIngestRequest request) {
        return processingService.ingest(request);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        SseEmitter emitter = realtimeEventService.subscribe();
        realtimeEventService.send(
            emitter,
            RealtimeEnvelope.snapshot(processingService.currentVehicles(), processingService.recentAlerts())
        );
        return emitter;
    }

    @GetMapping("/vehicles")
    public List<VehicleStatusResponse> vehicles() {
        return processingService.currentVehicles();
    }

    @GetMapping("/alerts/recent")
    public List<AlertResponse> recentAlerts() {
        return processingService.recentAlerts();
    }

    @GetMapping("/telemetry/{vehicleId}")
    public List<TelemetryReading> history(
        @PathVariable String vehicleId,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        Instant safeTo = to == null ? Instant.now() : to;
        Instant safeFrom = from == null ? safeTo.minusSeconds(3600) : from;
        return processingService.history(vehicleId, safeFrom, safeTo);
    }
}
