package com.telemetrypulse.processor.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.telemetrypulse.processor.repository.AlertRecordRepository;
import com.telemetrypulse.processor.repository.TelemetryReadingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
    "telemetry.mock.enabled=false",
    "spring.datasource.url=jdbc:h2:mem:telemetrypulse-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
class TelemetryControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AlertRecordRepository alertRepository;

    @Autowired
    private TelemetryReadingRepository telemetryRepository;

    @BeforeEach
    void cleanDatabase() {
        alertRepository.deleteAll();
        telemetryRepository.deleteAll();
    }

    @Test
    void ingestsTelemetryCreatesAlertsAndExposesHistory() throws Exception {
        String payload = """
            {
              "vehicleId": "EVT-IT-001",
              "model": "Ford E-Transit",
              "imageUrl": "/vehicles/sedan-silver.png",
              "batteryLevel": 12,
              "speedKmh": 132,
              "motorTemperatureCelsius": 73,
              "latitude": -23.5505,
              "longitude": -46.6333,
              "recordedAt": "2026-05-25T12:00:00Z"
            }
            """;

        mockMvc.perform(post("/api/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.vehicle.vehicleId", is("EVT-IT-001")))
            .andExpect(jsonPath("$.vehicle.status", is("MOVING")))
            .andExpect(jsonPath("$.alerts", hasSize(2)))
            .andExpect(jsonPath("$.alerts[?(@.type == 'SPEEDING')]", hasSize(1)))
            .andExpect(jsonPath("$.alerts[?(@.type == 'CRITICAL_BATTERY')]", hasSize(1)));

        mockMvc.perform(get("/api/vehicles"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.vehicleId == 'EVT-IT-001')]", hasSize(1)));

        mockMvc.perform(get("/api/alerts/recent"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)));

        mockMvc.perform(get("/api/telemetry/EVT-IT-001")
                .param("from", "2026-05-25T11:59:00Z")
                .param("to", "2026-05-25T12:01:00Z"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].vehicleId", is("EVT-IT-001")));
    }

    @Test
    void rejectsInvalidTelemetryPayloadBeforePersisting() throws Exception {
        String payload = """
            {
              "vehicleId": "",
              "batteryLevel": 101,
              "speedKmh": -1,
              "motorTemperatureCelsius": 73,
              "latitude": -123.5505,
              "longitude": -46.6333
            }
            """;

        mockMvc.perform(post("/api/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/vehicles"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void opensRealtimeStreamAsServerSentEvents() throws Exception {
        mockMvc.perform(get("/api/stream").accept(MediaType.TEXT_EVENT_STREAM))
            .andExpect(status().isOk())
            .andExpect(request().asyncStarted());
    }
}
