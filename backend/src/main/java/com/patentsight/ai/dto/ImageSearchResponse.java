package com.patentsight.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageSearchResponse {
    private String searchId;
    private String status;
    private List<SearchResult> results;
    private String message;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchResult {
        private String id;
        private String title;
        private String description;
        private Double similarity;
        private String imageUrl;
    }
}
