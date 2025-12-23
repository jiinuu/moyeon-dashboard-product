
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

  const chartData = data.slice(0, 10).map(d => ({
    name: d.region || '미정',
    value: type === 'residents' ? d.resident_count : d.budget / 1000000
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
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">AI 지능형 데이터 리포트</h2>
              <p className="text-slate-500 font-medium text-sm flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                {data.length}건의 레코드가 정상적으로 처리되었습니다.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all group">
            <i className="fa-solid fa-xmark text-slate-400 group-hover:text-slate-800"></i>
          </button>
        </div>

        <div className="p-10 space-y-10 overflow-y-auto max-h-[70vh]">
          {/* Section 1: Visualization & Quick Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
              <h3 className="font-bold text-slate-800 mb-8 flex items-center">
                <i className="fa-solid fa-chart-column mr-3 text-blue-500"></i>
                지역별 {type === 'residents' ? '거주 인원' : '정책 예산'} 분포
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
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
                <i className="fa-solid fa-lightbulb mr-3 text-amber-500"></i>
                데이터 초동 인사이트
              </h3>
              {aiResults?.insights.map((insight, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow animate-fadeIn" style={{animationDelay: `${idx * 0.1}s`}}>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block ${
                    insight.type === 'alert' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {insight.type.toUpperCase()}
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">{insight.title}</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">{insight.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: AI Recommendations for Deep Dive */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center">
                <i className="fa-solid fa-magnifying-glass-chart mr-3 text-indigo-500"></i>
                AI 추천 심화 분석 (원클릭 실행)
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {aiResults?.recommendations.map((rec) => (
                <button 
                  key={rec.id} 
                  onClick={() => handleDeepDive(rec)}
                  disabled={isAnalyzing}
                  className="text-left bg-white p-6 rounded-3xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all group shadow-sm hover:shadow-xl"
                >
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:rotate-6 transition-all">
                    <i className={`${rec.icon} text-slate-500 text-xl group-hover:text-white`}></i>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-2 group-hover:text-indigo-700">{rec.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{rec.description}</p>
                  <div className="mt-4 flex items-center text-indigo-600 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    분석 시작 <i className="fa-solid fa-arrow-right ml-2"></i>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Deep Dive Modal/Section */}
          {(isAnalyzing || deepDive) && (
            <div className="bg-indigo-900 rounded-[2rem] p-10 text-white relative overflow-hidden animate-fadeIn shadow-2xl shadow-indigo-200">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-400 border-t-white rounded-full animate-spin"></div>
                  <p className="font-bold animate-pulse">AI가 데이터를 심층 분석하여 전략 리포트를 생성하고 있습니다...</p>
                </div>
              ) : deepDive && (
                <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-indigo-300 text-sm font-bold tracking-widest uppercase mb-2">Strategic Analysis Report</h4>
                      <h3 className="text-3xl font-black">{deepDive.reportTitle}</h3>
                    </div>
                    <div className="bg-red-500/20 border border-red-500/50 px-4 py-2 rounded-xl">
                      <p className="text-[10px] text-red-200 font-bold uppercase mb-1">Risk Factor</p>
                      <p className="text-sm font-bold text-red-100">{deepDive.riskFactor}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="md:col-span-2 space-y-4">
                      <p className="text-indigo-100 leading-relaxed text-lg">{deepDive.summary}</p>
                      <div className="h-px bg-white/10 w-full my-6"></div>
                      <div className="grid grid-cols-1 gap-3">
                        {deepDive.strategicSuggestions.map((s, i) => (
                          <div key={i} className="flex items-start space-x-3 bg-white/5 p-4 rounded-xl border border-white/10">
                            <i className="fa-solid fa-check-circle text-indigo-400 mt-1"></i>
                            <span className="text-sm">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white/10 p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
                      <i className="fa-solid fa-award text-5xl text-indigo-300 mb-4"></i>
                      <p className="text-sm font-medium">이 리포트는 현재 업로드된 {data.length}건의 최신 실무 데이터를 기반으로 작성되었습니다.</p>
                    </div>
                  </div>
                </div>
              )}
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 blur-[100px] -mr-48 -mt-48"></div>
            </div>
          )}
        </div>

        <div className="p-8 bg-white border-t border-slate-200 flex justify-end items-center">
           <p className="text-slate-400 text-xs mr-auto italic">
             * 모든 분석 결과는 Gemini AI에 의해 실시간 생성되었습니다.
           </p>
          <button onClick={onClose} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1">
            분석 완료 및 대시보드 복귀
          </button>
        </div>
      </div>
    </div>
  );
};
