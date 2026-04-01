package com.smartcrop.repository;

import com.smartcrop.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {
    Optional<Feedback> findByAdvisorySessionId(UUID sessionId);

    @Query("SELECT AVG(f.rating) FROM Feedback f WHERE f.rating IS NOT NULL")
    Double findAverageRating();

    @Query("SELECT COUNT(f) FROM Feedback f")
    long countAll();
}
