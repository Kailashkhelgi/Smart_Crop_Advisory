package com.smartcrop.advisory.controller;

import com.smartcrop.advisory.model.CropAdvisoryRequest;
import com.smartcrop.advisory.model.CropRecommendation;
import com.smartcrop.advisory.service.CropAdvisoryService;
import com.smartcrop.advisory.service.FertilizerAdvisoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/advisory")
@RequiredArgsConstructor
public class AdvisoryController {

    private final CropAdvisoryService cropService;
    private final FertilizerAdvisoryService fertService;

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @PostMapping("/crops")
    public ResponseEntity<Map<String, List<CropRecommendation>>> crops(
            @RequestBody CropAdvisoryRequest req) {
        if (req.getSoilProfile() == null) {
            return ResponseEntity.unprocessableEntity().build();
        }
        List<CropRecommendation> recs = cropService.recommend(req);
        if (recs.size() < 3) {
            return ResponseEntity.unprocessableEntity().build();
        }
        return ResponseEntity.ok(Map.of("crops", recs));
    }

    @PostMapping("/fertilizer")
    public ResponseEntity<Map<String, Object>> fertilizer(
            @RequestBody Map<String, Object> body) {
        if (!body.containsKey("soil_profile")) {
            return ResponseEntity.unprocessableEntity().build();
        }
        String crop = (String) body.getOrDefault("crop", "wheat");
        @SuppressWarnings("unchecked")
        Map<String, Object> soil = (Map<String, Object>) body.get("soil_profile");
        double ph = soil.containsKey("ph") ? ((Number) soil.get("ph")).doubleValue() : 6.5;
        return ResponseEntity.ok(fertService.getFertilizerSchedule(crop, ph));
    }
}
