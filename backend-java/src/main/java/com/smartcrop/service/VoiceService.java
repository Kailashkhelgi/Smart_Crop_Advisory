package com.smartcrop.service;

import com.smartcrop.config.AppProperties;
import com.smartcrop.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VoiceService {

    private static final Map<String, String> LANG_CODES = Map.of(
        "en", "en-IN", "hi", "hi-IN", "pa", "pa-IN"
    );

    private final AppProperties appProperties;
    private final RestTemplate restTemplate;

    @SuppressWarnings("unchecked")
    public Map<String, Object> speechToText(byte[] audioBytes, String language) {
        String langCode = LANG_CODES.getOrDefault(language, "en-IN");
        String audioContent = Base64.getEncoder().encodeToString(audioBytes);

        Map<String, Object> body = new HashMap<>();
        body.put("config", Map.of("languageCode", langCode, "encoding", "WEBM_OPUS"));
        body.put("audio", Map.of("content", audioContent));

        try {
            String url = "https://speech.googleapis.com/v1/speech:recognize?key="
                + appProperties.getGoogle().getApiKey();
            Map<String, Object> response = restTemplate.postForObject(url, body, Map.class);

            if (response != null && response.containsKey("results")) {
                var results = (java.util.List<?>) response.get("results");
                if (!results.isEmpty()) {
                    var first = (Map<?, ?>) results.get(0);
                    var alts = (java.util.List<?>) first.get("alternatives");
                    if (alts != null && !alts.isEmpty()) {
                        String transcript = (String) ((Map<?, ?>) alts.get(0)).get("transcript");
                        if (transcript != null && !transcript.isBlank()) {
                            return Map.of("transcript", transcript, "unrecognized", false);
                        }
                    }
                }
            }
        } catch (Exception e) {
            throw new AppException("STT_ERROR", "Speech-to-text service failed",
                HttpStatus.SERVICE_UNAVAILABLE);
        }

        return Map.of("transcript", "", "unrecognized", true,
            "retryPrompt", "Could not recognize speech. Please try again.",
            "textFallback", true);
    }

    public byte[] textToSpeech(String text, String language) {
        String langCode = LANG_CODES.getOrDefault(language, "en-IN");

        Map<String, Object> body = new HashMap<>();
        body.put("input", Map.of("text", text));
        body.put("voice", Map.of("languageCode", langCode, "ssmlGender", "NEUTRAL"));
        body.put("audioConfig", Map.of("audioEncoding", "MP3"));

        try {
            String url = "https://texttospeech.googleapis.com/v1/text:synthesize?key="
                + appProperties.getGoogle().getApiKey();
            Map<?, ?> response = restTemplate.postForObject(url, body, Map.class);
            if (response != null && response.containsKey("audioContent")) {
                return Base64.getDecoder().decode((String) response.get("audioContent"));
            }
        } catch (Exception e) {
            throw new AppException("TTS_ERROR", "Text-to-speech service failed",
                HttpStatus.SERVICE_UNAVAILABLE);
        }
        throw new AppException("TTS_ERROR", "No audio content returned",
            HttpStatus.SERVICE_UNAVAILABLE);
    }
}
