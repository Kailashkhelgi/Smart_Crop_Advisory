package com.smartcrop.controller;

import com.smartcrop.dto.ApiResponse;
import com.smartcrop.service.AdvisoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/advisory")
@RequiredArgsConstructor
public class AdvisoryController {

    private final AdvisoryService advisoryService;

    @GetMapping("/crops")
    public ResponseEntity<ApiResponse<Object>> getCrops(
            Authentication auth,
            @RequestParam UUID plotId) {
        UUID farmerId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(ApiResponse.success(
            advisoryService.getCropRecommendations(farmerId, plotId)));
    }

    @GetMapping("/fertilizer")
    public ResponseEntity<ApiResponse<Object>> getFertilizer(
            Authentication auth,
            @RequestParam UUID plotId,
            @RequestParam String cropId) {
        UUID farmerId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(ApiResponse.success(
            advisoryService.getFertilizerGuidance(farmerId, plotId, cropId)));
    }
}
