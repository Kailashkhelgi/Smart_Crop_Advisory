package com.smartcrop.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefreshRequest {
    @NotBlank private String farmerId;
    @NotBlank private String refreshToken;
}
