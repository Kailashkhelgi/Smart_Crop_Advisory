package com.smartcrop.controller;

import com.smartcrop.dto.ApiResponse;
import com.smartcrop.service.VoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/voice")
@RequiredArgsConstructor
public class VoiceController {

    private final VoiceService voiceService;

    @PostMapping("/stt")
    public ResponseEntity<ApiResponse<Map<String, Object>>> stt(
            Authentication auth,
            @RequestParam("audio") MultipartFile audio,
            @RequestParam(defaultValue = "en") String language) throws IOException {
        return ResponseEntity.ok(ApiResponse.success(
            voiceService.speechToText(audio.getBytes(), language)));
    }

    @PostMapping("/tts")
    public ResponseEntity<byte[]> tts(
            Authentication auth,
            @RequestBody Map<String, String> body) {
        String text = body.get("text");
        String language = body.getOrDefault("language", "en");
        byte[] audio = voiceService.textToSpeech(text, language);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("audio/mpeg"))
            .body(audio);
    }
}
