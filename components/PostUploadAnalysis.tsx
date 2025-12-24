
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

  // 동적 축 매핑 (데이터 엔지니어링 결과 반영)
  const chartData = data.slice(0, 20).map(d => ({
    name: String(d[schema.xAxisKey] || d.region || '미분류').substring(0, 6),
    value: Number(d[schema.yAxisKey] || 0)
  })).filter(d => d.value > 0);

  const handleDeepDive = async (rec: AIRecommendation) => {
    setIsAnalyzing(true);
    setDeepDive(null);
    setErrorMessage(null);
    try {
      const result = await getDeepDiveAnalysis(data, rec.title, schema);
      if (!result) {
        setErrorMessage("AI 할당량 초과 혹은 분석 오류가 발생했습니다.");
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
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg">
            <i className="fa-solid fa-microchip text-white text-2xl"></i>
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded-md uppercase">AI Cleansed Dataset</span>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{schema.datasetName}</h2>
            </div>
            <p className="text-slate-500 font-medium text-sm italic">정제 완료: {data.length}개의 레코드가 분석 레이크에 적재되었습니다.</p>
          </div>
        </div>
        <button onClick={onClose} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all">
          다른 데이터 업로드
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl">
          <div className="mb-10">
            <h3 className="text-xl font-black text-slate-800 mb-2">
              <i className="fa-solid fa-chart-simple mr-3 text-blue-500"></i>
              {schema.yAxisLabel} 분포 ({schema.unit})
            </h3>
            <p className="text-xs text-slate-400 font-bold">X축: {schema.xAxisKey} | Y축: {schema.yAxisKey}</p>
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
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                   formatter={(value) => [new Intl.NumberFormat('ko-KR').format(Number(value)) + schema.unit, schema.yAxisLabel]}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center px-2">
            AI 자동 인사이트
          </h3>
          <div className="space-y-4">
            {aiResults.insights.map((insight, idx) => (
              <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm border-l-4 border-l-indigo-500">
                <h4 className="font-black text-slate-800 text-sm mb-1">{insight.title}</h4>
                <p className="text-slate-500 text-xs leading-relaxed">{insight.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl overflow-hidden">
        <h3 className="text-2xl font-black mb-8">심층 분석 시나리오 선택</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {aiResults.recommendations.map((rec) => (
            <button key={rec.id} onClick={() => handleDeepDive(rec)} className="text-left p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all group">
              <i className="fa-solid fa-microscope text-blue-500 mb-4 text-xl"></i>
              <h4 className="font-black text-lg mb-2 group-hover:text-blue-400">{rec.title}</h4>
              <p className="text-slate-400 text-xs">{rec.description}</p>
            </button>
          ))}
        </div>

        {(isAnalyzing || deepDive) && (
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10 animate-fadeIn">
            {isAnalyzing ? (
              <div className="text-center py-10">
                <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="font-black">심층 데이터 사이언스 리포트 생성 중...</p>
              </div>
            ) : deepDive && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black text-blue-400 underline decoration-blue-500/30 underline-offset-8">{deepDive.reportTitle}</h3>
                <p className="text-slate-300 font-medium leading-relaxed italic">"{deepDive.summary}"</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deepDive.strategicSuggestions.map((s, i) => (
                    <div key={i} className="bg-white/5 p-4 rounded-xl flex items-center space-x-3">
                      <i className="fa-solid fa-circle-check text-blue-500 text-xs"></i>
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
