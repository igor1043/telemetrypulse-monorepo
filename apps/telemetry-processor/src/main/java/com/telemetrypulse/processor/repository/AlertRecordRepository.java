package com.telemetrypulse.processor.repository;

import com.telemetrypulse.processor.domain.AlertRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertRecordRepository extends JpaRepository<AlertRecord, Long> {
    List<AlertRecord> findTop50ByOrderByOccurredAtDesc();
}
