
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AIInsight, AIRecommendation, getDeepDiveAnalysis, DetailedAnalysis } from '../lib/aiService.ts';

interface Props {
  data: any[];
  type: 'residents' | 'policies';
  aiResults: {
    insights: AIInsight[];
    recommendations: AIRecommendation[];
  } | null;
  onClose: () => void;
}

export const PostUploadAnalysis: React.FC<Props> = ({ data, type, aiResults, onClose }) => {
  const [deepDive, setDeepDive] = useState<DetailedAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 데이터 속성 중 숫자형 필드를 찾아 시각화 키로 사용 (동적 대응)
  const numericKey = type === 'residents' ? 'resident_count' : 'budget';
  const label = type === 'residents' ? '거주 인원(명)' : '예산(백만원)';

  const chartData = data.slice(0, 10).map(d => ({
    name: d.region || '미정',
    value: type === 'residents' ? d.resident_count : d.budget / (d.budget > 1000000 ? 1000000 : 1)
  }));

  const handleDeepDive = async (rec: AIRecommendation) => {
    setIsAnalyzing(true);
    setDeepDive(null);
    try {
      const result = await getDeepDiveAnalysis(data, rec.title, type);
      setDeepDive(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-50 w-full max-w-6xl my-auto rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-fadeIn border border-white/20">
        
        {/* Top Header */}
        <div className="bg-white px-10 py-8 flex justify-between items-center border-b border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <i className="fa-solid fa-microchip text-white text-xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">AI 자율 분석 리포트</h2>
              <p className="text-slate-500 font-medium text-sm flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                감지된 데이터 타입: <span className="text-blue-600 ml-1 font-bold">{type === 'residents' ? '인구 현황' : '정책 예산'}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all group">
            <i className="fa-solid fa-xmark text-slate-400 group-hover:text-slate-800"></i>
          </button>
        </div>

        <div className="p-10 space-y-10 overflow-y-auto max-h-[75vh]">
          {/* Section 1: Visualization & Quick Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
              <h3 className="font-bold text-slate-800 mb-8 flex items-center">
                <i className="fa-solid fa-chart-column mr-3 text-blue-500"></i>
                지역별 {label} 분포
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center mb-4">
                <i className="fa-solid fa-brain mr-3 text-amber-500"></i>
                AI 추출 주요 통찰
              </h3>
              {aiResults?.insights.map((insight, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn" style={{animationDelay: `${idx * 0.1}s`}}>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">{insight.title}</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">{insight.content}</p>
                </div>
              ))}
              {!aiResults && <div className="text-slate-400 text-sm italic">분석 결과를 불러오는 중...</div>}
            </div>
          </div>

          {/* Section 2: AI Recommendations for Deep Dive */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <i className="fa-solid fa-wand-magic-sparkles mr-3 text-indigo-500"></i>
              무엇을 더 분석해볼까요?
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {aiResults?.recommendations.map((rec) => (
                <button 
                  key={rec.id} 
                  onClick={() => handleDeepDive(rec)}
                  disabled={isAnalyzing}
                  className="text-left bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all group"
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                    <i className={`${rec.icon} text-slate-500 group-hover:text-white`}></i>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-2">{rec.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{rec.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Deep Dive Modal */}
          {(isAnalyzing || deepDive) && (
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white animate-fadeIn shadow-2xl relative overflow-hidden">
              {isAnalyzing ? (
                <div className="flex flex-col items-center py-10 space-y-4">
                  <div className="w-10 h-10 border-4 border-white/20 border-t-blue-400 rounded-full animate-spin"></div>
                  <p className="font-bold">AI 데이터 사이언티스트가 심층 리포트를 작성 중입니다...</p>
                </div>
              ) : deepDive && (
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black">{deepDive.reportTitle}</h3>
                    <div className="px-4 py-2 bg-red-500/20 rounded-xl border border-red-500/50 text-red-300 text-xs font-bold">
                      위험요소: {deepDive.riskFactor}
                    </div>
                  </div>
                  <p className="text-slate-300 mb-8 leading-relaxed italic border-l-4 border-blue-500 pl-6">{deepDive.summary}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deepDive.strategicSuggestions.map((s, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-xl flex items-start space-x-3">
                        <i className="fa-solid fa-circle-check text-blue-400 mt-1"></i>
                        <span className="text-sm">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-100 flex justify-end">
          <button onClick={onClose} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg">
            분석 종료
          </button>
        </div>
      </div>
    </div>
  );
};
