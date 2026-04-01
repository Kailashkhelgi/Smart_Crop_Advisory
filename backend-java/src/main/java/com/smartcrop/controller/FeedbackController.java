package com.smartcrop.controller;

import com.smartcrop.dto.ApiResponse;
import com.smartcrop.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping("/api/v1/feedback")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> submitFeedback(
            Authentication auth,
            @RequestBody Map<String, Object> body) {

        UUID sessionId = UUID.fromString((String) body.get("sessionId"));
        Boolean dismiss = (Boolean) body.get("dismiss");

        if (Boolean.TRUE.equals(dismiss)) {
            feedbackService.dismissFeedback(sessionId);
        } else {
            int rating = ((Number) body.get("rating")).intValue();
            feedbackService.submitFeedback(sessionId, rating);
        }
        return ResponseEntity.ok(ApiResponse.success(Map.of("ok", true)));
    }

    @GetMapping("/api/v1/dashboard/reports")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReports(
            Authentication auth,
            @RequestParam String role) {
        if (!"officer".equals(role) && !"admin".equals(role)) {
            return ResponseEntity.status(403)
                .body(ApiResponse.error("FORBIDDEN", "Access restricted to officers and administrators"));
        }
        return ResponseEntity.ok(ApiResponse.success(feedbackService.getAggregatedReports()));
    }
}
