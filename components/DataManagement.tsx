
import React, { useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import * as XLSX from 'xlsx';
import { analyzeUploadedData, AIInsight, AIRecommendation } from '../lib/aiService.ts';
import { PostUploadAnalysis } from './PostUploadAnalysis.tsx';

type IngestionType = 'residents' | 'policies';

export const DataManagement: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<IngestionType>('residents');
  
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [lastUploadedData, setLastUploadedData] = useState<any[]>([]);
  const [aiResults, setAiResults] = useState<{ insights: AIInsight[], recommendations: AIRecommendation[] } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadStatus('Excel 데이터 추출 중...');

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) throw new Error("파일에 데이터가 없습니다.");

      setUploadStatus(`DB 적재 시도 (${jsonData.length}건)...`);

      const mappedData = jsonData.map((row: any) => ({
        region: row['지역'] || row['region'] || '알 수 없음',
        resident_count: parseInt(row['인원'] || row['count'] || '0'),
        nationality: row['국적'] || row['nationality'] || '미분류',
        visa_type: row['비자'] || row['visa_type'] || '기타',
        budget: parseInt(row['예산'] || row['budget'] || '0'),
        title: row['사업명'] || row['title'] || '제목 없음',
        source_type: 'FILE',
        raw_data: row
      }));

      const table = targetType === 'residents' ? 'foreign_residents_stats' : 'local_policies';
      const { error } = await supabase.from(table).insert(mappedData);
      
      if (error) {
        if (error.message.includes('row-level security')) {
          throw new Error("보안 정책(RLS) 에러가 발생했습니다. Supabase SQL Editor에서 이전 가이드에 드린 POLICY 설정 SQL을 먼저 실행해 주세요.");
        }
        throw error;
      }

      setLastUploadedData(mappedData);
      setUploadStatus('적재 성공! AI 지능형 분석 엔진을 가동합니다...');
      
      const aiResponse = await analyzeUploadedData(mappedData, targetType);
      setAiResults(aiResponse);
      setShowAnalysis(true);

    } catch (err: any) {
      setUploadStatus(`오류 발생: ${err.message}`);
      console.error(err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {showAnalysis && (
        <PostUploadAnalysis 
          data={lastUploadedData} 
          type={targetType} 
          aiResults={aiResults} 
          onClose={() => setShowAnalysis(false)} 
        />
      )}

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">지능형 데이터 허브</h2>
            <p className="text-slate-500 font-medium">수작업 엑셀 데이터를 AI가 정제하고 분석 리포트를 즉시 생성합니다.</p>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <button 
              onClick={() => setTargetType('residents')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${targetType === 'residents' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >현황 업로드</button>
            <button 
              onClick={() => setTargetType('policies')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${targetType === 'policies' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >정책 업로드</button>
          </div>
        </div>

        <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-16 text-center hover:border-blue-200 hover:bg-blue-50/20 transition-all group cursor-pointer relative">
          <div className="w-24 h-24 bg-blue-100/50 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
            <i className="fa-solid fa-file-invoice text-4xl text-blue-600"></i>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-4">분석할 Excel/CSV 파일을 선택하세요</h3>
          <p className="text-slate-400 mb-10 max-w-sm mx-auto font-medium">AI가 컬럼을 자동으로 매핑하고 지역별 불일치(Mismatch) 요소를 탐색합니다.</p>
          
          <label className={`relative z-10 cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''} bg-slate-900 text-white px-12 py-5 rounded-[1.5rem] font-black shadow-2xl hover:bg-blue-600 hover:shadow-blue-200 transition-all inline-block active:scale-95`}>
            {isUploading ? (
              <span className="flex items-center">
                <i className="fa-solid fa-circle-notch fa-spin mr-3"></i> 데이터 엔진 가동 중...
              </span>
            ) : '파일 업로드 및 AI 분석 시작'}
            <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx" disabled={isUploading} />
          </label>
        </div>

        {uploadStatus && (
          <div className={`mt-10 p-6 rounded-2xl border flex items-center shadow-sm animate-fadeIn ${
            uploadStatus.includes('오류') ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'
          }`}>
            <i className={`fa-solid ${uploadStatus.includes('오류') ? 'fa-triangle-exclamation' : 'fa-info-circle'} mr-4 text-xl`}></i>
            <p className="font-bold text-sm leading-relaxed">{uploadStatus}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl">
           <h4 className="font-bold mb-4 flex items-center text-blue-400">
             <i className="fa-solid fa-shield-halved mr-2"></i> RLS 보안 정책 가이드
           </h4>
           <p className="text-xs text-slate-400 leading-relaxed">
             업로드 시 "security policy" 에러가 발생하면, Supabase 대시보드 &gt; SQL Editor에서 
             <b>ALTER TABLE ... ENABLE ROW LEVEL SECURITY</b> 및 <b>CREATE POLICY ...</b> 구문을 실행해야 합니다. 
             이는 비인증 사용자의 무분별한 DB 접근을 막기 위한 시니어급 보안 설계입니다.
           </p>
        </div>
        <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
           <h4 className="font-bold mb-4 flex items-center text-indigo-200">
             <i className="fa-solid fa-bolt mr-2"></i> AI 전처리 엔진 v2.0
           </h4>
           <p className="text-xs text-indigo-100 leading-relaxed">
             업로드 데이터의 국적, 비자 타입, 예산 항목을 AI가 실시간으로 분류합니다. 
             전처리가 완료되면 즉시 심화 분석 대시보드가 활성화됩니다.
           </p>
           <i className="fa-solid fa-brain absolute -right-6 -bottom-6 text-8xl opacity-10 rotate-12"></i>
        </div>
      </div>
    </div>
  );
};
