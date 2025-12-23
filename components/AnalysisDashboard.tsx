
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.ts';
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
        console.log("Supabase 요청 시작...");

        const { data: residents, error: resError } = await supabase
          .from('foreign_residents_stats')
          .select('*');
        
        const { data: policies, error: polError } = await supabase
          .from('local_policies')
          .select('*');

        if (resError) throw new Error(`현황 데이터 조회 실패: ${resError.message}`);
        if (polError) throw new Error(`정책 데이터 조회 실패: ${polError.message}`);

        if (!residents || residents.length === 0) {
          setData([]);
          return;
        }

        const aggregated: Record<string, any> = {};

        residents.forEach((curr: any) => {
          const region = curr.region || '미분류';
          if (!aggregated[region]) aggregated[region] = { region, residents: 0, budget: 0 };
          aggregated[region].residents += (Number(curr.resident_count) || 0);
        });

        if (policies) {
          policies.forEach((p: any) => {
            if (aggregated[p.region]) {
              aggregated[p.region].budget += (Number(p.budget) || 0) / 1000000;
            }
          });
        }

        setData(Object.values(aggregated));
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
      <p className="text-slate-500 font-medium">데이터 로드 중...</p>
    </div>
  );

  if (error) return (
    <div className="p-10 bg-red-50 border border-red-200 rounded-3xl text-center max-w-2xl mx-auto">
      <i className="fa-solid fa-circle-exclamation text-red-500 text-4xl mb-4"></i>
      <h3 className="text-red-800 font-bold text-xl mb-2">Supabase 연결 오류</h3>
      <div className="bg-white p-4 rounded-xl text-left border border-red-100 text-xs text-red-600 overflow-auto mb-4">
        {error}
      </div>
      <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold">재시도</button>
    </div>
  );

  if (data.length === 0) return (
    <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
      <i className="fa-solid fa-database text-slate-300 text-4xl mb-4"></i>
      <h3 className="text-2xl font-bold text-slate-800 mb-2">데이터가 없습니다</h3>
      <p className="text-slate-500">SQL Editor에서 더미 데이터를 먼저 삽입해 주세요.</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm mb-1">분석 지역</p>
          <h4 className="text-3xl font-black text-blue-600">{data.length}개</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm mb-1">총 외국인</p>
          <h4 className="text-3xl font-black text-indigo-600">
            {data.reduce((acc, cur) => acc + cur.residents, 0).toLocaleString()}명
          </h4>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm mb-1">총 예산 (백만)</p>
          <h4 className="text-3xl font-black text-pink-600">
            {data.reduce((acc, cur) => acc + cur.budget, 0).toLocaleString()}
          </h4>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-[500px]">
        <h3 className="text-lg font-bold mb-6 text-slate-800">지역별 수급 현황 분석</h3>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="region" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
            <Legend />
            <Bar dataKey="residents" name="외국인 수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="budget" name="예산(백만원)" fill="#ec4899" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
