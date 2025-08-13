package com.patentsight.ai.util;

import com.patentsight.ai.dto.ClaimDraftDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ClaimDraftClient {
    
    public ClaimDraftDetails generateClaimDraft(String query, Integer topK) {
        // TODO: 실제 AI 서비스 연동
        return ClaimDraftDetails.builder()
                .draftId("draft-" + System.currentTimeMillis())
                .content("Generated claim draft for: " + query)
                .status("COMPLETED")
                .message("Successfully generated claim draft")
                .build();
    }
}
