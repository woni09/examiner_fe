package com.patentsight.ai.controller;

import com.patentsight.ai.dto.DraftDetailResponse;
import com.patentsight.ai.dto.DraftListResponse;
import com.patentsight.ai.dto.DraftUpdateRequest;
import com.patentsight.ai.service.AiService;
import com.patentsight.ai.service.DraftService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiDraftController {

    private final AiService aiService;
    private final DraftService draftService;

    // ✅ 1. 초안 생성 (거절)
    @PostMapping("/draft/rejections")
    public DraftDetailResponse generateRejectionDraft(@RequestBody RejectionDraftRequest request) {
        return aiService.generateRejectionDraft(request.getPatentId(), request.getFileId());
    }

    // ✅ 2. 초안 목록 조회
    @GetMapping("/drafts")
    public List<DraftListResponse> getDrafts(@RequestParam("patent_id") Long patentId) {
        return draftService.getDrafts(patentId);
    }

    // ✅ 3. 초안 상세 조회
    @GetMapping("/draft/{draftId}")
    public DraftDetailResponse getDraft(@PathVariable Long draftId) {
        return draftService.getDraft(draftId);
    }

    // ✅ 4. 초안 수정
    @PatchMapping("/draft/{draftId}")
    public DraftDetailResponse updateDraft(@PathVariable Long draftId,
                                           @RequestBody DraftUpdateRequest request) {
        return draftService.updateDraft(draftId, request.getContent());
    }

    // ✅ 5. 초안 삭제
    @DeleteMapping("/draft/{draftId}")
    public void deleteDraft(@PathVariable Long draftId) {
        draftService.deleteDraft(draftId);
    }

    // 요청 DTO
    public static class RejectionDraftRequest {
        private Long patentId;
        private Long fileId;

        public Long getPatentId() {
            return patentId;
        }

        public void setPatentId(Long patentId) {
            this.patentId = patentId;
        }

        public Long getFileId() {
            return fileId;
        }

        public void setFileId(Long fileId) {
            this.fileId = fileId;
        }
    }
}
