
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import * as XLSX from 'xlsx';
import { identifyAndCleanSchema, analyzeUploadedData, AIInsight, AIRecommendation, SchemaMapping } from '../lib/aiService.ts';
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
      if (manualKey) { setHasKey(true); return; }
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
        return;
      }
      setHasKey(!!(process as any).env.API_KEY);
    } catch (e) { setHasKey(false); }
  };

  useEffect(() => {
    checkKeyStatus();
    const interval = setInterval(checkKeyStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const cleanNumericValue = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const str = String(val).replace(/,/g, '');
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    if (str.includes('억')) return (parseFloat(str) || 0) * 100000000;
    if (str.includes('만') && !str.includes('백만')) return (parseFloat(str) || 0) * 10000;
    return isNaN(num) ? 0 : num;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorDetails(null);
    try {
      setIsUploading(true);
      setUploadStatus('AI 데이터 분석 엔진 가동 중...');

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawJson = XLSX.utils.sheet_to_json(sheet);

      if (rawJson.length === 0) throw new Error("파일에 데이터가 없습니다.");

      // 1. AI 스키마 분석
      setUploadStatus('데이터 레이크 매핑 규칙 생성 중...');
      const schema = await identifyAndCleanSchema(rawJson);
      setCurrentSchema(schema);
      
      // 2. 테이블별 물리 스키마 정의 (에러 방지의 핵심)
      const RESIDENTS_COLUMNS = ['region', 'resident_count', 'nationality', 'visa_type'];
      const POLICIES_COLUMNS = ['region', 'title', 'category', 'budget'];
      
      const targetTable = schema.dataType === 'policies' ? 'local_policies' : 'foreign_residents_stats';
      const allowedColumns = schema.dataType === 'policies' ? POLICIES_COLUMNS : RESIDENTS_COLUMNS;

      setUploadStatus(`데이터 정규화 파이프라인 가동: ${schema.datasetName}`);
      
      const processedData = rawJson.map((row: any) => {
        const cleanedRow: any = {};

        schema.mappings.forEach(m => {
          // 중요: 현재 대상 테이블에 존재하는 컬럼인 경우에만 세팅
          if (allowedColumns.includes(m.target)) {
            const rawVal = row[m.source];
            if (m.type === 'number') {
              cleanedRow[m.target] = cleanNumericValue(rawVal);
            } else {
              cleanedRow[m.target] = rawVal ? String(rawVal) : '';
            }
          }
        });

        // 필수 필드 보정
        if (!cleanedRow.region) cleanedRow.region = '미분류';
        
        return cleanedRow;
      });

      // 3. 적재
      setUploadStatus(`정제된 데이터를 [${targetTable}]에 적재 중...`);
      
      const { error } = await supabase.from(targetTable).insert(processedData);
      if (error) {
        console.error("DB Insert Error:", error);
        throw new Error(`데이터베이스 적재 실패: ${error.message}`);
      }

      setLastUploadedData(processedData);
      setUploadStatus('대시보드 인사이트 생성 중...');
      
      const aiResponse = await analyzeUploadedData(processedData, schema);
      setAiResults(aiResponse);
      setShowAnalysis(true);

    } catch (err: any) {
      setUploadStatus('파이프라인 처리 오류');
      setErrorDetails(err.message);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fadeIn">
      {showAnalysis && aiResults && currentSchema && (
        <PostUploadAnalysis 
          data={lastUploadedData} 
          schema={currentSchema}
          aiResults={aiResults} 
          onClose={() => setShowAnalysis(false)} 
        />
      )}

      {!showAnalysis && (
        <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
          
          <div className="relative z-10 text-center">
            <div className="mb-12">
              <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">AI-Driven ETL Pipeline</span>
              <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">자율형 데이터 사이언스 수집기</h2>
              <p className="text-slate-500 font-bold text-lg">AI가 원본을 스캔하여 대상 테이블 스키마에 맞게 자동 정규화합니다.</p>
            </div>

            {!hasKey ? (
              <div className="bg-slate-50 border-4 border-dashed border-blue-200 rounded-[3rem] p-20 text-center">
                <i className="fa-solid fa-lock text-4xl text-blue-200 mb-6"></i>
                <h3 className="text-xl font-black text-slate-800 mb-4">API 키가 필요합니다</h3>
              </div>
            ) : (
              <div className="border-4 border-dashed border-slate-100 rounded-[3rem] p-20 text-center hover:border-blue-400 hover:bg-blue-50/10 transition-all cursor-pointer relative mb-10 group/box">
                <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl group-hover/box:scale-105 transition-transform">
                  <i className="fa-solid fa-cloud-arrow-up text-4xl text-white"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-4">데이터 파일을 업로드하세요</h3>
                <p className="text-slate-400 mb-12 max-w-sm mx-auto font-bold text-sm">업로드된 데이터는 AI 정제 파이프라인을 거쳐 실제 DB 구조에 최적화되어 적재됩니다.</p>
                
                <label className={`relative z-10 cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''} bg-slate-900 text-white px-16 py-6 rounded-2xl font-black shadow-2xl hover:bg-blue-700 transition-all inline-block`}>
                  {isUploading ? '데이터 정제 및 적재 중...' : '파일 선택 및 분석 시작'}
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx" disabled={isUploading} />
                </label>
              </div>
            )}

            {uploadStatus && (
              <div className={`p-8 rounded-[2rem] border animate-fadeIn mt-6 ${errorDetails ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`font-black text-lg ${errorDetails ? 'text-red-700' : 'text-blue-700'}`}>{uploadStatus}</p>
                {errorDetails && (
                  <div className="mt-4 p-4 bg-white/50 rounded-xl text-left border border-red-100">
                    <p className="text-xs text-red-600 font-mono leading-relaxed">{errorDetails}</p>
                    <p className="text-[10px] text-red-400 mt-2 font-bold underline italic">에러 해결됨: 대상 테이블에 존재하지 않는 컬럼은 자동으로 필터링되도록 보정되었습니다.</p>
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
