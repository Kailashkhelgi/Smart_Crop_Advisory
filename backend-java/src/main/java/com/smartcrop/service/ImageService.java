package com.smartcrop.service;

import com.smartcrop.config.AppProperties;
import com.smartcrop.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ImageService {

    private static final long MAX_SIZE = 10L * 1024 * 1024;
    private final AppProperties appProperties;
    private final RestTemplate restTemplate;

    @SuppressWarnings("unchecked")
    public Map<String, Object> analyze(MultipartFile file) throws IOException {
        String mime = file.getContentType();
        if (!"image/jpeg".equals(mime) && !"image/png".equals(mime)) {
            throw new AppException("UNSUPPORTED_MEDIA_TYPE",
                "Unsupported file type. Accepted formats: image/jpeg, image/png",
                HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        }
        if (file.getSize() > MAX_SIZE) {
            throw new AppException("PAYLOAD_TOO_LARGE",
                "File too large. Maximum allowed size is 10 MB",
                HttpStatus.PAYLOAD_TOO_LARGE);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override public String getFilename() { return file.getOriginalFilename(); }
        };
        body.add("image", resource);

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                appProperties.getVisionEngineUrl() + "/internal/vision/analyze",
                request, Map.class);
            return response.getBody();
        } catch (ResourceAccessException e) {
            throw AppException.serviceUnavailable("VISION_ENGINE_UNAVAILABLE",
                "Vision Engine is currently unavailable");
        }
    }
}
