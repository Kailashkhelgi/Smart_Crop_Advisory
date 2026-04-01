package com.smartcrop.advisory.model;

import lombok.Data;
import java.util.List;

@Data
public class CropAdvisoryRequest {
    private SoilProfile soilProfile;
    private Location location;
    private String season;
    private List<String> cropHistory = List.of();

    @Data
    public static class Location {
        private double lat;
        private double lon;
    }
}
