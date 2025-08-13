package com.patentsight.ai.controller;

import com.patentsight.ai.dto.AiCheckRequest;
import com.patentsight.ai.dto.AiCheckResponse;
import com.patentsight.ai.service.ValidationService; // 다음 단계에 만들 서비스
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// ... import 구문
import org.springframework.web.bind.annotation.PathVariable; // PathVariable import

@RestController
@RequiredArgsConstructor
public class AiValidationController {

    private final ValidationService validationService;

    // 기존 엔드포인트 (JSON 직접 받기)
    @PostMapping("/api/ai/validations")
    public ResponseEntity<AiCheckResponse> validateDocumentByBody(@RequestBody AiCheckRequest request) {
        AiCheckResponse response = validationService.validateDocument(request);
        return ResponseEntity.ok(response);
    }

    // --- 새로 추가할 엔드포인트 (ID로 검증하기) ---
    @PostMapping("/api/ai/patents/{id}/validate")
    public ResponseEntity<AiCheckResponse> validateDocumentById(@PathVariable("id") Long patentId) {
        AiCheckResponse response = validationService.validateDocument(patentId);
        return ResponseEntity.ok(response);
    }
}