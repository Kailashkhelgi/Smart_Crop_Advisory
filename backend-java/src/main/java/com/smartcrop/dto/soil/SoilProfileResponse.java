package com.smartcrop.dto.soil;

import com.smartcrop.model.SoilProfile;
import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class SoilProfileResponse {
    private UUID id;
    private UUID farmerId;
    private String plotName;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String soilType;
    private BigDecimal ph;
    private BigDecimal nitrogen;
    private BigDecimal phosphorus;
    private BigDecimal potassium;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public static SoilProfileResponse from(SoilProfile s) {
        SoilProfileResponse r = new SoilProfileResponse();
        r.setId(s.getId());
        r.setFarmerId(s.getFarmer().getId());
        r.setPlotName(s.getPlotName());
        r.setLatitude(s.getLatitude());
        r.setLongitude(s.getLongitude());
        r.setSoilType(s.getSoilType());
        r.setPh(s.getPh());
        r.setNitrogen(s.getNitrogen());
        r.setPhosphorus(s.getPhosphorus());
        r.setPotassium(s.getPotassium());
        r.setCreatedAt(s.getCreatedAt());
        r.setUpdatedAt(s.getUpdatedAt());
        return r;
    }
}
