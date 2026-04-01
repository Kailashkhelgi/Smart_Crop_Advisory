package com.smartcrop.vision.controller;

import com.smartcrop.vision.service.VisionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/internal/vision")
@RequiredArgsConstructor
public class VisionController {

    private final VisionService visionService;

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyze(
            @RequestParam("image") MultipartFile image) throws IOException {
        return ResponseEntity.ok(visionService.analyze(image.getBytes()));
    }
}
