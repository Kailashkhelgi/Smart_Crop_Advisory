package com.smartcrop.advisory.model;

import lombok.Data;

@Data
public class SoilProfile {
    private String type;
    private double ph;
    private double n;
    private double p;
    private double k;
}
