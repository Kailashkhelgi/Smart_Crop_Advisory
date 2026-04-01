package com.smartcrop.controller;

import com.smartcrop.dto.ApiResponse;
import com.smartcrop.dto.auth.*;
import com.smartcrop.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, String>>> register(
            @Valid @RequestBody RegisterRequest req) {
        userService.sendOtp(req.getMobileNumber());
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "OTP sent")));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<TokenResponse>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest req) {
        TokenResponse tokens = userService.verifyOtp(req.getMobileNumber(), req.getOtp());
        return ResponseEntity.ok(ApiResponse.success(tokens));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(
            @Valid @RequestBody RefreshRequest req) {
        TokenResponse tokens = userService.refreshToken(req.getFarmerId(), req.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success(tokens));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Map<String, String>>> logout(Authentication auth) {
        userService.logout(auth.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Logged out successfully")));
    }
}
