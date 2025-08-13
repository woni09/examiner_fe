package com.patentsight.ai.dto;

import com.patentsight.ai.domain.DraftType;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DraftListResponse {
    private Long draftId;
    private DraftType type;
    private String content;
}
