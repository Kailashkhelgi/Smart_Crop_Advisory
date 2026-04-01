package com.smartcrop.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "soil_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SoilProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id", nullable = false)
    private Farmer farmer;

    @Column(name = "plot_name", length = 100)
    private String plotName;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "soil_type", length = 50)
    private String soilType;

    @Column(precision = 4, scale = 2)
    private BigDecimal ph;

    @Column(precision = 8, scale = 2)
    private BigDecimal nitrogen;

    @Column(precision = 8, scale = 2)
    private BigDecimal phosphorus;

    @Column(precision = 8, scale = 2)
    private BigDecimal potassium;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
