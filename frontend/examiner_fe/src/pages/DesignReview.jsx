import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Palette, Info, Image, MessageSquare, Copy, FlaskConical,
  CheckCircle, Send, Bot, Lightbulb, GanttChart, Scale, X, FileText, ScrollText, Check, Upload
} from 'lucide-react';

// API 함수들을 각 모듈에서 임포트합니다.
import { submitReview, getReviewDetail } from '../api/review';
import { 
  startChatSession, 
  sendChatMessageToServer, 
  validatePatentDocument, 
  analyzeImageSimilarity, 
  generate3DModel,
  generateRejectionDraft,
  searchDesignImage // 디자인 이미지 검색 API 임포트
} from '../api/ai';

// 가상의 3D 모델 뷰어 컴포넌트
const ThreeDModelViewer = ({ glbPath }) => {
  return (
    <div className="w-full h-72 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center border border-gray-300">
      <p className="text-gray-600 text-sm font-medium">3D 모델 뷰어: {glbPath}</p>
    </div>
  );
};

export default function DesignReview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedAction, setSelectedAction] = useState('document');
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionComment, setRejectionComment] = useState('');
  const [status, setStatus] = useState('심사대기');
  const [approvalDocumentText, setApprovalDocumentText] = useState('');

  // 챗봇 관련 상태
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(null);

  // 커스텀 메시지 박스 상태
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // AI 기능 관련 상태
  const [similarityResults, setSimilarityResults] = useState([]);
  const [threeDModelPath, setThreeDModelPath] = useState('');
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSearchingSimilarity, setIsSearchingSimilarity] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [designImageUrl, setDesignImageUrl] = useState('');


  const quickQuestions = [
    { id: 'q1', text: '유사 디자인', icon: Copy, query: '이 디자인과 유사한 디자인을 찾아줘' },
    { id: 'q2', text: '심미성 분석', icon: Lightbulb, query: '이 디자인의 심미성에 대해 분석해줘' },
    { id: 'q3', text: '법적 근거', icon: Scale, query: '디자인 등록 거절에 대한 법적 근거는 뭐야?' },
    { id: 'q4', text: '심사 기준', icon: GanttChart, query: '디자인 심사 기준에 대해 알려줘' },
  ];

  useEffect(() => {
    const fetchReviewData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getReviewDetail(id);
        setDesign(data);
        setDesignImageUrl(data.drawingImageUrl || 'https://placehold.co/400x300.png?text=No+Image');

        let translatedStatus = '';
        switch (data.decision) {
          case 'APPROVE':
            translatedStatus = '심사완료';
            setSelectedAction('approval');
            setApprovalDocumentText(data.comment || '최종 등록 승인됨.');
            break;
          case 'REJECT':
            translatedStatus = '거절';
            setSelectedAction('rejection');
            setRejectionComment(data.comment);
            break;
          case 'PENDING':
          default:
            if (data.comment && data.comment.trim() !== '') {
              translatedStatus = '심사중';
              setApprovalComment(data.comment);
            } else {
              translatedStatus = '심사대기';
            }
            break;
        }
        setStatus(translatedStatus);
        
        // 페이지 로드 시 AI 유사 디자인 분석 자동 실행
        // 실제 이미지를 가져오는 URL이 있다고 가정
        if (designImageUrl) {
            handleSimilaritySearch(designImageUrl);
        }

      } catch (error) {
        console.error('심사 상세 정보 조회 실패:', error);
        showMessageBox('심사 정보를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchReviewData();
  }, [id, navigate]);

  const sendChatMessage = async (message = inputMessage) => {
    if (!message.trim() || !design || !design.patentId) {
      console.error("Cannot send message: design data or patentId is missing.");
      const errorMessage = {
        id: crypto.randomUUID(),
        type: 'bot',
        message: "오류: 디자인 정보가 올바르지 않아 AI와 대화를 시작할 수 없습니다.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
      return;
    }

    const newUserMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      message: message,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsTyping(true);

    const messagePayload = {
      message: message,
      requested_features: ['similarity', 'check']
    };
    
    try {
      let currentSessionId = chatSessionId;
      if (!currentSessionId) {
        const sessionResponse = await startChatSession(design.patentId);
        
        if (!sessionResponse || !sessionResponse.session_id) {
            throw new Error("Failed to get a valid session_id from the server.");
        }

        currentSessionId = sessionResponse.session_id;
        setChatSessionId(currentSessionId);
      }

      const botResponse = await sendChatMessageToServer(currentSessionId, messagePayload);
      
      const botMessage = {
        id: botResponse.message_id || crypto.randomUUID(),
        type: 'bot',
        message: botResponse.content,
        timestamp: new Date(botResponse.created_at)
      };
      setChatMessages(prev => [...prev, botMessage]);

      if (botResponse.executed_features && botResponse.executed_features.length > 0) {
        const featuresMessage = {
            id: crypto.randomUUID(),
            type: 'bot-features',
            features: botResponse.executed_features,
            results: botResponse.features_result,
            timestamp: new Date()
        };
        setChatMessages(prev => [...prev, featuresMessage]);
      }

    } catch (error) {
      console.error("챗봇 메시지 전송 실패:", error);
      let specificErrorMessage = "죄송합니다. AI 도우미와 연결하는 데 문제가 발생했습니다.";
      if (error.message === "Failed to get a valid session_id from the server.") {
          specificErrorMessage = "오류: AI와 새로운 대화 세션을 시작하지 못했습니다. 서버 응답을 확인해주세요.";
      }
      
      const errorMessage = {
        id: crypto.randomUUID(),
        type: 'bot',
        message: specificErrorMessage,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = (query) => {
    sendChatMessage(query);
  };

  const getStatusColorClass = (currentStatus) => {
    switch (currentStatus) {
      case '심사완료':
      case '등록결정': return 'bg-green-100 text-green-700';
      case '심사대기': return 'bg-blue-100 text-blue-800';
      case '심사중': return 'bg-yellow-100 text-yellow-800';
      case '거절': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const showMessageBox = (message) => {
    setModalMessage(message);
    setShowModal(true);
  };
  
  const handleReviewSubmit = async () => {
    let currentComment;
    let decision;
    let message;
    let newStatus;

    if (selectedAction === 'document') {
        currentComment = approvalComment;
        decision = 'PENDING';
        newStatus = '심사중';
        message = '의견서가 제출되었습니다. 상태가 "심사중"으로 변경됩니다.';
    } else if (selectedAction === 'rejection') {
        currentComment = rejectionComment;
        decision = 'REJECT';
        newStatus = '거절';
        message = '거절사유서가 제출되었습니다. 상태가 "거절"으로 변경됩니다.';
    } else {
        return;
    }

    if (!currentComment || !currentComment.trim()) {
        showMessageBox('의견을 입력해주세요.');
        return;
    }

    const requestData = {
        patentId: design.patentId,
        decision: decision,
        comment: currentComment
    };

    try {
        await submitReview(requestData);
        setStatus(newStatus);
        showMessageBox(message);
    } catch (error) {
        console.error('심사 제출 실패:', error);
        showMessageBox('심사 제출에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  const prepareFinalApproval = () => {
    setSelectedAction('approval');
    const documentText = `
[디자인 등록 결정 의견서]

출원번호: ${design.applicationNumber}
디자인명: ${design.title || design.patentTitle}
출원인: ${design.applicantName}
심사관: ${design.examinerName}
--------------------------------------------------

귀하의 디자인 출원 ${design.applicationNumber}에 대하여 심사한 결과, 본 출원은 디자인보호법 관련 규정에 의거하여 다음과 같은 사유로 등록이 결정되었음을 통지합니다.

1. 신규성 및 창작성:
 - 본 디자인의 핵심적인 '${design.summary}'은(는) 기존에 공지된 디자인과 명확히 구별되는 독창적인 심미감을 포함하고 있습니다.
 - 기존 디자인이 해결하지 못했던 특정 문제점을 효과적으로 해결하여 창작성이 높다고 인정됩니다.

2. 산업상 이용 가능성:
 - 본 디자인은 관련 산업 분야에서 양산 가능하며, 시장에 긍정적인 영향을 줄 것으로 기대됩니다.

3. 기재 요건 충족 여부:
 - 출원서의 도면 및 설명은 명확하고 구체적으로 기재되어 있어, 디자인의 기술적 사상을 충분히 이해할 수 있습니다.

따라서, 본 디자인은 등록 요건을 모두 충족하므로 등록을 결정합니다.

${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일

대한민국 특허청
심사관 ${design.examinerName}
    `;
    setApprovalDocumentText(documentText.trim());
  };

  const handleFinalizeApproval = async () => {
      const requestData = {
        patentId: design.patentId,
        decision: 'APPROVE',
        comment: approvalDocumentText || '최종 등록 승인됨.'
      };
      
      try {
        await submitReview(requestData);
        setStatus('심사완료');
        showMessageBox('디자인이 최종 승인 처리되었습니다.');
      } catch (error) {
        console.error('최종 승인 실패:', error);
        showMessageBox('최종 승인 처리에 실패했습니다.');
      }
  };

  const handleDocumentCheck = async () => {
    if (!design) return;
    showMessageBox('AI가 출원 서류를 점검 중입니다...');
    try {
      const results = await validatePatentDocument(design.patentId);
      if (results && results.length > 0) {
        const errorMessages = results.map(err => `[${err.error_type}] ${err.message}`).join('\n\n');
        showMessageBox(`점검 결과:\n\n${errorMessages}`);
      } else {
        showMessageBox('점검 완료 ✨\n\n서류에서 특별한 오류가 발견되지 않았습니다.');
      }
    } catch (error) {
      console.error('출원 서류 점검 실패:', error);
      showMessageBox('오류: 서류 점검 중 문제가 발생했습니다.');
    }
  };

  const handleGenerate3DModel = async () => {
    if (!design) return;
    const targetImageId = 1;

    setIsGenerating3D(true);
    setThreeDModelPath('');
    try {
      const result = await generate3DModel(design.patentId, targetImageId);
      setThreeDModelPath(result.file_path);
      showMessageBox(`3D 모델 생성 완료!\n경로: ${result.file_path}`);
    } catch (error) {
      console.error('3D 모델 생성 실패:', error);
      showMessageBox('오류: 3D 모델 생성에 실패했습니다.');
    } finally {
      setIsGenerating3D(false);
    }
  };
  
  const handleGenerateRejectionDraft = async () => {
    if (!design) return;
    setIsGeneratingDraft(true);
    try {
      const draftData = await generateRejectionDraft(design.patentId);
      setRejectionComment(draftData.content);
      showMessageBox('AI 거절 사유서 초안이 생성되었습니다.');
    } catch (error) {
      console.error('AI 초안 생성 실패:', error);
      showMessageBox('오류: AI 초안 생성에 실패했습니다.');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // AI 유사 디자인 검색 로직 추가
  const handleSimilaritySearch = async (imageFile) => {
    if (!imageFile) {
      // 이미지 파일이 없을 경우 기본 이미지를 사용하여 AI 분석을 실행합니다.
      // 실제 구현 시에는 design.file_url 등을 활용해야 합니다.
      showMessageBox('유사도 분석을 위해 이미지가 필요합니다.');
      return;
    }

    setIsSearchingSimilarity(true);
    setSimilarityResults([]);
    
    try {
      const results = await searchDesignImage(imageFile);
      if (results && results.results) {
        setSimilarityResults(results.results);
        showMessageBox(`총 ${results.results.length}개의 유사 디자인을 찾았습니다.`);
      } else {
        showMessageBox('유사 디자인을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('유사도 분석 실패:', error);
      showMessageBox('유사도 분석 중 오류가 발생했습니다.');
    } finally {
      setIsSearchingSimilarity(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce"></div>
          <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce delay-150"></div>
          <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce delay-300"></div>
          <p className="ml-4 text-gray-700 font-medium">데이터를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-700 font-medium">심사 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }
  
  const isFinalStatus = status === '심사완료' || status === '거절';

  return (
    <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-gray-50 min-h-screen relative font-sans">
      <main className={`transition-all duration-300 ease-in-out ${isChatOpen ? 'mr-[450px]' : 'mr-0'}`}>
        <div className="bg-white shadow-sm border-b">
          <div className="px-8 py-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
              <Palette className="w-7 h-7 text-indigo-600" />
              <span>디자인 심사 시스템</span>
            </h2>
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`fixed right-8 bottom-8 z-50 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 ${
                isChatOpen ? 'translate-x-[-420px]' : 'translate-x-0'
              }`}
            >
              <Bot className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8 font-sans">
          <section className="mb-6 border border-gray-200 p-6 rounded-xl bg-white shadow-sm">
              <h3 className="font-semibold text-xl mb-4 text-gray-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-500" /> 출원 정보
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-3 text-gray-700">
                <p><strong>출원번호:</strong> <span className="font-medium text-gray-900">{design.applicationNumber}</span></p>
                <p><strong>접수일자:</strong> <span className="font-medium text-gray-900">{design.applicationDate}</span></p>
                <p><strong>출원인:</strong> <span className="font-medium text-gray-900">{design.applicantName || '정보 없음'}</span></p>
                <p><strong>디자인명:</strong> <span className="font-medium text-gray-900">{design.title || design.patentTitle}</span></p>
                <p>
                  <strong>심사상태:</strong>
                  <span className={`font-semibold ${getStatusColorClass(status)} px-2 py-1 rounded text-sm ml-2`}>
                    {status}
                  </span>
                </p>
                <p><strong>분류:</strong> <span className="font-medium text-gray-900">{design.technicalField}</span></p>
                <p><strong>담당 심사관:</strong> <span className="font-medium text-gray-900">{design.examinerName || '정보 없음'}</span></p>
              </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <section className={`border border-gray-200 p-5 rounded-xl bg-white shadow-sm ${isFinalStatus ? 'opacity-60 bg-gray-50' : ''}`}>
              <h3 className="font-semibold text-xl mb-4 text-gray-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-500" /> 심사 의견서 작성
              </h3>
              
              <div className="flex gap-1 p-1 bg-gray-50 rounded-xl mb-6 border border-gray-200">
                <button
                  onClick={() => setSelectedAction('document')}
                  disabled={isFinalStatus}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedAction === 'document' 
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-md transform scale-[1.02]' 
                    : 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                  }`}
                >📝 보류 의견서</button>
                <button
                  onClick={() => setSelectedAction('rejection')}
                  disabled={isFinalStatus}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedAction === 'rejection' 
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md transform scale-[1.02]' 
                    : 'text-red-700 bg-red-50 hover:bg-red-100'
                  }`}
                >✗ 거절 사유서</button>
                <button
                  onClick={prepareFinalApproval}
                  disabled={isFinalStatus}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedAction === 'approval'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md'
                    : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                  }`}
                >⚡ 최종 승인</button>
              </div>
              
              {(selectedAction === 'document' || selectedAction === 'rejection' || selectedAction === 'approval') && (
                <div className="mb-4 w-full">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {selectedAction === 'document' ? '보류 의견서 작성' : selectedAction === 'rejection' ? '거절 사유서 작성' : '최종 승인 서류'}
                    </label>
                    {selectedAction === 'rejection' && (
                      <button
                        onClick={handleGenerateRejectionDraft}
                        disabled={isGeneratingDraft || isFinalStatus}
                        className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-md hover:bg-indigo-200 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Bot className="w-4 h-4 mr-1.5" />
                        {isGeneratingDraft ? '생성 중...' : 'AI 초안 생성'}
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={16}
                    disabled={isFinalStatus}
                    className="w-full border border-gray-300 px-4 py-3 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-y disabled:bg-gray-100"
                    placeholder={
                      selectedAction === 'document' ? `보류 사유 및 보완이 필요한 사항에 대해 작성해주세요.` :
                      selectedAction === 'rejection' ? `거절 이유를 구체적으로 작성해주세요.` : ''
                    }
                    value={
                      selectedAction === 'document' ? approvalComment :
                      selectedAction === 'rejection' ? rejectionComment :
                      approvalDocumentText
                    }
                    onChange={(e) => {
                      if (selectedAction === 'document') setApprovalComment(e.target.value);
                      else if (selectedAction === 'rejection') setRejectionComment(e.target.value);
                      else setApprovalDocumentText(e.target.value);
                    }}
                  />
                  <div className="flex justify-end w-full mt-4">
                    {selectedAction === 'document' || selectedAction === 'rejection' ? (
                      <button
                        onClick={handleReviewSubmit}
                        disabled={isFinalStatus}
                        className={`px-5 py-2 text-white rounded-lg font-medium flex items-center gap-2 transition-all disabled:bg-gray-400 ${
                          selectedAction === 'document'
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700'
                          : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                        {selectedAction === 'document' ? '의견서 제출' : '사유서 제출'}
                      </button>
                    ) : (
                      <button
                        onClick={handleFinalizeApproval}
                        disabled={isFinalStatus}
                        className="px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:bg-gray-400"
                      >
                        <Check className="w-4 h-4" />
                        최종 승인
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="border border-gray-200 p-6 rounded-xl bg-white shadow-sm">
              <h3 className="font-semibold text-xl mb-4 flex items-center gap-2 text-gray-800">
                <FileText className="w-5 h-5 text-indigo-500" /> 심사 대상
                <button
                  onClick={handleDocumentCheck}
                  className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium ml-auto transition-colors flex items-center gap-2 text-sm"
                >
                  <ScrollText className="w-4 h-4" />
                  AI 서류 점검
                </button>
              </h3>
              
              <div className="mb-4">
                <h4 className="font-medium text-lg mb-2 text-gray-800 flex items-center gap-1">
                  <FileText className="w-4 h-4 text-indigo-400" /> 청구항
                </h4>
                {design.claims && design.claims.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 bg-gray-50 p-3 rounded-md border border-gray-100 max-h-32 overflow-y-auto">
                    {design.claims.map((claim, index) => (
                      <li key={index}>{claim}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 col-span-full text-sm bg-gray-50 p-3 rounded-md border border-gray-100">등록된 청구항이 없습니다.</p>
                )}
              </div>

              <div className="flex flex-col lg:flex-row gap-6 mb-4">
                <div className="flex-1 w-full">
                  <h4 className="font-medium text-lg mb-2 text-gray-800 flex items-center gap-1">
                    <Image className="w-4 h-4 text-indigo-400" /> 2D 도면
                  </h4>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {design.drawingFileNames && design.drawingFileNames.length > 0 ? (
                      design.drawingFileNames.map((fileName, index) => (
                        <div key={index} className="relative group overflow-hidden rounded-lg shadow-sm">
                          <img 
                            src={`/api/files/${design.patentId}/${fileName}`} 
                            alt={`도면 ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                            <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">{fileName}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600 col-span-full text-sm bg-gray-50 p-3 rounded-md border border-gray-100">등록된 2D 도면이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-lg mb-2 text-gray-800 flex items-center gap-1">
                    <FileText className="w-4 h-4 text-indigo-400" /> 요약
                </h4>
                <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-md border border-gray-100 max-h-32 overflow-y-auto">
                  {design.summary}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-lg text-gray-800 flex items-center gap-1">
                    <FlaskConical className="w-4 h-4 text-indigo-400" /> 3D 모델
                  </h4>
                  <button
                    onClick={handleGenerate3DModel}
                    disabled={isGenerating3D}
                    className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isGenerating3D ? '생성 중...' : '3D 모델 생성'}
                  </button>
                </div>
                <div className="w-full h-72 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                  {isGenerating3D ? (
                    <p className="text-gray-500 animate-pulse">AI가 3D 모델을 생성하고 있습니다...</p>
                  ) : threeDModelPath ? (
                    <ThreeDModelViewer glbPath={threeDModelPath} />
                  ) : (
                    <p className="text-gray-500">2D 도면으로 3D 모델을 생성할 수 있습니다.</p>
                  )}
                </div>
              </div>
            </section>
          </div>

          <section className="mb-6 border border-gray-200 p-6 rounded-xl bg-white shadow-sm">
            <h3 className="font-semibold text-xl mb-4 text-gray-800 flex items-center gap-2">
              <Copy className="w-5 h-5 text-indigo-500" /> AI 유사 디자인 분석
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
              {isSearchingSimilarity ? (
                <div className="w-full flex justify-center items-center py-8">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="ml-4 text-gray-600">유사 디자인을 검색하고 있습니다...</p>
                </div>
              ) : similarityResults && similarityResults.length > 0 ? (
                similarityResults.map((result, index) => (
                  <div key={result.similar_patent_code || index} className="min-w-[220px] w-full max-w-[250px] border border-gray-200 rounded-lg bg-white shadow-sm flex-shrink-0 transition-all hover:shadow-md hover:border-indigo-200">
                    <div className="h-32 bg-gray-100 flex items-center justify-center">
                        <img 
                            src={result.image_url} 
                            alt={`유사 디자인 ${index + 1}`} 
                            className="w-full h-full object-contain"
                            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x300/e2e8f0/94a3b8?text=Image+Not+Found"; }}
                        />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-800 truncate">{result.title || `유사 디자인 ${index + 1}`}</p>
                      <p className="text-xs text-gray-500 mt-1">출원번호: {result.application_number}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(result.similarity * 100).toFixed(2)}%` }}></div>
                      </div>
                      <p className="text-right text-sm font-bold text-blue-700 mt-1">{(result.similarity * 100).toFixed(2)}%</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 w-full text-center py-4">AI 분석 결과가 없거나 분석 중입니다.</p>
              )}
            </div>
          </section>

          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/designdashboard')}
              className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium transition-all flex items-center gap-2 mx-auto"
            >
              목록으로 돌아가기
            </button>
          </div>
        </div>
      </main>

      <div className={`fixed right-0 top-0 h-full w-[450px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">디자인 심사 AI 도우미</h3>
              <p className="text-xs text-gray-600">온라인</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <p className="text-sm font-medium text-gray-700 mb-3">빠른 질문</p>
          <div className="grid grid-cols-2 gap-2">
            {quickQuestions.map((question) => (
              <button
                key={question.id}
                onClick={() => handleQuickQuestion(question.query)}
                className="p-2 text-xs bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg transition-all flex flex-col items-center gap-1"
              >
                <question.icon className="w-4 h-4 text-indigo-600" />
                <span className="text-gray-700">{question.text}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <p className="text-sm whitespace-pre-line">{message.message}</p>
                <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-indigo-100' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              placeholder="궁금한 점을 물어보세요..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
            <button
              onClick={() => sendChatMessage()}
              disabled={!inputMessage.trim() || isTyping}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {showModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-lg p-6 w-96 max-w-[90%] text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-medium mb-6 whitespace-pre-line">{modalMessage}</p>
            <button
              onClick={() => setShowModal(false)}
              className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}