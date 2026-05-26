package com.telemetrypulse.processor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class TelemetryProcessorApplication {

	public static void main(String[] args) {
		SpringApplication.run(TelemetryProcessorApplication.class, args);
	}

}
