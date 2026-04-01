package com.smartcrop.advisory.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CropRecommendation {
    private String name;
    private YieldRange yieldRange;
    private String waterRequirement;
    private double estimatedInputCost;

    @Data
    @AllArgsConstructor
    public static class YieldRange {
        private double min;
        private double max;
    }
}
