package com.patentsight.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClaimDraftDetails {
    private String draftId;
    private String content;
    private String status;
    private String message;
}
