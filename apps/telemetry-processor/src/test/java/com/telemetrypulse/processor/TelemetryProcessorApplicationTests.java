package com.telemetrypulse.processor;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
	"telemetry.mock.enabled=false",
	"spring.datasource.url=jdbc:h2:mem:telemetrypulse-context-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
	"spring.jpa.hibernate.ddl-auto=create-drop"
})
class TelemetryProcessorApplicationTests {

	@Test
	void contextLoads() {
	}

}
