
import React, { useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import * as XLSX from 'xlsx';
import { identifyDataStructure, analyzeUploadedData, AIInsight, AIRecommendation, SchemaMapping } from '../lib/aiService.ts';
import { PostUploadAnalysis } from './PostUploadAnalysis.tsx';

export const DataManagement: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [lastUploadedData, setLastUploadedData] = useState<any[]>([]);
  const [aiResults, setAiResults] = useState<{ insights: AIInsight[], recommendations: AIRecommendation[] } | null>(null);
  const [currentSchema, setCurrentSchema] = useState<SchemaMapping | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorDetails(null);
    try {
      setIsUploading(true);
      setUploadStatus('AI 엔진 시동 중...');

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawJson = XLSX.utils.sheet_to_json(sheet);

      if (rawJson.length === 0) throw new Error("파일에 데이터가 없습니다.");

      // 1. AI에게 데이터 성격 판단 및 컬럼 매핑 요청
      setUploadStatus('AI가 데이터의 맥락을 읽고 있습니다...');
      const schema = await identifyDataStructure(rawJson);
      setCurrentSchema(schema);
      
      setUploadStatus(`감지됨: ${schema.targetTable === 'residents' ? '인구 통계' : '정책 예산'} (${rawJson.length}건)`);

      // 2. 스키마 매핑 및 데이터 정제
      const mappedData = rawJson.map((row: any) => {
        // AI가 제공한 맵을 기반으로 역추적하여 데이터 추출
        const getVal = (dbKey: string) => {
          const originalKey = Object.keys(schema.columnMap).find(k => schema.columnMap[k] === dbKey);
          return row[originalKey || ''] || row[dbKey] || null;
        };

        const cleanObj: any = {
          region: getVal('region') || '알 수 없음',
          source_type: 'FILE',
          raw_data: row
        };

        if (schema.targetTable === 'residents') {
          cleanObj.resident_count = parseInt(String(getVal('resident_count') || '0').replace(/[^0-9]/g, ''));
          cleanObj.nationality = getVal('nationality') || '미분류';
          cleanObj.visa_type = getVal('visa_type') || '기타';
        } else {
          cleanObj.budget = parseInt(String(getVal('budget') || '0').replace(/[^0-9]/g, ''));
          cleanObj.title = getVal('title') || '제목 없음';
        }
        return cleanObj;
      });

      const table = schema.targetTable === 'residents' ? 'foreign_residents_stats' : 'local_policies';
      
      setUploadStatus(`DB 동적 스키마 최적화 적재 중...`);
      const { error } = await supabase.from(table).insert(mappedData);
      
      if (error) {
        if (error.message.includes('row-level security')) {
          throw new Error("Supabase 보안 정책(RLS) 에러. SQL Editor에서 테이블 접근 권한을 허용해야 합니다.");
        }
        throw error;
      }

      setLastUploadedData(mappedData);
      setUploadStatus('AI 분석 리포트 생성 중...');
      
      const aiResponse = await analyzeUploadedData(mappedData, schema.targetTable);
      setAiResults(aiResponse);
      setShowAnalysis(true);

    } catch (err: any) {
      setUploadStatus('처리 중 오류가 발생했습니다.');
      setErrorDetails(err.message);
      console.error(err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fadeIn">
      {showAnalysis && (
        <PostUploadAnalysis 
          data={lastUploadedData} 
          type={currentSchema?.targetTable || 'residents'} 
          aiResults={aiResults} 
          onClose={() => setShowAnalysis(false)} 
        />
      )}

      <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        <div className="relative z-10 text-center">
          <div className="mb-10">
            <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">자율형 데이터 수집기</h2>
            <p className="text-slate-500 font-bold text-lg">엑셀을 던지면 AI가 읽고 분석합니다.</p>
          </div>

          <div className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-20 text-center hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer relative mb-10 overflow-hidden group/box">
            <div className="w-28 h-28 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-200 group-hover/box:scale-110 group-hover/box:rotate-3 transition-transform duration-500">
              <i className="fa-solid fa-cloud-bolt text-5xl text-white"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-4">분석할 파일을 이곳에 드롭하세요</h3>
            <p className="text-slate-400 mb-12 max-w-sm mx-auto font-bold leading-relaxed">AI가 어떤 양식의 데이터라도 스스로 해석하여 시스템에 통합합니다.</p>
            
            <label className={`relative z-10 cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''} bg-slate-900 text-white px-16 py-6 rounded-2xl font-black shadow-2xl hover:bg-blue-700 hover:-translate-y-1 transition-all inline-block active:scale-95`}>
              {isUploading ? (
                <span className="flex items-center">
                  <i className="fa-solid fa-gear fa-spin mr-3 text-blue-400"></i> AI 엔진 가동 중...
                </span>
              ) : '분석 엔진 시작하기'}
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx" disabled={isUploading} />
            </label>
          </div>

          {(uploadStatus || errorDetails) && (
            <div className={`p-8 rounded-[2rem] border animate-fadeIn transition-all ${
              errorDetails ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200 shadow-inner'
            }`}>
              <div className="flex items-center justify-center mb-2">
                <i className={`fa-solid ${errorDetails ? 'fa-circle-xmark text-red-500' : 'fa-wand-sparkles text-blue-500 animate-pulse'} text-2xl mr-3`}></i>
                <p className={`font-black text-lg ${errorDetails ? 'text-red-700' : 'text-blue-700'}`}>{uploadStatus}</p>
              </div>
              {errorDetails && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-red-100 text-left">
                   <p className="text-red-600 font-bold text-sm mb-2">시스템 오류 로그:</p>
                   <code className="text-xs text-red-400 block break-all">{errorDetails}</code>
                   {errorDetails.includes('API Key') && (
                     <p className="mt-4 text-xs text-amber-600 font-black flex items-center">
                       <i className="fa-solid fa-lightbulb mr-2"></i>
                       상단 메뉴의 'API KEY 설정' 버튼을 눌러 키를 먼저 선택해 주세요!
                     </p>
                   )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl border border-white/5 relative overflow-hidden">
          <i className="fa-solid fa-microchip absolute -right-10 -bottom-10 text-[12rem] opacity-5 -rotate-12"></i>
          <h4 className="font-black text-xl mb-4 flex items-center text-blue-400">
            <i className="fa-solid fa-shield-virus mr-3"></i> 자율 정제 시스템
          </h4>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            LLM이 엑셀의 헤더와 데이터를 대조하여 비정형 데이터를 정형 데이터로 실시간 변환합니다. 
            존재하지 않는 컬럼으로 인한 DB 에러를 99% 차단합니다.
          </p>
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-10 rounded-[2.5rem] text-white shadow-2xl border border-white/10">
          <h4 className="font-black text-xl mb-4 flex items-center text-indigo-100">
            <i className="fa-solid fa-bolt-lightning mr-3"></i> 실시간 분석 리포트
          </h4>
          <p className="text-indigo-100 text-sm leading-relaxed font-medium opacity-80">
            단순 적재에 그치지 않고, 업로드 즉시 AI가 데이터의 특이점(Anomaly)을 발견하여 
            지자체별 맞춤형 정책 제언 리포트를 생성합니다.
          </p>
        </div>
      </div>
    </div>
  );
};
