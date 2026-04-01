package com.smartcrop.service;

import com.smartcrop.exception.AppException;
import com.smartcrop.model.AdvisorySession;
import com.smartcrop.model.Feedback;
import com.smartcrop.repository.AdvisorySessionRepository;
import com.smartcrop.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final AdvisorySessionRepository sessionRepository;
    private final FeedbackRepository feedbackRepository;

    public AdvisorySession recordSession(UUID farmerId, String sessionType,
                                         Map<String, Object> inputParams,
                                         Map<String, Object> recommendation) {
        String hash = sha256(farmerId.toString());
        return sessionRepository.save(AdvisorySession.builder()
            .farmerHash(hash)
            .sessionType(sessionType)
            .inputParams(inputParams)
            .recommendation(recommendation)
            .build());
    }

    @Transactional
    public Feedback submitFeedback(UUID sessionId, int rating) {
        if (rating < 1 || rating > 5) {
            throw AppException.validation("Rating must be an integer between 1 and 5", "rating");
        }
        AdvisorySession session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> AppException.notFound("Advisory session not found"));
        return feedbackRepository.save(Feedback.builder()
            .advisorySession(session)
            .rating((short) rating)
            .build());
    }

    @Transactional
    public void dismissFeedback(UUID sessionId) {
        feedbackRepository.findByAdvisorySessionId(sessionId).ifPresentOrElse(
            fb -> { fb.setDismissed(true); feedbackRepository.save(fb); },
            () -> {
                AdvisorySession session = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> AppException.notFound("Advisory session not found"));
                feedbackRepository.save(Feedback.builder()
                    .advisorySession(session).dismissed(true).build());
            }
        );
    }

    public Map<String, Object> getAggregatedReports() {
        long totalSessions = sessionRepository.count();
        Double avgRating = feedbackRepository.findAverageRating();
        long feedbackCount = feedbackRepository.countAll();

        Map<String, Long> sessionsByType = new HashMap<>();
        sessionRepository.countBySessionType()
            .forEach(row -> sessionsByType.put((String) row[0], (Long) row[1]));

        Map<String, Object> result = new HashMap<>();
        result.put("totalSessions", totalSessions);
        result.put("averageRating", avgRating);
        result.put("sessionsByType", sessionsByType);
        result.put("feedbackCount", feedbackCount);
        return result;
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 failed", e);
        }
    }
}
