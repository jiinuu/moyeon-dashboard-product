
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

export const AnalysisDashboard: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        console.log("Fetching data from Supabase...");

        // 1. 외국인 현황 데이터와 정책 데이터 가져오기
        const { data: residents, error: resError } = await supabase
          .from('foreign_residents_stats')
          .select('*');
        
        const { data: policies, error: polError } = await supabase
          .from('local_policies')
          .select('*');

        if (resError) throw new Error(`현황 데이터 로드 실패: ${resError.message}`);
        if (polError) throw new Error(`정책 데이터 로드 실패: ${polError.message}`);

        console.log("Raw Residents:", residents);
        console.log("Raw Policies:", policies);

        if (!residents || residents.length === 0) {
          setData([]);
          return;
        }

        // 2. 지역별 데이터 병합
        const aggregated: Record<string, any> = {};

        residents.forEach((curr: any) => {
          const region = curr.region || '미분류';
          if (!aggregated[region]) aggregated[region] = { region, residents: 0, budget: 0 };
          aggregated[region].residents += (Number(curr.resident_count) || 0);
        });

        if (policies) {
          policies.forEach((p: any) => {
            if (aggregated[p.region]) {
              aggregated[p.region].budget += (Number(p.budget) || 0) / 1000000; // 백만원 단위
            }
          });
        }

        const finalData = Object.values(aggregated);
        setData(finalData);
      } catch (err: any) {
        console.error("Dashboard Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-slate-500 font-medium">데이터베이스 연결 중...</p>
    </div>
  );

  if (error) return (
    <div className="p-10 bg-red-50 border border-red-200 rounded-3xl text-center max-w-2xl mx-auto shadow-lg">
      <i className="fa-solid fa-circle-exclamation text-red-500 text-4xl mb-4"></i>
      <h3 className="text-red-800 font-bold text-xl mb-2">시스템 연결 오류</h3>
      <div className="bg-white p-4 rounded-xl text-left border border-red-100 mb-6">
        <code className="text-xs text-red-600 block break-all">{error}</code>
      </div>
      <p className="text-slate-600 text-sm mb-6">
        Supabase 설정이나 테이블 생성이 완료되었는지 확인해 주세요.
      </p>
      <button 
        onClick={() => window.location.reload()}
        className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-colors"
      >
        새로고침 시도
      </button>
    </div>
  );

  if (data.length === 0) return (
    <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm animate-fadeIn">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <i className="fa-solid fa-database text-slate-300 text-4xl"></i>
      </div>
      <h3 className="text-2xl font-bold text-slate-800 mb-2">DB에 데이터가 없습니다</h3>
      <p className="text-slate-500 mb-8 max-w-md mx-auto">
        테이블은 생성되었으나 내용이 비어있습니다. <br/>'데이터 수집/관리' 탭에서 데이터를 추가해 주세요.
      </p>
      <div className="flex justify-center space-x-3 text-xs text-slate-400">
        <span className="bg-slate-100 px-3 py-1 rounded-full">Table: foreign_residents_stats</span>
        <span className="bg-slate-100 px-3 py-1 rounded-full">Table: local_policies</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 상단 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <p className="text-slate-500 text-sm font-medium mb-1">분석 대상 지역</p>
          <h4 className="text-3xl font-black text-blue-600">{data.length}개 지역</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <p className="text-slate-500 text-sm font-medium mb-1">총 외국인 수</p>
          <h4 className="text-3xl font-black text-indigo-600">
            {data.reduce((acc, cur) => acc + cur.residents, 0).toLocaleString()}명
          </h4>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <p className="text-slate-500 text-sm font-medium mb-1">총 예산 규모</p>
          <h4 className="text-3xl font-black text-pink-600">
            {data.reduce((acc, cur) => acc + cur.budget, 0).toLocaleString()}백만
          </h4>
        </div>
      </div>

      {/* 차트 영역 */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-bold text-slate-800">지역별 수급 현황 (Demand vs Supply)</h3>
            <p className="text-sm text-slate-500 mt-1">외국인 수와 정책 예산 간의 상관관계를 분석합니다.</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-xs text-slate-500">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span> 외국인 수
            </div>
            <div className="flex items-center text-xs text-slate-500">
              <span className="w-3 h-3 bg-pink-500 rounded-full mr-1"></span> 예산
            </div>
          </div>
        </div>
        
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="region" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Legend verticalAlign="top" align="right" height={36}/>
              <Bar dataKey="residents" name="외국인 수(명)" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
              <Bar dataKey="budget" name="예산(백만원)" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
