package com.smartcrop.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "advisory_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdvisorySession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "farmer_hash", nullable = false, length = 64)
    private String farmerHash;

    @Column(name = "session_type", nullable = false, length = 30)
    private String sessionType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_params", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> inputParams;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "recommendation", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> recommendation;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
