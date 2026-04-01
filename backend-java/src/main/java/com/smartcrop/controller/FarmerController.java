package com.smartcrop.controller;

import com.smartcrop.dto.ApiResponse;
import com.smartcrop.dto.farmer.FarmerProfileRequest;
import com.smartcrop.dto.farmer.FarmerProfileResponse;
import com.smartcrop.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/farmers")
@RequiredArgsConstructor
public class FarmerController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<FarmerProfileResponse>> getProfile(Authentication auth) {
        UUID farmerId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(ApiResponse.success(
            FarmerProfileResponse.from(userService.getProfile(farmerId))));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<FarmerProfileResponse>> updateProfile(
            Authentication auth, @RequestBody FarmerProfileRequest req) {
        UUID farmerId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(ApiResponse.success(
            FarmerProfileResponse.from(userService.updateProfile(farmerId, req))));
    }
}
