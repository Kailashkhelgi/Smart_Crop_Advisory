package com.smartcrop.controller;

import com.smartcrop.dto.ApiResponse;
import com.smartcrop.service.WeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWeather(
            Authentication auth,
            @RequestParam double lat,
            @RequestParam double lon) {
        return ResponseEntity.ok(ApiResponse.success(weatherService.getWeather(lat, lon)));
    }
}
