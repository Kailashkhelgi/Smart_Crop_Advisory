package com.smartcrop.controller;

import com.smartcrop.dto.ApiResponse;
import com.smartcrop.dto.soil.SoilProfileRequest;
import com.smartcrop.dto.soil.SoilProfileResponse;
import com.smartcrop.service.SoilProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/soil-profiles")
@RequiredArgsConstructor
public class SoilProfileController {

    private final SoilProfileService soilProfileService;

    @PostMapping
    public ResponseEntity<ApiResponse<SoilProfileResponse>> create(
            Authentication auth, @RequestBody SoilProfileRequest req) {
        UUID farmerId = UUID.fromString(auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(SoilProfileResponse.from(
                soilProfileService.create(farmerId, req))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SoilProfileResponse>> get(
            Authentication auth, @PathVariable UUID id) {
        UUID farmerId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(ApiResponse.success(SoilProfileResponse.from(
            soilProfileService.get(id, farmerId))));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SoilProfileResponse>> update(
            Authentication auth, @PathVariable UUID id,
            @RequestBody SoilProfileRequest req) {
        UUID farmerId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(ApiResponse.success(SoilProfileResponse.from(
            soilProfileService.update(id, farmerId, req))));
    }
}
