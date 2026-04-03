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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private static final BCryptPasswordEncoder BCRYPT = new BCryptPasswordEncoder();
    private static final Map<String, String> REFRESH_STORE = new ConcurrentHashMap<>();

    // ── Register ──────────────────────────────────────────────────────────────

    @Transactional
    public TokenResponse register(String mobileNumber, String password) {
        if (farmerRepository.findByMobileNumber(mobileNumber).isPresent()) {
            throw new AppException("ALREADY_REGISTERED", "Mobile number already registered", HttpStatus.CONFLICT);
        }
        String hash = BCRYPT.encode(password);
        Farmer farmer = farmerRepository.save(
            Farmer.builder().mobileNumber(mobileNumber).passwordHash(hash).build()
        );
        return issueTokens(farmer);
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    public TokenResponse login(String mobileNumber, String password) {
        Farmer farmer = farmerRepository.findByMobileNumber(mobileNumber)
            .orElseThrow(() -> new AppException("NOT_FOUND", "Mobile number not registered", HttpStatus.UNAUTHORIZED));

        if (farmer.getPasswordHash() == null || !BCRYPT.matches(password, farmer.getPasswordHash())) {
            throw new AppException("INVALID_CREDENTIALS", "Invalid mobile number or password", HttpStatus.UNAUTHORIZED);
        }
        return issueTokens(farmer);
    }

    // ── Token helpers ─────────────────────────────────────────────────────────

    private TokenResponse issueTokens(Farmer farmer) {
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

    // ── Redis / in-memory refresh store ──────────────────────────────────────

    private void storeRefresh(String farmerId, String token) {
        try {
            long ms = appProperties.getJwt().getRefreshExpirationMs();
            redis.opsForValue().set("refresh:" + farmerId, token, Duration.ofMillis(ms));
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
