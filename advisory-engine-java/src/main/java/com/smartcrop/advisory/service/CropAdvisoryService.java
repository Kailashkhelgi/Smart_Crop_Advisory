package com.smartcrop.advisory.service;

import com.smartcrop.advisory.model.CropAdvisoryRequest;
import com.smartcrop.advisory.model.CropRecommendation;
import com.smartcrop.advisory.model.SoilProfile;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class CropAdvisoryService {

    private record CropEntry(String name, List<String> seasons, List<String> soilTypes,
                              double phMin, double phMax, double yieldMin, double yieldMax,
                              String waterReq, double inputCost) {}

    private static final List<CropEntry> CROP_DB = List.of(
        new CropEntry("rice",     List.of("kharif"),         List.of("clay","loamy","alluvial"),       5.5, 7.0, 18, 28, "high",   18000),
        new CropEntry("wheat",    List.of("rabi"),            List.of("loamy","clay","alluvial"),       6.0, 7.5, 16, 24, "medium", 14000),
        new CropEntry("maize",    List.of("kharif","rabi","zaid"), List.of("loamy","sandy loam"),      5.8, 7.0, 14, 22, "medium", 12000),
        new CropEntry("cotton",   List.of("kharif"),         List.of("black","loamy","alluvial"),      6.0, 8.0,  8, 14, "medium", 22000),
        new CropEntry("mustard",  List.of("rabi"),            List.of("loamy","sandy loam"),           6.0, 7.5,  6, 10, "low",     8000),
        new CropEntry("chickpea", List.of("rabi"),            List.of("loamy","sandy loam","black"),   6.0, 8.0,  5,  9, "low",     7000),
        new CropEntry("moong",    List.of("zaid","kharif"),   List.of("loamy","sandy loam"),           6.0, 7.5,  4,  7, "low",     6000),
        new CropEntry("sugarcane",List.of("kharif","zaid"),   List.of("loamy","alluvial","clay"),      6.0, 7.5,250,400, "high",   35000)
    );

    public List<CropRecommendation> recommend(CropAdvisoryRequest req) {
        SoilProfile soil = req.getSoilProfile();
        String season = req.getSeason().toLowerCase();
        List<String> history = req.getCropHistory().stream().map(String::toLowerCase).toList();

        List<Map.Entry<Double, CropEntry>> scored = new ArrayList<>();
        for (CropEntry crop : CROP_DB) {
            double score = score(crop, soil, season);
            scored.add(Map.entry(score, crop));
        }
        scored.sort((a, b) -> Double.compare(b.getKey(), a.getKey()));

        List<CropRecommendation> recs = new ArrayList<>();
        for (var entry : scored) {
            CropEntry c = entry.getValue();
            recs.add(new CropRecommendation(c.name(),
                new CropRecommendation.YieldRange(c.yieldMin(), c.yieldMax()),
                c.waterReq(), c.inputCost()));
        }

        // Crop rotation: demote last grown crop from top position
        if (!history.isEmpty()) {
            String last = history.get(history.size() - 1);
            if (!recs.isEmpty() && recs.get(0).getName().equalsIgnoreCase(last)) {
                CropRecommendation demoted = recs.remove(0);
                recs.add(Math.min(1, recs.size()), demoted);
            }
        }

        return recs;
    }

    private double score(CropEntry crop, SoilProfile soil, String season) {
        double s = 0;
        if (crop.seasons().contains(season)) s += 40;
        else s -= 100;

        String soilLower = soil.getType().toLowerCase();
        if (crop.soilTypes().stream().anyMatch(t -> soilLower.contains(t) || t.contains(soilLower))) s += 20;

        double ph = soil.getPh();
        if (ph >= crop.phMin() && ph <= crop.phMax()) s += 20;
        else s -= Math.min(Math.abs(ph - crop.phMin()), Math.abs(ph - crop.phMax())) * 5;

        s += Math.min((soil.getN() + soil.getP() + soil.getK()) / 300.0, 10);
        return s;
    }
}
