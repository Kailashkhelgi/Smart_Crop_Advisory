package com.smartcrop.advisory.service;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class FertilizerAdvisoryService {

    private record FertEntry(String type, double qty, String unit, String timing) {}
    private record CropFert(double phMin, double phMax,
                             List<FertEntry> schedule, List<FertEntry> organic) {}

    private static final Map<String, CropFert> DB = Map.of(
        "wheat", new CropFert(6.0, 7.5,
            List.of(new FertEntry("DAP", 50, "kg/acre", "At sowing"),
                    new FertEntry("MOP", 20, "kg/acre", "At sowing"),
                    new FertEntry("Urea", 55, "kg/acre", "21 days after sowing")),
            List.of(new FertEntry("FYM", 4, "bags/acre", "2 weeks before sowing"),
                    new FertEntry("Vermicompost", 2, "bags/acre", "At sowing"))),
        "rice", new CropFert(5.5, 7.0,
            List.of(new FertEntry("Urea", 55, "kg/acre", "At transplanting"),
                    new FertEntry("DAP", 25, "kg/acre", "At transplanting"),
                    new FertEntry("MOP", 20, "kg/acre", "At transplanting")),
            List.of(new FertEntry("FYM", 4, "bags/acre", "2 weeks before transplanting"),
                    new FertEntry("Green Manure", 8, "kg/acre", "45 days before")))
    );

    private static final CropFert DEFAULT = new CropFert(6.0, 7.5,
        List.of(new FertEntry("DAP", 25, "kg/acre", "At sowing"),
                new FertEntry("Urea", 35, "kg/acre", "30 days after sowing")),
        List.of(new FertEntry("FYM", 4, "bags/acre", "2 weeks before sowing")));

    public Map<String, Object> getFertilizerSchedule(String crop, double ph) {
        CropFert data = DB.getOrDefault(crop.toLowerCase(), DEFAULT);

        List<Map<String, Object>> schedule = toList(data.schedule());
        List<Map<String, Object>> organic = toList(data.organic());
        List<Map<String, Object>> amendments = new ArrayList<>();

        if (ph < 6.0) {
            double qty = Math.round((6.0 - ph) * 100 * 10.0) / 10.0;
            Map<String, Object> a = new java.util.HashMap<>();
            a.put("type", "Agricultural Lime (CaCO3)"); a.put("quantity", qty);
            a.put("unit", "kg/acre"); a.put("reason", "Soil pH " + ph + " is below optimal range. Lime will raise pH.");
            amendments.add(a);
        } else if (ph > 7.5) {
            double qty = Math.round((ph - 7.5) * 20 * 10.0) / 10.0;
            Map<String, Object> a = new java.util.HashMap<>();
            a.put("type", "Elemental Sulfur"); a.put("quantity", qty);
            a.put("unit", "kg/acre"); a.put("reason", "Soil pH " + ph + " is above optimal range. Sulfur will lower pH.");
            amendments.add(a);
        }

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("schedule", schedule);
        result.put("organicAlternatives", organic);
        result.put("soilAmendments", amendments);
        return result;
    }

    private List<Map<String, Object>> toList(List<FertEntry> entries) {
        return entries.stream().map(e -> {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("type", e.type());
            m.put("quantity", e.qty());
            m.put("unit", e.unit());
            m.put("timing", e.timing());
            return m;
        }).toList();
    }
}
