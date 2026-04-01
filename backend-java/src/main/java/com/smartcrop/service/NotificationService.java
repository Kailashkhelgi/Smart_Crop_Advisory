package com.smartcrop.service;

import com.smartcrop.config.AppProperties;
import com.smartcrop.model.Farmer;
import com.smartcrop.model.Notification;
import com.smartcrop.repository.FarmerRepository;
import com.smartcrop.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final FarmerRepository farmerRepository;
    private final NotificationRepository notificationRepository;
    private final AppProperties appProperties;
    private final RestTemplate restTemplate;

    public void sendWeatherAlert(UUID farmerId, String alertType, Map<String, Object> payload) {
        Farmer farmer = farmerRepository.findById(farmerId).orElse(null);
        if (farmer == null) return;

        if (farmer.getFcmToken() != null) {
            String title = "frost_alert".equals(alertType) ? "Frost Alert" : "Weather Alert";
            String body = "frost_alert".equals(alertType)
                ? "Frost risk detected for your location. Take protective action."
                : "Heavy rainfall forecast for your location. Take protective action.";

            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("Authorization", "key=" + appProperties.getFcm().getServerKey());

                Map<String, Object> fcmBody = new HashMap<>();
                fcmBody.put("to", farmer.getFcmToken());
                fcmBody.put("notification", Map.of("title", title, "body", body));
                fcmBody.put("data", payload);

                restTemplate.postForEntity("https://fcm.googleapis.com/fcm/send",
                    new HttpEntity<>(fcmBody, headers), Map.class);
            } catch (Exception e) {
                log.error("FCM push failed for farmer {}: {}", farmerId, e.getMessage());
            }
        }

        notificationRepository.save(Notification.builder()
            .farmer(farmer)
            .type(alertType)
            .payload(payload)
            .build());
    }

    public List<Notification> getNotifications(UUID farmerId) {
        return notificationRepository.findAllByFarmerIdOrderBySentAtDesc(farmerId);
    }
}
