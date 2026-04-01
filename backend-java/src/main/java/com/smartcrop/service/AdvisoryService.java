package com.smartcrop.service;

import com.smartcrop.config.AppProperties;
import com.smartcrop.exception.AppException;
import com.smartcrop.model.SoilProfile;
import com.smartcrop.repository.SoilProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdvisoryService {

    private final SoilProfileRepository soilProfileRepository;
    private final AppProperties appProperties;
    private final RestTemplate restTemplate;

    @SuppressWarnings("unchecked")
    public Object getCropRecommendations(UUID farmerId, UUID plotId) {
        SoilProfile profile = soilProfileRepository.findByIdAndFarmerId(plotId, farmerId)
            .orElseThrow(() -> AppException.notFound("Soil profile not found"));

        if (profile.getPh() == null || profile.getNitrogen() == null
                || profile.getPhosphorus() == null || profile.getPotassium() == null
                || profile.getSoilType() == null) {
            throw new AppException("INCOMPLETE_SOIL_PROFILE",
                "Soil profile is missing required fields. Please complete ph, nitrogen, phosphorus, potassium, and soil type.",
                org.springframework.http.HttpStatus.BAD_REQUEST);
        }

        Map<String, Object> body = new HashMap<>();
        Map<String, Object> soilMap = new HashMap<>();
        soilMap.put("type", profile.getSoilType());
        soilMap.put("ph", profile.getPh());
        soilMap.put("n", profile.getNitrogen());
        soilMap.put("p", profile.getPhosphorus());
        soilMap.put("k", profile.getPotassium());
        body.put("soil_profile", soilMap);
        body.put("location", Map.of(
            "lat", profile.getLatitude() != null ? profile.getLatitude() : 0,
            "lon", profile.getLongitude() != null ? profile.getLongitude() : 0
        ));
        body.put("season", "kharif");
        body.put("crop_history", List.of());

        try {
            return restTemplate.postForObject(
                appProperties.getAdvisoryEngineUrl() + "/internal/advisory/crops",
                body, Map.class);
        } catch (ResourceAccessException e) {
            throw AppException.serviceUnavailable("ADVISORY_ENGINE_UNAVAILABLE",
                "Advisory Engine is currently unavailable");
        }
    }

    @SuppressWarnings("unchecked")
    public Object getFertilizerGuidance(UUID farmerId, UUID plotId, String cropId) {
        SoilProfile profile = soilProfileRepository.findByIdAndFarmerId(plotId, farmerId)
            .orElseThrow(() -> new AppException("NO_SOIL_PROFILE",
                "No soil profile found. Please create a soil profile first.",
                org.springframework.http.HttpStatus.BAD_REQUEST));

        Map<String, Object> body = new HashMap<>();
        Map<String, Object> soilMap = new HashMap<>();
        soilMap.put("type", profile.getSoilType() != null ? profile.getSoilType() : "loamy");
        soilMap.put("ph", profile.getPh() != null ? profile.getPh() : 6.5);
        soilMap.put("n", profile.getNitrogen() != null ? profile.getNitrogen() : 0);
        soilMap.put("p", profile.getPhosphorus() != null ? profile.getPhosphorus() : 0);
        soilMap.put("k", profile.getPotassium() != null ? profile.getPotassium() : 0);
        body.put("soil_profile", soilMap);
        body.put("crop", cropId);

        try {
            return restTemplate.postForObject(
                appProperties.getAdvisoryEngineUrl() + "/internal/advisory/fertilizer",
                body, Map.class);
        } catch (ResourceAccessException e) {
            throw AppException.serviceUnavailable("ADVISORY_ENGINE_UNAVAILABLE",
                "Advisory Engine is currently unavailable");
        }
    }
}
