package com.smartcrop.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "mobileNumber is required")
    private String mobileNumber;

    @NotBlank(message = "password is required")
    private String password;
}
