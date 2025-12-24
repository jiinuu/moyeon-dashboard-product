
import React, { useState } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { AnalysisResponse, getDeepDiveAnalysis, SchemaMapping, ChartConfig } from '../lib/aiService.ts';

interface Props {
  data: any[];
  schema: SchemaMapping;
  aiResults: AnalysisResponse;
  onClose: () => void;
}

export const PostUploadAnalysis: React.FC<Props> = ({ data, schema, aiResults, onClose }) => {
  const [deepDive, setDeepDive] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const renderChart = (config: ChartConfig) => {
    // 차트 데이터 가공 (상위 15개)
    const chartData = data.slice(0, 15).map(item => ({
      name: String(item[config.xAxisKey] || 'N/A').substring(0, 10),
      value: Number(item[config.yAxisKey] || 0)
    }));

    // Fix: Changed width to a number to avoid CartesianChartProps type error ("100%" string literal widening).
    // ResponsiveContainer will handle the actual layout width.
    const commonProps = {
      width: 500,
      height: 300,
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    switch (config.type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Bar dataKey="value" fill={config.color} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
            <Line type="monotone" dataKey="value" stroke={config.color} strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart width={commonProps.width} height={300}>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? config.color : '#cbd5e1'} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
      case 'area':
      default:
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`color-${config.xAxisKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={config.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke={config.color} fill={`url(#color-${config.xAxisKey})`} strokeWidth={3} />
          </AreaChart>
        );
    }
  };

  const handleDeepDive = async (title: string) => {
    setIsAnalyzing(true);
    try {
      const res = await getDeepDiveAnalysis(data, title, schema);
      setDeepDive(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="animate-fadeIn space-y-8 pb-20">
      {/* 상단 섹션: 요약 */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
              <i className="fa-solid fa-file-waveform text-xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{schema.datasetName}</h2>
              <p className="text-slate-500 text-sm font-medium">AI 자율 분석 리포트</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-2xl"></i>
          </button>
        </div>
        <p className="text-slate-600 leading-relaxed font-medium bg-slate-50 p-6 rounded-2xl border border-slate-100">
          {aiResults.summary}
        </p>
      </div>

      {/* 중단 섹션: 동적 차트 & 인사이트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {aiResults.charts.map((config, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-lg">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center">
              <span className="w-2 h-6 bg-blue-500 rounded-full mr-3"></span>
              {config.title}
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart(config)}
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* 인사이트 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {aiResults.insights.map((insight, idx) => (
          <div key={idx} className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm border-t-4 border-t-blue-500">
            <div className="flex items-center mb-3">
              <i className={`fa-solid ${insight.type === 'alert' ? 'fa-triangle-exclamation text-amber-500' : 'fa-chart-line text-blue-500'} mr-2`}></i>
              <h4 className="font-black text-slate-800">{insight.title}</h4>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">{insight.content}</p>
          </div>
        ))}
      </div>

      {/* 추천 시나리오 & 심층 분석 */}
      <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl overflow-hidden relative">
        <h3 className="text-3xl font-black mb-10 tracking-tighter">데이터 기반 대응 전략</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {aiResults.recommendations.map((rec) => (
            <button key={rec.id} onClick={() => handleDeepDive(rec.title)} className="text-left p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all group">
              <h4 className="font-black text-lg mb-2 group-hover:text-blue-400">{rec.title}</h4>
              <p className="text-slate-400 text-xs leading-relaxed">{rec.description}</p>
            </button>
          ))}
        </div>

        {(isAnalyzing || deepDive) && (
          <div className="mt-12 bg-white/5 rounded-[2.5rem] p-10 border border-white/10 animate-fadeIn">
            {isAnalyzing ? (
              <div className="text-center py-10">
                <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="font-bold">심층 전략 리포트 생성 중...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-2xl font-black text-blue-400 border-b border-white/10 pb-4">{deepDive.reportTitle}</h3>
                <p className="text-slate-300 leading-relaxed font-medium">{deepDive.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deepDive.strategicSuggestions.map((s: string, i: number) => (
                    <div key={i} className="flex items-start space-x-3 bg-white/5 p-4 rounded-xl">
                      <i className="fa-solid fa-check-circle text-blue-500 mt-1"></i>
                      <span className="text-sm text-slate-200">{s}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">Risk Factor</p>
                  <p className="text-sm text-amber-200 font-medium">{deepDive.riskFactor}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
