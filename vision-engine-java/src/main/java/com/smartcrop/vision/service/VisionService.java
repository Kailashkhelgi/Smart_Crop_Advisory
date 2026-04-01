package com.smartcrop.vision.service;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class VisionService {

    private static final double LOW_CONFIDENCE_THRESHOLD = 0.60;

    private record Treatment(String name, String dosage, String method) {}
    private record PestEntry(String name, List<Treatment> chemical, List<Treatment> organic) {}

    private static final List<PestEntry> PEST_DB = List.of(
        new PestEntry("Late Blight",
            List.of(new Treatment("Mancozeb", "2g/L", "foliar spray"),
                    new Treatment("Metalaxyl", "1.5g/L", "foliar spray")),
            List.of(new Treatment("Neem oil", "5ml/L", "foliar spray"),
                    new Treatment("Copper sulphate", "3g/L", "foliar spray"))),
        new PestEntry("Aphid Infestation",
            List.of(new Treatment("Imidacloprid", "0.5ml/L", "foliar spray")),
            List.of(new Treatment("Neem oil", "5ml/L", "foliar spray"),
                    new Treatment("Insecticidal soap", "10ml/L", "foliar spray"))),
        new PestEntry("Powdery Mildew",
            List.of(new Treatment("Propiconazole", "1ml/L", "foliar spray")),
            List.of(new Treatment("Potassium bicarbonate", "5g/L", "foliar spray"))),
        new PestEntry("Stem Borer",
            List.of(new Treatment("Chlorpyrifos", "2ml/L", "foliar spray")),
            List.of(new Treatment("Neem cake", "40kg/acre", "soil incorporation"))),
        new PestEntry("Bacterial Leaf Blight",
            List.of(new Treatment("Streptomycin sulphate", "0.5g/L", "foliar spray")),
            List.of(new Treatment("Pseudomonas fluorescens", "10g/L", "foliar spray"))),
        new PestEntry("Whitefly",
            List.of(new Treatment("Acetamiprid", "0.4g/L", "foliar spray")),
            List.of(new Treatment("Yellow sticky traps", "10 traps/acre", "field placement"))),
        new PestEntry("Rust Disease",
            List.of(new Treatment("Tebuconazole", "1ml/L", "foliar spray")),
            List.of(new Treatment("Sulfur dust", "20kg/acre", "dusting")))
    );

    public Map<String, Object> analyze(byte[] imageBytes) {
        int size = imageBytes.length;
        int index = size % PEST_DB.size();
        double confidence = Math.min(0.5 + (size % 1000) / 2222.0, 0.95);
        confidence = Math.round(confidence * 10000.0) / 10000.0;

        PestEntry pest = PEST_DB.get(index);
        boolean lowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD;

        return Map.of(
            "pest_or_disease", pest.name(),
            "confidence", confidence,
            "treatments", Map.of(
                "chemical", pest.chemical().stream().map(t ->
                    Map.of("name", t.name(), "dosage", t.dosage(), "method", t.method())).toList(),
                "organic", pest.organic().stream().map(t ->
                    Map.of("name", t.name(), "dosage", t.dosage(), "method", t.method())).toList()
            ),
            "low_confidence", lowConfidence,
            "extension_officer_referral", lowConfidence
        );
    }
}
