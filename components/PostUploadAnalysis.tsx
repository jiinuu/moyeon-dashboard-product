
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AIInsight, AIRecommendation } from '../lib/aiService.ts';

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
  const chartData = data.slice(0, 8).map(d => ({
    name: d.region || '미정',
    value: type === 'residents' ? d.resident_count : d.budget / 1000000
  }));

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-50 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center">
          <div>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block">
              업로드 데이터 분석 결과
            </span>
            <h2 className="text-2xl font-black text-slate-800">
              {type === 'residents' ? '외국인 거주 분포' : '정책 예산 집행'} 초동 분석
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <i className="fa-solid fa-xmark text-2xl text-slate-400"></i>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-8 space-y-8">
          {/* Quick Stats & Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-6">주요 지역별 데이터 (상위 8개)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Bar dataKey="value" fill={type === 'residents' ? '#3b82f6' : '#ec4899'} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 flex items-center">
                <i className="fa-solid fa-wand-magic-sparkles mr-2 text-indigo-500"></i>
                AI 생성 데이터 인사이트
              </h3>
              {aiResults?.insights.map((insight, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border-l-4 border-l-indigo-500 border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 text-sm mb-1">{insight.title}</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">{insight.content}</p>
                </div>
              ))}
              {!aiResults && <div className="animate-pulse bg-slate-200 h-32 rounded-xl"></div>}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <i className="fa-solid fa-compass mr-2 text-blue-500"></i>
              다음 분석을 추천합니다
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {aiResults?.recommendations.map((rec) => (
                <button key={rec.id} className="text-left bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all group">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                    <i className={`${rec.icon} text-blue-600 group-hover:text-white`}></i>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-2">{rec.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{rec.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">
            분석 완료 및 대시보드 반영
          </button>
        </div>
      </div>
    </div>
  );
};
