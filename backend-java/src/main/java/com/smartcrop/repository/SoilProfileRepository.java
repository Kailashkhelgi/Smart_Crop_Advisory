package com.smartcrop.repository;

import com.smartcrop.model.SoilProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SoilProfileRepository extends JpaRepository<SoilProfile, UUID> {
    Optional<SoilProfile> findByIdAndFarmerId(UUID id, UUID farmerId);
    List<SoilProfile> findAllByFarmerId(UUID farmerId);
}
