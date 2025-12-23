
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
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
      try {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } catch (e) {
        setHasKey(false);
      }
    } else {
      const envKey = (process as any).env.API_KEY;
      setHasKey(!!envKey && envKey !== "undefined" && envKey !== "");
    }
  };

  useEffect(() => {
    checkKeyStatus();
    const interval = setInterval(checkKeyStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        setHasKey(true);
      } catch (err) {
        console.error("Failed to open key selection:", err);
      }
    } else {
      alert("API 키 설정 대화상자를 열 수 없습니다.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorDetails(null);
    try {
      setIsUploading(true);
      setUploadStatus('데이터 엔진 시동 중...');

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawJson = XLSX.utils.sheet_to_json(sheet);

      if (rawJson.length === 0) throw new Error("파일에 데이터가 없습니다.");

      setUploadStatus('AI가 데이터의 맥락을 분석하고 있습니다...');
      const schema = await identifyDataStructure(rawJson);
      setCurrentSchema(schema);
      
      setUploadStatus(`${schema.targetTable === 'residents' ? '인구 현황' : '정책 예산'} 데이터 감지됨...`);

      const mappedData = rawJson.map((row: any) => {
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
      
      setUploadStatus(`DB 최적화 적재 중...`);
      const { error } = await supabase.from(table).insert(mappedData);
      
      if (error) throw error;

      setLastUploadedData(mappedData);
      setUploadStatus('AI 전략 분석 리포트 생성 중...');
      
      const aiResponse = await analyzeUploadedData(mappedData, schema.targetTable);
      setAiResults(aiResponse);
      setShowAnalysis(true);

    } catch (err: any) {
      setUploadStatus('처리 중 오류가 발생했습니다.');
      setErrorDetails(err.message || '알 수 없는 오류');
      if (err.message && (err.message.includes('API Key') || err.message.includes('401'))) {
        setHasKey(false);
      }
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
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

      <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        <div className="relative z-10 text-center">
          <div className="mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4 tracking-tight">자율형 데이터 수집기</h2>
            <p className="text-slate-500 font-bold text-lg">어떤 양식의 엑셀이든 AI가 스스로 이해하고 적재합니다.</p>
          </div>

          {!hasKey ? (
            <div className="bg-slate-50 border-4 border-dashed border-blue-200 rounded-[2.5rem] p-10 md:p-20 text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-key text-4xl text-blue-600"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4">분석을 위해 AI 키가 필요합니다</h3>
              <p className="text-slate-500 mb-10 max-w-sm mx-auto font-medium">분석 엔진을 가동하려면 Google Gemini API 키를 선택해야 합니다.</p>
              <button 
                onClick={handleOpenKey}
                className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black shadow-xl hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95"
              >
                API 키 설정하기
              </button>
            </div>
          ) : (
            <div className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-10 md:p-20 text-center hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer relative mb-10 overflow-hidden group/box">
              <div className="w-28 h-28 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-200 group-hover/box:scale-110 transition-transform">
                <i className="fa-solid fa-file-excel text-5xl text-white"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4">파일을 선택하거나 드래그하세요</h3>
              <p className="text-slate-400 mb-12 max-w-sm mx-auto font-bold leading-relaxed text-sm">데이터 구조에 상관없이 AI가 자동으로 스키마를 매핑합니다.</p>
              
              <label className={`relative z-10 cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''} bg-slate-900 text-white px-10 sm:px-16 py-6 rounded-2xl font-black shadow-2xl hover:bg-blue-700 transition-all inline-block`}>
                {isUploading ? (
                  <span className="flex items-center">
                    <i className="fa-solid fa-atom fa-spin mr-3 text-blue-400"></i> AI 분석 중...
                  </span>
                ) : '데이터 파일 선택'}
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx" disabled={isUploading} />
              </label>
            </div>
          )}

          {(uploadStatus || errorDetails) && (
            <div className={`p-8 rounded-[2rem] border animate-fadeIn mt-6 ${
              errorDetails ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-center mb-2">
                <i className={`fa-solid ${errorDetails ? 'fa-circle-xmark text-red-500' : 'fa-wand-sparkles text-blue-500 animate-pulse'} text-2xl mr-3`}></i>
                <p className={`font-black text-lg ${errorDetails ? 'text-red-700' : 'text-blue-700'}`}>{uploadStatus}</p>
              </div>
              {errorDetails && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-red-100 text-left">
                  <p className="text-red-500 font-bold text-sm mb-1">상세 에러:</p>
                  <code className="text-xs text-red-400 block whitespace-pre-wrap">{errorDetails}</code>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
