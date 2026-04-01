package com.smartcrop.controller;

import com.smartcrop.dto.ApiResponse;
import com.smartcrop.model.Notification;
import com.smartcrop.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getAll(Authentication auth) {
        UUID farmerId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(ApiResponse.success(
            notificationService.getNotifications(farmerId)));
    }
}
