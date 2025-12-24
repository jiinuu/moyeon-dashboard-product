
import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AIInsight, AIRecommendation, getDeepDiveAnalysis, DetailedAnalysis } from '../lib/aiService.ts';

interface Props {
  data: any[];
  type: 'residents' | 'policies';
  aiResults: {
    insights: AIInsight[];
    recommendations: AIRecommendation[];
  };
  onClose: () => void;
}

export const PostUploadAnalysis: React.FC<Props> = ({ data, type, aiResults, onClose }) => {
  const [deepDive, setDeepDive] = useState<DetailedAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const label = type === 'residents' ? '거주 인원(명)' : '예산(백만원)';

  const chartData = data.slice(0, 15).map(d => ({
    name: d.region?.length > 4 ? d.region.substring(0, 4) + '..' : d.region || '미분류',
    value: type === 'residents' ? d.resident_count : Math.floor(d.budget / 1000000)
  }));

  const handleDeepDive = async (rec: AIRecommendation) => {
    setIsAnalyzing(true);
    setDeepDive(null);
    setErrorMessage(null);
    try {
      const result = await getDeepDiveAnalysis(data, rec.title, type);
      if (!result) {
        setErrorMessage("현재 AI 엔진의 요청량이 많습니다. 잠시 후 다시 클릭해주세요.");
      } else {
        setDeepDive(result);
      }
    } catch (e) {
      setErrorMessage("심층 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="animate-fadeIn space-y-8 pb-20">
      {/* Overview Header */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-100">
            <i className="fa-solid fa-chart-line text-white text-2xl"></i>
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-black rounded-md uppercase tracking-tighter">Analytical Dashboard</span>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">AI 자율 분석 리포트</h2>
            </div>
            <p className="text-slate-500 font-medium">분석 대상: <span className="text-blue-600 font-bold underline decoration-blue-200 underline-offset-4">{type === 'residents' ? '지방자치단체 외국인 인구 분포' : '지자체별 외국인 지원 정책'}</span></p>
          </div>
        </div>
        <button onClick={onClose} className="group bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center">
          <i className="fa-solid fa-rotate-left mr-2 group-hover:-rotate-45 transition-transform"></i> 새로운 데이터 업로드
        </button>
      </div>

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visualization */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden relative">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black text-slate-800 flex items-center">
              <i className="fa-solid fa-mountain-city mr-3 text-blue-500"></i>
              지역별 {label} 현황
            </h3>
            <div className="flex space-x-1">
              {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-200"></div>)}
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                  labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#1e293b' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center px-2">
            <i className="fa-solid fa-wand-magic-sparkles mr-3 text-indigo-500"></i>
            데이터 자동 인사이트
          </h3>
          <div className="space-y-4">
            {aiResults.insights.map((insight, idx) => (
              <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
                <h4 className="font-black text-slate-800 text-sm mb-2">{insight.title}</h4>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">{insight.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendation Section */}
      <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="mb-12">
            <h3 className="text-3xl font-black mb-3 tracking-tight">AI 시나리오 심층 분석</h3>
            <p className="text-slate-400 font-bold">원하시는 분석 방향을 클릭하시면 AI 데이터 사이언티스트가 상세 리포트를 생성합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {aiResults.recommendations.map((rec) => (
              <button 
                key={rec.id} 
                onClick={() => handleDeepDive(rec)}
                disabled={isAnalyzing}
                className={`group text-left p-8 rounded-[2rem] border transition-all duration-300 ${
                  isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 border-white/10 hover:border-blue-500/50'
                } bg-white/5`}
              >
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-magnifying-glass-chart text-white"></i>
                </div>
                <h4 className="text-lg font-black mb-2 group-hover:text-blue-400">{rec.title}</h4>
                <p className="text-slate-400 text-xs font-medium leading-relaxed">{rec.description}</p>
              </button>
            ))}
          </div>

          {/* Analysis Progress / Result */}
          {(isAnalyzing || deepDive || errorMessage) && (
            <div className="bg-white/5 rounded-[2.5rem] p-10 border border-white/10 animate-fadeIn">
              {isAnalyzing ? (
                <div className="flex flex-col items-center py-10">
                  <div className="w-14 h-14 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                  <p className="text-xl font-black text-white">분석 엔진 가동 중...</p>
                  <p className="text-slate-400 text-sm mt-2">복합적인 데이터를 분석하고 있습니다.</p>
                </div>
              ) : errorMessage ? (
                <div className="text-center py-10">
                  <i className="fa-solid fa-circle-exclamation text-amber-500 text-4xl mb-4"></i>
                  <p className="text-amber-200 font-bold">{errorMessage}</p>
                </div>
              ) : deepDive && (
                <div className="space-y-8 max-w-4xl mx-auto">
                  <div className="flex justify-between items-center border-b border-white/10 pb-6">
                    <h3 className="text-2xl font-black text-blue-400 tracking-tight">{deepDive.reportTitle}</h3>
                    <span className="bg-red-500/20 text-red-400 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border border-red-500/30">
                      Risk: {deepDive.riskFactor}
                    </span>
                  </div>
                  
                  <div className="prose prose-invert max-w-none">
                    <p className="text-slate-300 text-lg leading-relaxed font-medium italic">"{deepDive.summary}"</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deepDive.strategicSuggestions.map((s, i) => (
                      <div key={i} className="bg-white/5 p-5 rounded-2xl flex items-center space-x-4 border border-white/5">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <i className="fa-solid fa-check text-[10px] text-white"></i>
                        </div>
                        <span className="text-sm text-slate-200 font-bold">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
