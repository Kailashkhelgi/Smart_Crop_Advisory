package com.smartcrop.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "mobileNumber is required")
    private String mobileNumber;
}
