package com.smartcrop.controller;

import com.smartcrop.dto.ApiResponse;
import com.smartcrop.service.ImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/images")
@RequiredArgsConstructor
public class ImageController {

    private final ImageService imageService;

    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<Map<String, Object>>> analyze(
            Authentication auth,
            @RequestParam("image") MultipartFile file) throws IOException {
        return ResponseEntity.ok(ApiResponse.success(imageService.analyze(file)));
    }
}
