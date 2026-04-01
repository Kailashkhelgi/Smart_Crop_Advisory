package com.smartcrop.dto.soil;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class SoilProfileRequest {
    private String plotName;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String soilType;
    private BigDecimal ph;
    private BigDecimal nitrogen;
    private BigDecimal phosphorus;
    private BigDecimal potassium;
}
