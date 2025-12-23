
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Cell
} from 'recharts';

export const AnalysisDashboard: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // 1. 외국인 현황 데이터와 정책 데이터 가져오기
        const { data: residents, error: resError } = await supabase.from('foreign_residents_stats').select('*');
        const { data: policies, error: polError } = await supabase.from('local_policies').select('*');

        if (resError || polError) {
          throw new Error('Supabase 연결에 실패했습니다. API 키를 확인하세요.');
        }

        if (!residents || residents.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        // 2. 지역별 데이터 병합
        const aggregated: Record<string, any> = {};

        residents.forEach((curr: any) => {
          const region = curr.region;
          if (!aggregated[region]) aggregated[region] = { region, residents: 0, budget: 0 };
          aggregated[region].residents += (curr.resident_count || 0);
        });

        if (policies) {
          policies.forEach((p: any) => {
            if (aggregated[p.region]) {
              aggregated[p.region].budget += (p.budget || 0) / 1000000; // 백만원 단위
            }
          });
        }

        const finalData = Object.values(aggregated).map((item: any) => ({
          ...item,
          ratio: item.residents > 0 ? (item.budget / item.residents * 1000).toFixed(2) : 0
        }));
        
        setData(finalData);
      } catch (err: any) {
        console.error(err);
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
      <p className="text-slate-500 font-medium animate-pulse">데이터베이스 분석 중...</p>
    </div>
  );

  if (error) return (
    <div className="p-10 bg-red-50 border border-red-200 rounded-2xl text-center">
      <i className="fa-solid fa-triangle-exclamation text-red-500 text-3xl mb-4"></i>
      <h3 className="text-red-800 font-bold mb-2">연결 오류</h3>
      <p className="text-red-600 text-sm">{error}</p>
      <p className="mt-4 text-xs text-slate-500">lib/supabase.ts 파일의 API 키 설정을 확인해 주세요.</p>
    </div>
  );

  if (data.length === 0) return (
    <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
      <i className="fa-solid fa-database text-slate-300 text-5xl mb-6"></i>
      <h3 className="text-xl font-bold text-slate-800 mb-2">데이터가 비어 있습니다</h3>
      <p className="text-slate-500 mb-8">데이터 수집 메뉴에서 파일을 업로드하거나 API를 동기화해 주세요.</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm mb-1">총 분석 지역</p>
          <h4 className="text-3xl font-black text-blue-600">{data.length}개</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm mb-1">총 등록 외국인</p>
          <h4 className="text-3xl font-black text-indigo-600">
            {data.reduce((acc, cur) => acc + cur.residents, 0).toLocaleString()}명
          </h4>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm mb-1">총 정책 예산</p>
          <h4 className="text-3xl font-black text-pink-600">
            {data.reduce((acc, cur) => acc + cur.budget, 0).toLocaleString()}백만
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">지역별 수급 불균형 현황</h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">LIVE DB</span>
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="region" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="residents" name="외국인 수" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="budget" name="예산(백만원)" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
