package com.smartcrop.controller;

import com.smartcrop.dto.ApiResponse;
import com.smartcrop.service.MarketPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/market-prices")
@RequiredArgsConstructor
public class MarketPriceController {

    private final MarketPriceService marketPriceService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPrices(
            Authentication auth,
            @RequestParam String crop) {
        UUID farmerId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(ApiResponse.success(
            marketPriceService.getPrices(farmerId, crop)));
    }
}
