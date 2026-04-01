package com.smartcrop.service;

import com.smartcrop.dto.soil.SoilProfileRequest;
import com.smartcrop.exception.AppException;
import com.smartcrop.model.Farmer;
import com.smartcrop.model.SoilProfile;
import com.smartcrop.repository.FarmerRepository;
import com.smartcrop.repository.SoilProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SoilProfileService {

    private final SoilProfileRepository soilProfileRepository;
    private final FarmerRepository farmerRepository;

    @Transactional
    public SoilProfile create(UUID farmerId, SoilProfileRequest req) {
        validate(req);
        Farmer farmer = farmerRepository.findById(farmerId)
            .orElseThrow(() -> AppException.notFound("Farmer not found"));

        SoilProfile profile = SoilProfile.builder()
            .farmer(farmer)
            .plotName(req.getPlotName())
            .latitude(req.getLatitude())
            .longitude(req.getLongitude())
            .soilType(req.getSoilType())
            .ph(req.getPh())
            .nitrogen(req.getNitrogen())
            .phosphorus(req.getPhosphorus())
            .potassium(req.getPotassium())
            .build();

        return soilProfileRepository.save(profile);
    }

    public SoilProfile get(UUID profileId, UUID farmerId) {
        return soilProfileRepository.findByIdAndFarmerId(profileId, farmerId)
            .orElseThrow(() -> AppException.notFound("Soil profile not found"));
    }

    @Transactional
    public SoilProfile update(UUID profileId, UUID farmerId, SoilProfileRequest req) {
        validate(req);
        SoilProfile profile = get(profileId, farmerId);

        if (req.getPlotName() != null) profile.setPlotName(req.getPlotName());
        if (req.getLatitude() != null) profile.setLatitude(req.getLatitude());
        if (req.getLongitude() != null) profile.setLongitude(req.getLongitude());
        if (req.getSoilType() != null) profile.setSoilType(req.getSoilType());
        if (req.getPh() != null) profile.setPh(req.getPh());
        if (req.getNitrogen() != null) profile.setNitrogen(req.getNitrogen());
        if (req.getPhosphorus() != null) profile.setPhosphorus(req.getPhosphorus());
        if (req.getPotassium() != null) profile.setPotassium(req.getPotassium());

        return soilProfileRepository.save(profile);
    }

    private void validate(SoilProfileRequest req) {
        if (req.getPh() != null) {
            if (req.getPh().compareTo(BigDecimal.ZERO) < 0 || req.getPh().compareTo(new BigDecimal("14")) > 0) {
                throw AppException.validation("pH must be between 0 and 14", "ph");
            }
        }
        if (req.getNitrogen() != null && req.getNitrogen().compareTo(BigDecimal.ZERO) < 0) {
            throw AppException.validation("nitrogen must be a non-negative number", "nitrogen");
        }
        if (req.getPhosphorus() != null && req.getPhosphorus().compareTo(BigDecimal.ZERO) < 0) {
            throw AppException.validation("phosphorus must be a non-negative number", "phosphorus");
        }
        if (req.getPotassium() != null && req.getPotassium().compareTo(BigDecimal.ZERO) < 0) {
            throw AppException.validation("potassium must be a non-negative number", "potassium");
        }
    }
}
