
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Line, Area
} from 'recharts';

export const AnalysisDashboard: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // 1. 외국인 현황 데이터와 정책 데이터를 병합하여 미스매치 지수 산출
      const { data: residents } = await supabase.from('foreign_residents_stats').select('*');
      const { data: policies } = await supabase.from('local_policies').select('*');

      // 간단한 지역별 그룹화 로직 (실제 서비스에서는 SQL View나 RPC 활용 권장)
      if (residents && policies) {
        const aggregated = residents.reduce((acc: any, curr: any) => {
          const region = curr.region;
          if (!acc[region]) acc[region] = { region, residents: 0, budget: 0 };
          acc[region].residents += curr.resident_count;
          return acc;
        }, {});

        policies.forEach((p: any) => {
          if (aggregated[p.region]) {
            aggregated[p.region].budget += p.budget / 1000000; // 백만원 단위 변환
          }
        });

        const finalData = Object.values(aggregated).map((item: any) => ({
          ...item,
          ratio: item.residents > 0 ? (item.budget / item.residents * 1000).toFixed(2) : 0
        }));
        
        setData(finalData);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-20 text-center">데이터를 불러오는 중...</div>;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 기존 대시보드 UI 레이아웃 유지, data 변수 사용 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">지역별 실시간 현황 (DB 연동됨)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="region" />
                <YAxis yAxisId="left" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="residents" name="외국인 수" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="left" dataKey="budget" name="예산 (백만원)" fill="#ec4899" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* 생략: 다른 차트들도 data 변수를 활용하여 렌더링 */}
      </div>
    </div>
  );
};
