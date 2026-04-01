package com.smartcrop.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Jwt jwt = new Jwt();
    private String advisoryEngineUrl;
    private String visionEngineUrl;
    private Otp otp = new Otp();
    private Weather weather = new Weather();
    private Market market = new Market();
    private Google google = new Google();
    private Fcm fcm = new Fcm();

    @Data
    public static class Jwt {
        private String secret;
        private long expirationMs;
        private long refreshExpirationMs;
    }

    @Data
    public static class Otp {
        private Otp.Provider provider = new Provider();

        @Data
        public static class Provider {
            private String apiKey;
            private String senderId;
        }
    }

    @Data
    public static class Weather {
        private String apiKey;
    }

    @Data
    public static class Market {
        private String apiKey;
        private String apiUrl;
    }

    @Data
    public static class Google {
        private String apiKey;
    }

    @Data
    public static class Fcm {
        private String serverKey;
    }
}
