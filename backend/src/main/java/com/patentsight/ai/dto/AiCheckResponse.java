package com.patentsight.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.List;

// FastAPI 응답에 있지만 우리 DTO에는 없는 필드를 무시하는 설정
@JsonIgnoreProperties(ignoreUnknown = true)
@Getter
@NoArgsConstructor // JSON <-> 객체 변환을 위해 기본 생성자가 반드시 필요합니다.
public class AiCheckResponse {

    // FastAPI 응답의 Key와 똑같은 이름의 필드들을 만듭니다.
    private List<FormatError> formatErrors;
    private List<MissingSection> missingSections;
    private List<ContextualError> contextualErrors;

    // --- 각 오류 목록에 맞는 내부 클래스들을 정의합니다. ---

    @JsonIgnoreProperties(ignoreUnknown = true)
    @Getter
    @NoArgsConstructor
    public static class FormatError {
        private String id;
        private String message;
        private String field;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    @Getter
    @NoArgsConstructor
    public static class MissingSection {
        private String id;
        private String message;
        private String field;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    @Getter
    @NoArgsConstructor
    public static class ContextualError {
        private String id;
        private String claim;
        private int claimIndex;
        private String field;
        private String analysis;
        private String suggestion;
    }
}