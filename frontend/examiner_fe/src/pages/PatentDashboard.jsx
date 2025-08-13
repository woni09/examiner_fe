import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, User, Eye, ChevronDown, ChevronUp, Palette, Search, Filter, Clock,
  FileText, CheckCircle, Hash, Building2, AlertCircle, Zap, Hourglass, FlaskConical
} from 'lucide-react';

// API 함수는 기존 코드를 그대로 유지합니다.
import { getReviewList } from '../api/review';

// 특허 등록 단계를 위한 아이콘
function PatentCertificate(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <path d="M14 2v6h6"></path>
      <path d="M9 13h6"></path>
      <path d="M9 17h6"></path>
      <path d="M12 9v-2"></path>
      <path d="M12 11v-2"></path>
    </svg>
  );
}

// 특허 진행 단계 정의
const patentStages = [
  { id: 'reception', name: '접수', icon: FileText, colorClass: { bg: 'bg-blue-600', border: 'border-blue-600', text: 'text-blue-700' } },
  { id: 'waiting', name: '심사대기', icon: Clock, colorClass: { bg: 'bg-purple-600', border: 'border-purple-600', text: 'text-purple-700' } },
  { id: 'examination', name: '심사중', icon: FlaskConical, colorClass: { bg: 'bg-yellow-600', border: 'border-yellow-600', text: 'text-yellow-700' } },
  { id: 'decision', name: '심결', icon: CheckCircle, colorClass: { bg: 'bg-teal-600', border: 'border-teal-600', text: 'text-teal-700' } },
  { id: 'registration', name: '등록', icon: PatentCertificate, colorClass: { bg: 'bg-green-600', border: 'border-green-600', text: 'text-green-700' } }
];

// API 상태 코드와 UI 표시 정보를 매핑하는 객체
const statusMap = {
  'DRAFT': { label: '초안', color: 'bg-blue-100 text-blue-800' },
  'SUBMITTED': { label: '심사대기', color: 'bg-blue-100 text-blue-800' },
  'REVIEWING': { label: '심사중', color: 'bg-yellow-100 text-yellow-800' },
  'APPROVE': { label: '등록결정', color: 'bg-green-100 text-green-700' },
  'REJECT': { label: '거절', color: 'bg-red-100 text-red-700' },
};

export default function PatentDashboard() {
  const [patentData, setPatentData] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalPatents: 0,
    inReview: 0,
    pending: 0,
    completed: 0,
    onhold: 0,
  });
  const [overdueApplications, setOverdueApplications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const userId = '1'; // 실제 구현 시에는 로그인 상태에서 가져와야 합니다.

      try {
        setLoading(true);
        const listResponse = await getReviewList(userId, 'PATENT');

        setDashboardStats({
          totalPatents: listResponse.length,
          pending: listResponse.filter(item => item.status === 'SUBMITTED').length,
          inReview: listResponse.filter(item => item.status === 'REVIEWING').length,
          completed: listResponse.filter(item => item.status === 'APPROVE').length,
          onhold: listResponse.filter(item => item.status === 'REJECT').length,
        });

        const today = new Date();
        const overdueCount = listResponse.filter(item => {
          if (!item.receptionDate) return false;
          const receptionDate = new Date(item.receptionDate);
          const timeDifference = today.getTime() - receptionDate.getTime();
          const dayDifference = timeDifference / (1000 * 3600 * 24);

          return (
            (item.status === 'SUBMITTED' || item.status === 'REVIEWING') &&
            dayDifference >= 7
          );
        }).length;
        setOverdueApplications(overdueCount);

        setPatentData(listResponse.map(item => {
          const statusInfo = statusMap[item.status] || { label: '알 수 없음', color: 'bg-gray-100 text-gray-800' };

          return {
            id: item.reviewId,
            applicationNumber: item.applicationNumber,
            title: item.patentTitle,
            applicant: item.applicantName,
            examiner: item.examinerName,
            receptionDate: item.receptionDate,
            status: item.status,
            statusLabel: statusInfo.label,
            statusColor: statusInfo.color,
            description: item.summary || '발명에 대한 구체적인 요약 정보가 없습니다.',
            field: item.technicalField || '미정',
            reviewProgress: item.reviewProgress || 0,
            estimatedDays: item.estimatedDays || 0,
            priority: item.reviewId === 2 ? 'high' : 'medium',
          };
        }));

      } catch (err) {
        setError(err);
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const filteredData = useMemo(() => {
    return patentData.filter(item => {
      const matchesSearch =
        item?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item?.applicant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.id && item.id.toString().toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter =
        selectedFilter === 'all' ||
        (selectedFilter === 'waiting' && item?.status === 'SUBMITTED') ||
        (selectedFilter === 'reviewing' && item?.status === 'REVIEWING') ||
        (selectedFilter === 'approved' && item?.status === 'APPROVE') ||
        (selectedFilter === 'onhold' && item?.status === 'REJECT');

      return matchesSearch && matchesFilter;
    });
  }, [patentData, searchTerm, selectedFilter]);

  const handleCardExpand = (id) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const handleDetailView = (id) => {
    navigate(`/patentreview/${id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-4 text-gray-600">데이터를 불러오는 중입니다...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-red-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-700">오류가 발생했습니다.</h3>
          <p className="mt-2 text-gray-600">데이터를 가져오는 데 실패했습니다. 잠시 후 다시 시도해주세요.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="심사ID, 출원인, 특허명으로 검색..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <select
                className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
              >
                <option value="all">전체 상태</option>
                <option value="waiting">심사대기</option>
                <option value="reviewing">심사중</option>
                <option value="approved">등록결정</option>
                <option value="onhold">거절</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">전체 특허</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalPatents}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">심사대기</p>
                <p className="text-2xl font-bold text-blue-600">{dashboardStats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Hourglass className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">심사중</p>
                <p className="text-2xl font-bold text-yellow-600">{dashboardStats.inReview}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">심사완료</p>
                <p className="text-2xl font-bold text-green-600">{dashboardStats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredData.length > 0 ? (
            filteredData.map((item) => {
              const getStageStatus = (stageId) => {
                switch (stageId) {
                  case 'reception': return { completed: true, current: false };
                  case 'waiting': return { completed: ['REVIEWING', 'APPROVE', 'REJECT'].includes(item.status), current: item.status === 'SUBMITTED' };
                  case 'examination': return { completed: ['APPROVE', 'REJECT'].includes(item.status), current: item.status === 'REVIEWING' };
                  case 'decision': return { completed: item.status === 'APPROVE', current: ['APPROVE', 'REJECT'].includes(item.status) };
                  case 'registration': return { completed: item.status === 'APPROVE', current: item.status === 'APPROVE' };
                  default: return { completed: false, current: false };
                }
              };

              const progressPercentage = item.reviewProgress || 0;

              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleCardExpand(item.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-sm font-mono text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                            {item.id}
                          </span>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${item.statusColor}`}>
                            {item.statusLabel}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{item.applicant}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{item.receptionDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDetailView(item.id);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all flex items-center gap-2 text-sm font-medium border-0"
                        >
                          <Eye className="w-4 h-4" /> 
                          상세보기
                        </button>
                        {expandedCard === item.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedCard === item.id && (
                    <div className="border-t border-gray-100 bg-gradient-to-r from-gray-50 to-indigo-50 p-6">
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-indigo-600" />
                          심사 진행 상황
                        </h4>
                        {/* [수정] 심사 진행 상황 바 간격 조정 */}
                        <div className="flex items-start justify-between bg-white rounded-lg p-4 shadow-sm">
                          {patentStages.map((stage) => {
                            const { completed, current } = getStageStatus(stage.id);
                            return (
                              <div key={stage.id} className="flex flex-col items-center flex-shrink-0 text-center w-20">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                  current ? `${stage.colorClass.bg} ${stage.colorClass.border} text-white animate-pulse` :
                                  completed ? `${stage.colorClass.bg} ${stage.colorClass.border} text-white` :
                                  'bg-gray-100 border-gray-300 text-gray-400'
                                }`}>
                                  <stage.icon className="w-5 h-5" />
                                </div>
                                <span className={`text-xs mt-2 font-medium text-center ${current || completed ? stage.colorClass.text : 'text-gray-400'}`}>
                                  {stage.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h5 className="font-semibold text-gray-900">출원 정보</h5>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Hash className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">출원번호:</span>
                              <span className="font-medium ml-auto">{item.applicationNumber}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">접수일:</span>
                              <span className="font-medium ml-auto">{item.receptionDate}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">분류:</span>
                              <span className="font-medium ml-auto">{item.field}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                          <div className="flex items-center gap-2 mb-3">
                            <User className="w-5 h-5 text-green-600" />
                            <h5 className="font-semibold text-gray-900">당사자 정보</h5>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">출원인:</span>
                              <span className="ml-6 font-medium ml-auto text-gray-900">{item.applicant}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">담당 심사관:</span>
                              <span className="font-medium ml-auto">{item.examiner}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                            <h5 className="font-semibold text-gray-900">현재 상태</h5>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">심사상태:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${item.statusColor}`}>
                                {item.statusLabel}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">우선순위:</span>
                              <span className="font-medium">
                                {item.priority === 'high' ? '높음' : '보통'}
                              </span>
                            </div>
                            <div className="mt-3 pt-2 border-t border-gray-100">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>진행률: {progressPercentage}%</span>
                              </div>
                              <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                           <FileText className="w-5 h-5 text-purple-600" />
                           <h5 className="font-semibold text-gray-900">발명 요약</h5>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
              <p className="text-gray-600">다른 검색어로 시도해보세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}