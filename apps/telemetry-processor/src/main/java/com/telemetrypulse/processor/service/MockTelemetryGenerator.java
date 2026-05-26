package com.telemetrypulse.processor.service;

import com.telemetrypulse.processor.dto.TelemetryIngestRequest;
import java.time.Instant;
import java.util.List;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MockTelemetryGenerator {
    private static final List<VehicleProfile> FLEET = List.of(
        new VehicleProfile("EVT-001", "Ford E-Transit", "/vehicles/sedan-silver.png", -23.5505, -46.6333),
        new VehicleProfile("EVT-002", "Ford Mustang Mach-E", "/vehicles/suv-red.png", -23.5667, -46.6938),
        new VehicleProfile("EVT-003", "Ford F-150 Lightning", "/vehicles/sedan-white.png", -23.6095, -46.6695),
        new VehicleProfile("EVT-004", "Ford E-Transit Courier", "/vehicles/ev-black.png", -23.5159, -46.6256),
        new VehicleProfile("EVT-005", "Ford Explorer EV", "/vehicles/suv-red.png", -23.5892, -46.6345)
    );

    private final TelemetryProcessingService processingService;
    private final Random random = new Random();
    private final AtomicInteger tick = new AtomicInteger();
    private final boolean enabled;

    public MockTelemetryGenerator(
        TelemetryProcessingService processingService,
        @Value("${telemetry.mock.enabled:true}") boolean enabled
    ) {
        this.processingService = processingService;
        this.enabled = enabled;
    }

    @Scheduled(fixedRateString = "${telemetry.mock.fixed-rate-ms:5000}")
    void generateTelemetry() {
        if (!enabled) {
            return;
        }

        int currentTick = tick.incrementAndGet();

        for (int index = 0; index < FLEET.size(); index++) {
            VehicleProfile profile = FLEET.get(index);
            double speed = nextSpeed(currentTick, index);
            double battery = nextBattery(currentTick, index);
            double latitude = profile.baseLatitude() + Math.sin((currentTick + index) / 6.0) * 0.018 + noise(0.003);
            double longitude = profile.baseLongitude() + Math.cos((currentTick + index) / 7.0) * 0.018 + noise(0.003);

            processingService.ingest(
                new TelemetryIngestRequest(
                    profile.vehicleId(),
                    profile.model(),
                    profile.imageUrl(),
                    battery,
                    speed,
                    58 + speed * 0.12 + noise(4),
                    latitude,
                    longitude,
                    Instant.now()
                )
            );
        }
    }

    private double nextSpeed(int currentTick, int index) {
        if ((currentTick + index) % 11 == 0) {
            return 124 + random.nextDouble(28);
        }

        if ((currentTick + index) % 7 == 0) {
            return random.nextDouble(4);
        }

        return 28 + random.nextDouble(72);
    }

    private double nextBattery(int currentTick, int index) {
        if ((currentTick + index) % 17 == 0) {
            return 6 + random.nextDouble(8);
        }

        return 26 + random.nextDouble(70);
    }

    private double noise(double range) {
        return (random.nextDouble() - 0.5) * range;
    }
}
