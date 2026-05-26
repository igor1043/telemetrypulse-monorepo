package com.telemetrypulse.processor.service;

import com.telemetrypulse.processor.dto.RealtimeEnvelope;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class RealtimeEventService {
    private static final long SSE_TIMEOUT_MILLIS = 0L;

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError((error) -> emitters.remove(emitter));
        emitters.add(emitter);
        sendToEmitter(emitter, RealtimeEnvelope.heartbeat());
        return emitter;
    }

    public void publish(RealtimeEnvelope envelope) {
        for (SseEmitter emitter : emitters) {
            sendToEmitter(emitter, envelope);
        }
    }

    public void send(SseEmitter emitter, RealtimeEnvelope envelope) {
        sendToEmitter(emitter, envelope);
    }

    @Scheduled(fixedRateString = "${telemetry.sse.heartbeat-ms:15000}")
    void heartbeat() {
        publish(RealtimeEnvelope.heartbeat());
    }

    private void sendToEmitter(SseEmitter emitter, RealtimeEnvelope envelope) {
        try {
            emitter.send(envelope);
        } catch (IOException | IllegalStateException error) {
            emitters.remove(emitter);
        }
    }
}
