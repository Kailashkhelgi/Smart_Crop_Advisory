package com.smartcrop.repository;

import com.smartcrop.model.Farmer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface FarmerRepository extends JpaRepository<Farmer, UUID> {
    Optional<Farmer> findByMobileNumber(String mobileNumber);
    boolean existsByMobileNumber(String mobileNumber);
}
