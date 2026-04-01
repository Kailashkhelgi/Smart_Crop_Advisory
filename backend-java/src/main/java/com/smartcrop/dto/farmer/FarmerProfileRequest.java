package com.smartcrop.dto.farmer;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class FarmerProfileRequest {
    private String name;
    private String preferredLang;
    private String village;
    private String district;
    private String state;
    private BigDecimal landSizeAcres;
}
