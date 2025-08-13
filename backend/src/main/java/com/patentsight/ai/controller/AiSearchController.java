package com.patentsight.ai.controller;

import com.patentsight.ai.dto.TrademarkSearchResponse;
import com.patentsight.ai.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/ai/search/trademark")
@RequiredArgsConstructor
public class AiSearchController {

    private final SearchService searchService;

    @PostMapping("/image")
    public ResponseEntity<TrademarkSearchResponse> searchByImage(@RequestParam("file") MultipartFile file) {
        TrademarkSearchResponse response = searchService.searchTrademarkByImage(file);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/text")
    public ResponseEntity<TrademarkSearchResponse> searchByText(@RequestParam("text") String text) {
        TrademarkSearchResponse response = searchService.searchTrademarkByText(text);
        return ResponseEntity.ok(response);
    }
}