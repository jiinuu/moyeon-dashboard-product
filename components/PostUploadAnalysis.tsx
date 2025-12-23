
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
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

  const label = type === 'residents' ? '거주 인원(명)' : '예산(백만원)';

  const chartData = data.slice(0, 15).map(d => ({
    name: d.region?.length > 4 ? d.region.substring(0, 4) + '..' : d.region || '미분류',
    value: type === 'residents' ? d.resident_count : Math.floor(d.budget / 1000000)
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
    <div className="animate-fadeIn space-y-8">
      {/* Overview Header */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-200">
            <i className="fa-solid fa-chart-pie text-white text-2xl"></i>
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded-md">LIVE ANALYSIS</span>
              <h2 className="text-2xl font-black text-slate-800">AI 데이터 사이언스 리포트</h2>
            </div>
            <p className="text-slate-500 font-medium">감지된 데이터셋: <span className="text-blue-600 font-bold">{type === 'residents' ? '대한민국 인구 분포' : '지자체 정책 예산'}</span></p>
          </div>
        </div>
        <button onClick={onClose} className="bg-slate-100 text-slate-500 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center">
          <i className="fa-solid fa-arrow-left mr-2"></i> 수집기로 돌아가기
        </button>
      </div>

      {/* Main Dashboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visualization Card */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black text-slate-800 flex items-center">
              <i className="fa-solid fa-layer-group mr-3 text-blue-500"></i>
              지역별 {label} 시각화
            </h3>
            <div className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg">Top 15 Regions</div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 800, color: '#3b82f6' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Insights Sidebar */}
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center px-2">
            <i className="fa-solid fa-bolt-lightning mr-3 text-amber-500 animate-pulse"></i>
            AI 퀵 인사이트
          </h3>
          <div className="space-y-4">
            {aiResults.insights.map((insight, idx) => (
              <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm group hover:border-blue-300 transition-all animate-fadeIn" style={{animationDelay: `${idx * 0.1}s`}}>
                <div className="flex items-center space-x-3 mb-2">
                   <span className={`w-2 h-2 rounded-full ${insight.type === 'alert' ? 'bg-red-500' : insight.type === 'opportunity' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                   <h4 className="font-black text-slate-800 text-sm">{insight.title}</h4>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">{insight.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendation & Deep Dive Section */}
      <div className="bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="mb-12 text-center md:text-left">
            <h3 className="text-3xl font-black mb-3">Next Action: 심층 분석 추천</h3>
            <p className="text-slate-400 font-bold">AI가 데이터의 상관관계를 바탕으로 제안하는 심화 분석 시나리오입니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {aiResults.recommendations.map((rec) => (
              <button 
                key={rec.id} 
                onClick={() => handleDeepDive(rec)}
                disabled={isAnalyzing}
                className="group text-left bg-white/5 p-8 rounded-[2.5rem] border border-white/10 hover:bg-white/10 hover:border-blue-500/50 transition-all duration-500"
              >
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:scale-110 transition-all">
                  <i className={`${rec.icon} text-white text-xl`}></i>
                </div>
                <h4 className="text-xl font-black mb-3 group-hover:text-blue-400 transition-colors">{rec.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">{rec.description}</p>
              </button>
            ))}
          </div>

          {/* Deep Dive Result Display */}
          {(isAnalyzing || deepDive) && (
            <div className="bg-white/10 rounded-[3rem] p-10 backdrop-blur-md border border-white/10 animate-fadeIn">
              {isAnalyzing ? (
                <div className="flex flex-col items-center py-10 space-y-6">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="text-center">
                    <p className="text-xl font-black mb-1 tracking-tight">AI 데이터 사이언티스트 가동 중...</p>
                    <p className="text-slate-400 text-sm font-bold">방대한 정책 데이터를 결합하여 전략을 수립하고 있습니다.</p>
                  </div>
                </div>
              ) : deepDive && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-8">
                    <h3 className="text-3xl font-black text-blue-400 tracking-tighter italic">" {deepDive.reportTitle} "</h3>
                    <div className="px-6 py-2 bg-red-500/20 rounded-2xl border border-red-500/40 text-red-300 text-xs font-black tracking-widest uppercase">
                      Risk Level: {deepDive.riskFactor}
                    </div>
                  </div>
                  
                  <p className="text-slate-300 text-lg leading-relaxed font-medium border-l-4 border-blue-500 pl-8 py-2 bg-white/5 rounded-r-2xl">
                    {deepDive.summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {deepDive.strategicSuggestions.map((s, i) => (
                      <div key={i} className="bg-white/5 p-6 rounded-3xl flex items-start space-x-4 border border-white/5 hover:border-white/20 transition-all">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 text-blue-400 mt-1">
                          <i className="fa-solid fa-check text-xs"></i>
                        </div>
                        <span className="text-slate-200 font-bold leading-snug">{s}</span>
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
