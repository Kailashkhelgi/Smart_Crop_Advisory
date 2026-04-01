package com.smartcrop.repository;

import com.smartcrop.model.AdvisorySession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.UUID;
import java.util.List;

public interface AdvisorySessionRepository extends JpaRepository<AdvisorySession, UUID> {

    @Query("SELECT s.sessionType, COUNT(s) FROM AdvisorySession s GROUP BY s.sessionType")
    List<Object[]> countBySessionType();
}
