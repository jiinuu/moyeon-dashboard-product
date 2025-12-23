
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import * as XLSX from 'xlsx';
import { identifyDataStructure, analyzeUploadedData, AIInsight, AIRecommendation, SchemaMapping } from '../lib/aiService.ts';
import { PostUploadAnalysis } from './PostUploadAnalysis.tsx';

export const DataManagement: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(true);
  
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [lastUploadedData, setLastUploadedData] = useState<any[]>([]);
  const [aiResults, setAiResults] = useState<{ insights: AIInsight[], recommendations: AIRecommendation[] } | null>(null);
  const [currentSchema, setCurrentSchema] = useState<SchemaMapping | null>(null);

  const checkKeyStatus = async () => {
    try {
      const manualKey = localStorage.getItem('GEMINI_API_KEY');
      if (manualKey && manualKey.length > 20) {
        setHasKey(true);
        return;
      }
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
        return;
      }
      const envKey = (process as any).env.API_KEY;
      setHasKey(!!envKey && envKey !== "undefined" && envKey !== "");
    } catch (e) {
      setHasKey(false);
    }
  };

  useEffect(() => {
    checkKeyStatus();
    const interval = setInterval(checkKeyStatus, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorDetails(null);
    try {
      setIsUploading(true);
      setUploadStatus('시니어 데이터 엔진 가동 중...');

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawJson = XLSX.utils.sheet_to_json(sheet);

      if (rawJson.length === 0) throw new Error("파일에 데이터가 없습니다.");

      setUploadStatus('AI가 데이터 스키마를 자율 매핑 중입니다...');
      const schema = await identifyDataStructure(rawJson);
      setCurrentSchema(schema);
      
      setUploadStatus(`분석 결과: ${schema.targetTable === 'residents' ? '인구 통계' : '정책 예산'} 스키마 확정.`);

      // 전처리 로직: 매핑 배열을 객체로 변환하여 처리
      const columnMapObj = schema.mappings.reduce((acc, m) => {
        acc[m.source] = m.target;
        return acc;
      }, {} as Record<string, string>);

      const mappedData = rawJson.map((row: any) => {
        const getVal = (dbKey: string) => {
          const originalKey = Object.keys(columnMapObj).find(k => columnMapObj[k] === dbKey);
          return row[originalKey || ''] || row[dbKey] || null;
        };

        const cleanObj: any = {
          region: getVal('region') || '기타',
          source_type: 'FILE',
          raw_data: row
        };

        if (schema.targetTable === 'residents') {
          cleanObj.resident_count = parseInt(String(getVal('resident_count') || '0').replace(/[^0-9]/g, '')) || 0;
          cleanObj.nationality = getVal('nationality') || '미분류';
          cleanObj.visa_type = getVal('visa_type') || '기타';
        } else {
          cleanObj.budget = parseInt(String(getVal('budget') || '0').replace(/[^0-9]/g, '')) || 0;
          cleanObj.title = getVal('title') || '제목 없음';
        }
        return cleanObj;
      });

      const table = schema.targetTable === 'residents' ? 'foreign_residents_stats' : 'local_policies';
      
      setUploadStatus(`데이터 레이크에 최적화 적재 중...`);
      const { error } = await supabase.from(table).insert(mappedData);
      
      if (error) throw error;

      setLastUploadedData(mappedData);
      setUploadStatus('AI가 맞춤형 분석 대시보드를 구축하고 있습니다...');
      
      const aiResponse = await analyzeUploadedData(mappedData, schema.targetTable);
      setAiResults(aiResponse);
      setShowAnalysis(true); // 즉시 분석 창 표시

    } catch (err: any) {
      setUploadStatus('시스템 오류가 발생했습니다.');
      setErrorDetails(err.message || '알 수 없는 오류');
      console.error(err);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fadeIn">
      {showAnalysis && aiResults && (
        <PostUploadAnalysis 
          data={lastUploadedData} 
          type={currentSchema?.targetTable || 'residents'} 
          aiResults={aiResults} 
          onClose={() => setShowAnalysis(false)} 
        />
      )}

      {!showAnalysis && (
        <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
          
          <div className="relative z-10 text-center">
            <div className="mb-12">
              <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">Enterprise Data Ingestion</span>
              <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">자율형 정책 데이터 수집기</h2>
              <p className="text-slate-500 font-bold text-lg">AI가 데이터의 맥락을 읽고 자동으로 전처리 및 시나리오를 구성합니다.</p>
            </div>

            {!hasKey ? (
              <div className="bg-slate-50 border-4 border-dashed border-blue-200 rounded-[3rem] p-20 text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <i className="fa-solid fa-key text-4xl text-blue-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-4">분석 엔진이 비활성화 상태입니다</h3>
                <p className="text-slate-500 mb-10 max-w-sm mx-auto font-medium leading-relaxed">상단 우측의 API 키 설정을 완료하면 시니어 데이터 엔지니어의 자율 분석 기능이 활성화됩니다.</p>
              </div>
            ) : (
              <div className="border-4 border-dashed border-slate-100 rounded-[3rem] p-20 text-center hover:border-blue-400 hover:bg-blue-50/10 transition-all cursor-pointer relative mb-10 overflow-hidden group/box">
                <div className="w-28 h-28 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-200 group-hover/box:scale-105 transition-transform duration-500">
                  <i className="fa-solid fa-cloud-arrow-up text-5xl text-white"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-4">분석할 엑셀/CSV 파일을 업로드하세요</h3>
                <p className="text-slate-400 mb-12 max-w-sm mx-auto font-bold leading-relaxed">컬럼명이나 데이터 구조를 수정할 필요가 없습니다. AI가 알아서 매핑합니다.</p>
                
                <label className={`relative z-10 cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''} bg-slate-900 text-white px-16 py-6 rounded-2xl font-black shadow-2xl hover:bg-blue-700 transition-all inline-block active:scale-95`}>
                  {isUploading ? (
                    <span className="flex items-center">
                      <i className="fa-solid fa-microchip fa-spin mr-3 text-blue-400"></i> 엔진 분석 중...
                    </span>
                  ) : '데이터 사이언스 엔진 시작'}
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx" disabled={isUploading} />
                </label>
              </div>
            )}

            {uploadStatus && (
              <div className={`p-8 rounded-[2rem] border animate-fadeIn mt-6 ${
                errorDetails ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-center">
                  <i className={`fa-solid ${errorDetails ? 'fa-triangle-exclamation text-red-500' : 'fa-wand-magic-sparkles text-blue-500 animate-pulse'} text-2xl mr-3`}></i>
                  <p className={`font-black text-lg ${errorDetails ? 'text-red-700' : 'text-blue-700'}`}>{uploadStatus}</p>
                </div>
                {errorDetails && (
                  <div className="mt-4 p-4 bg-white rounded-xl border border-red-100 text-left">
                    <code className="text-xs text-red-500 block whitespace-pre-wrap font-mono">{errorDetails}</code>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
