package com.smartcrop.service;

import com.smartcrop.config.AppProperties;
import com.smartcrop.dto.auth.TokenResponse;
import com.smartcrop.dto.farmer.FarmerProfileRequest;
import com.smartcrop.exception.AppException;
import com.smartcrop.model.Farmer;
import com.smartcrop.repository.FarmerRepository;
import com.smartcrop.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final FarmerRepository farmerRepository;
    private final StringRedisTemplate redis;
    private final JwtUtil jwtUtil;
    private final AppProperties appProperties;
    private final RestTemplate restTemplate;

    private static final SecureRandom RANDOM = new SecureRandom();

    // In-memory fallback when Redis is unavailable
    private static final Map<String, String> OTP_STORE = new ConcurrentHashMap<>();
    private static final Map<String, String> REFRESH_STORE = new ConcurrentHashMap<>();

    // ── OTP ──────────────────────────────────────────────────────────────────

    public void sendOtp(String mobileNumber) {
        String otp = String.format("%06d", RANDOM.nextInt(1_000_000));
        storeOtp(mobileNumber, otp);

        String apiKey = appProperties.getOtp().getProvider().getApiKey();
        if (apiKey == null || apiKey.equals("dev_key")) {
            log.info("[DEV] OTP for {}: {}", mobileNumber, otp);
            return;
        }

        // Strip country code prefix — Fast2SMS expects 10-digit Indian number
        String number = mobileNumber.replaceAll("^\\+91", "").replaceAll("^91", "");

        try {
            String url = UriComponentsBuilder
                .fromHttpUrl("https://www.fast2sms.com/dev/bulkV2")
                .queryParam("authorization", apiKey)
                .queryParam("variables_values", otp)
                .queryParam("route", "otp")
                .queryParam("numbers", number)
                .toUriString();

            String response = restTemplate.getForObject(url, String.class);
            log.info("Fast2SMS response for {}: {}", number, response);
        } catch (Exception e) {
            log.error("Failed to send OTP via Fast2SMS: {}", e.getMessage());
        }
    }

    private void storeOtp(String mobile, String otp) {
        try {
            redis.opsForValue().set("otp:" + mobile, otp, Duration.ofMinutes(10));
        } catch (Exception e) {
            log.warn("Redis unavailable, using in-memory OTP store");
            OTP_STORE.put("otp:" + mobile, otp);
        }
    }

    private String getOtp(String mobile) {
        try {
            return redis.opsForValue().get("otp:" + mobile);
        } catch (Exception e) {
            return OTP_STORE.get("otp:" + mobile);
        }
    }

    private void deleteOtp(String mobile) {
        try {
            redis.delete("otp:" + mobile);
        } catch (Exception e) {
            OTP_STORE.remove("otp:" + mobile);
        }
    }

    private void storeRefresh(String farmerId, String token) {
        try {
            long refreshMs = appProperties.getJwt().getRefreshExpirationMs();
            redis.opsForValue().set("refresh:" + farmerId, token, Duration.ofMillis(refreshMs));
        } catch (Exception e) {
            REFRESH_STORE.put("refresh:" + farmerId, token);
        }
    }

    private String getRefresh(String farmerId) {
        try {
            return redis.opsForValue().get("refresh:" + farmerId);
        } catch (Exception e) {
            return REFRESH_STORE.get("refresh:" + farmerId);
        }
    }

    private void deleteRefresh(String farmerId) {
        try {
            redis.delete("refresh:" + farmerId);
        } catch (Exception e) {
            REFRESH_STORE.remove("refresh:" + farmerId);
        }
    }

    @Transactional
    public TokenResponse verifyOtp(String mobileNumber, String otp) {
        String stored = getOtp(mobileNumber);
        if (stored == null || !stored.equals(otp)) {
            throw new AppException("INVALID_OTP", "OTP is invalid or has expired", HttpStatus.UNAUTHORIZED);
        }
        deleteOtp(mobileNumber);

        Farmer farmer = farmerRepository.findByMobileNumber(mobileNumber)
            .orElseGet(() -> farmerRepository.save(
                Farmer.builder().mobileNumber(mobileNumber).build()
            ));

        String accessToken = jwtUtil.generateAccessToken(farmer.getId());
        String refreshToken = UUID.randomUUID().toString();
        storeRefresh(farmer.getId().toString(), refreshToken);

        return new TokenResponse(accessToken, refreshToken, farmer.getId().toString());
    }

    public TokenResponse refreshToken(String farmerId, String refreshToken) {
        String stored = getRefresh(farmerId);
        if (stored == null || !stored.equals(refreshToken)) {
            throw AppException.unauthorized("Refresh token is invalid or has expired");
        }
        UUID id = UUID.fromString(farmerId);
        String newAccess = jwtUtil.generateAccessToken(id);
        String newRefresh = UUID.randomUUID().toString();
        storeRefresh(farmerId, newRefresh);
        return new TokenResponse(newAccess, newRefresh, farmerId);
    }

    public void logout(String farmerId) {
        deleteRefresh(farmerId);
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    public Farmer getProfile(UUID farmerId) {
        return farmerRepository.findById(farmerId)
            .orElseThrow(() -> AppException.notFound("Farmer not found"));
    }

    @Transactional
    public Farmer updateProfile(UUID farmerId, FarmerProfileRequest req) {
        Farmer farmer = getProfile(farmerId);
        if (req.getName() != null) farmer.setName(req.getName());
        if (req.getPreferredLang() != null) farmer.setPreferredLang(req.getPreferredLang());
        if (req.getVillage() != null) farmer.setVillage(req.getVillage());
        if (req.getDistrict() != null) farmer.setDistrict(req.getDistrict());
        if (req.getState() != null) farmer.setState(req.getState());
        if (req.getLandSizeAcres() != null) farmer.setLandSizeAcres(req.getLandSizeAcres());
        return farmerRepository.save(farmer);
    }
}
