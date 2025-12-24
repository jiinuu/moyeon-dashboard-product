
import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AIInsight, AIRecommendation, getDeepDiveAnalysis, DetailedAnalysis, SchemaMapping } from '../lib/aiService.ts';

interface Props {
  data: any[];
  schema: SchemaMapping;
  aiResults: {
    insights: AIInsight[];
    recommendations: AIRecommendation[];
  };
  onClose: () => void;
}

export const PostUploadAnalysis: React.FC<Props> = ({ data, schema, aiResults, onClose }) => {
  const [deepDive, setDeepDive] = useState<DetailedAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI가 지정한 매핑에 기반하여 차트 데이터 생성
  const regionMapping = schema.mappings.find(m => m.target.includes('region') || m.target.includes('name') || m.target.includes('title'));
  const valueMapping = schema.mappings.find(m => m.type === 'number');

  const chartData = data.slice(0, 20).map(d => {
    const label = regionMapping ? d[regionMapping.target] : 'Item';
    const value = valueMapping ? Number(d[valueMapping.target]) : 0;
    
    return {
      name: String(label || 'Unknown').substring(0, 10),
      value: value
    };
  }).filter(d => d.value > 0);

  const handleDeepDive = async (rec: AIRecommendation) => {
    setIsAnalyzing(true);
    setDeepDive(null);
    setErrorMessage(null);
    try {
      const result = await getDeepDiveAnalysis(data, rec.title, schema);
      if (!result) {
        setErrorMessage("분석 엔진 도달 범위 초과");
      } else {
        setDeepDive(result);
      }
    } catch (e) {
      setErrorMessage("심층 분석 실패");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="animate-fadeIn space-y-8 pb-20">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-100">
            <i className="fa-solid fa-server text-white text-2xl"></i>
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-md uppercase tracking-tighter">New Physical Table Created</span>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{schema.datasetName}</h2>
            </div>
            <p className="text-slate-500 font-medium text-sm">
              물리 테이블 <code className="bg-slate-100 px-2 py-1 rounded text-emerald-600 font-bold">{schema.tableName}</code>에 데이터 적재 완료
            </p>
          </div>
        </div>
        <button onClick={onClose} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all">
          새로운 분석 및 테이블 생성
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden relative">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black text-slate-800 flex items-center">
              <i className="fa-solid fa-chart-line mr-3 text-emerald-500"></i>
              {schema.yAxisLabel} 통계 분석
            </h3>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
              Dynamic Schema Chart
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                   formatter={(value) => [new Intl.NumberFormat('ko-KR').format(Number(value)) + (schema.unit || ''), schema.yAxisLabel]}
                />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={4} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center px-2 underline decoration-emerald-200 underline-offset-4">
            실시간 생성 AI 인사이트
          </h3>
          <div className="space-y-4">
            {aiResults.insights.map((insight, idx) => (
              <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-emerald-500">
                <h4 className="font-black text-slate-800 text-sm mb-1">{insight.title}</h4>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">{insight.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[120px]"></div>
        <h3 className="text-3xl font-black mb-8 tracking-tighter">동적 데이터 기반 심층 시나리오</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {aiResults.recommendations.map((rec) => (
            <button key={rec.id} onClick={() => handleDeepDive(rec)} className="text-left p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-white/10 transition-all group">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-rocket text-white"></i>
              </div>
              <h4 className="font-black text-lg mb-2 group-hover:text-emerald-400">{rec.title}</h4>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">{rec.description}</p>
            </button>
          ))}
        </div>

        {(isAnalyzing || deepDive) && (
          <div className="bg-white/5 rounded-[2.5rem] p-10 border border-white/10 animate-fadeIn">
            {isAnalyzing ? (
              <div className="text-center py-10">
                <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-6"></div>
                <p className="font-black text-xl">동적 데이터 엔진 분석 리포트 생성 중...</p>
              </div>
            ) : deepDive && (
              <div className="space-y-8 max-w-4xl mx-auto">
                <div className="flex justify-between items-center border-b border-white/10 pb-6">
                  <h3 className="text-2xl font-black text-emerald-400">{deepDive.reportTitle}</h3>
                  <span className="bg-amber-500/20 text-amber-400 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/30">
                    Confidence: HIGH
                  </span>
                </div>
                <p className="text-slate-300 text-lg leading-relaxed font-medium italic">"{deepDive.summary}"</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deepDive.strategicSuggestions.map((s, i) => (
                    <div key={i} className="bg-white/5 p-5 rounded-2xl flex items-center space-x-4 border border-white/5">
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <i className="fa-solid fa-check text-[10px] text-white"></i>
                      </div>
                      <span className="text-sm font-bold text-slate-200">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
