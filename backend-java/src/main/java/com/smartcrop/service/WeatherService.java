package com.smartcrop.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartcrop.config.AppProperties;
import com.smartcrop.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeatherService {

    private final StringRedisTemplate redis;
    private final AppProperties appProperties;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @SuppressWarnings("unchecked")
    public Map<String, Object> getWeather(double lat, double lon) {
        String cacheKey = "weather:" + lat + ":" + lon;
        String cached = redis.opsForValue().get(cacheKey);
        if (cached != null) {
            try { return objectMapper.readValue(cached, Map.class); }
            catch (Exception ignored) {}
        }

        try {
            String url = "https://api.openweathermap.org/data/2.5/forecast?lat=" + lat
                + "&lon=" + lon + "&appid=" + appProperties.getWeather().getApiKey() + "&units=metric";
            Map<String, Object> data = restTemplate.getForObject(url, Map.class);
            String json = objectMapper.writeValueAsString(data);
            redis.opsForValue().set(cacheKey, json, Duration.ofHours(6));
            redis.opsForValue().set("weather:last:" + lat + ":" + lon, json);
            return data;
        } catch (Exception e) {
            // Try permanent fallback
            String fallback = redis.opsForValue().get("weather:last:" + lat + ":" + lon);
            if (fallback != null) {
                try { return objectMapper.readValue(fallback, Map.class); }
                catch (Exception ignored) {}
            }
            throw AppException.serviceUnavailable("WEATHER_UNAVAILABLE",
                "Weather service is currently unavailable and no cached data exists");
        }
    }
}
