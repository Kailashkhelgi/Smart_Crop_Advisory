package com.smartcrop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SmartCropAdvisoryApplication {
    public static void main(String[] args) {
        SpringApplication.run(SmartCropAdvisoryApplication.class, args);
    }
}
