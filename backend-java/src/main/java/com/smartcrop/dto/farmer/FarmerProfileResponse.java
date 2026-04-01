package com.smartcrop.dto.farmer;

import com.smartcrop.model.Farmer;
import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class FarmerProfileResponse {
    private UUID id;
    private String mobileNumber;
    private String name;
    private String preferredLang;
    private String village;
    private String district;
    private String state;
    private BigDecimal landSizeAcres;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public static FarmerProfileResponse from(Farmer f) {
        FarmerProfileResponse r = new FarmerProfileResponse();
        r.setId(f.getId());
        r.setMobileNumber(f.getMobileNumber());
        r.setName(f.getName());
        r.setPreferredLang(f.getPreferredLang());
        r.setVillage(f.getVillage());
        r.setDistrict(f.getDistrict());
        r.setState(f.getState());
        r.setLandSizeAcres(f.getLandSizeAcres());
        r.setCreatedAt(f.getCreatedAt());
        r.setUpdatedAt(f.getUpdatedAt());
        return r;
    }
}
