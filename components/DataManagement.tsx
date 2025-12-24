
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import * as XLSX from 'xlsx';
import { identifyAndCreateDynamicSchema, analyzeUploadedData, AIInsight, AIRecommendation, SchemaMapping } from '../lib/aiService.ts';
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
      setUploadStatus('AI 분석 엔진이 원본 데이터 구조를 스캔 중...');

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawJson = XLSX.utils.sheet_to_json(sheet);

      if (rawJson.length === 0) throw new Error("파일에 데이터가 없습니다.");

      // 1. AI에게 새로운 물리 테이블 설계 요청
      const schema = await identifyAndCreateDynamicSchema(rawJson);
      
      // 테이블 이름 중복 방지를 위해 타임스탬프 추가
      const finalTableName = `${schema.tableName}_${Date.now().toString().slice(-6)}`;
      schema.tableName = finalTableName;
      setCurrentSchema(schema);
      
      // 2. 물리 테이블 생성 (RPC 브릿지 사용)
      setUploadStatus(`데이터베이스에 신규 테이블 [${finalTableName}] 생성 중...`);
      const createTableSql = `CREATE TABLE IF NOT EXISTS public."${finalTableName}" (${schema.sqlColumns});`;
      
      const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: createTableSql });
      
      if (rpcError) {
        console.error("RPC Error:", rpcError);
        throw new Error(`테이블 생성 실패: ${rpcError.message}. (Supabase SQL Editor에서 exec_sql 함수를 먼저 생성해야 합니다.)`);
      }

      // 3. 데이터 정제 및 적재
      setUploadStatus(`신규 테이블에 데이터 이관 중... (${rawJson.length} 건)`);
      
      const processedData = rawJson.map((row: any) => {
        const cleanedRow: any = {};
        schema.mappings.forEach(m => {
          const rawVal = row[m.source];
          if (m.type === 'number') {
            cleanedRow[m.target] = cleanNumericValue(rawVal);
          } else {
            cleanedRow[m.target] = rawVal ? String(rawVal) : '';
          }
        });
        return cleanedRow;
      });

      // 4. 새 테이블에 데이터 Insert
      // 새로 만든 테이블은 schema cache에 없으므로, 잠시 대기 후 시도
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { error: insertError } = await supabase.from(finalTableName).insert(processedData);
      
      if (insertError) {
        throw new Error(`데이터 적재 실패: ${insertError.message}`);
      }

      setLastUploadedData(processedData);
      setUploadStatus('동적 대시보드 인사이트 생성 중...');
      
      const aiResponse = await analyzeUploadedData(processedData, schema);
      setAiResults(aiResponse);
      setShowAnalysis(true);

    } catch (err: any) {
      setUploadStatus('동적 파이프라인 중단');
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
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-blue-600 to-indigo-600"></div>
          
          <div className="relative z-10 text-center">
            <div className="mb-12">
              <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">Dynamic DDL Pipeline</span>
              <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">AI 자율 스키마 생성기</h2>
              <p className="text-slate-500 font-bold text-lg">파일을 올리면 AI가 즉석에서 최적의 '물리 테이블'을 구축하고 적재합니다.</p>
            </div>

            {!hasKey ? (
              <div className="bg-slate-50 border-4 border-dashed border-blue-200 rounded-[3rem] p-20 text-center">
                <i className="fa-solid fa-lock text-4xl text-blue-200 mb-6"></i>
                <h3 className="text-xl font-black text-slate-800 mb-4">API 키가 필요합니다</h3>
              </div>
            ) : (
              <div className="border-4 border-dashed border-slate-100 rounded-[3rem] p-20 text-center hover:border-emerald-400 hover:bg-emerald-50/10 transition-all cursor-pointer relative mb-10 group/box">
                <div className="w-24 h-24 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl group-hover/box:scale-105 transition-transform">
                  <i className="fa-solid fa-database text-4xl text-white"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-4">분석할 파일을 선택하세요</h3>
                <p className="text-slate-400 mb-12 max-w-sm mx-auto font-bold text-sm">기존 테이블을 재사용하지 않고, 업로드 시마다 새로운 스키마의 전용 테이블이 생성됩니다.</p>
                
                <label className={`relative z-10 cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''} bg-slate-900 text-white px-16 py-6 rounded-2xl font-black shadow-2xl hover:bg-emerald-700 transition-all inline-block`}>
                  {isUploading ? '시스템이 테이블 구축 중...' : '신규 테이블 생성 및 데이터 적재'}
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx" disabled={isUploading} />
                </label>
              </div>
            )}

            {uploadStatus && (
              <div className={`p-8 rounded-[2rem] border animate-fadeIn mt-6 ${errorDetails ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`font-black text-lg ${errorDetails ? 'text-red-700' : 'text-emerald-700'}`}>{uploadStatus}</p>
                {errorDetails && (
                  <div className="mt-4 p-4 bg-white/50 rounded-xl text-left border border-red-100">
                    <p className="text-xs text-red-600 font-mono leading-relaxed">{errorDetails}</p>
                    <div className="mt-4 p-4 bg-slate-900 rounded-xl">
                      <p className="text-[10px] text-emerald-400 font-bold mb-2">💡 해결 가이드</p>
                      <p className="text-[10px] text-white/70 leading-relaxed">
                        Supabase SQL Editor에서 반드시 `exec_sql` 함수를 생성해야 웹 앱이 테이블을 직접 만들 수 있습니다. 위 설명의 SQL 코드를 복사해서 실행해 주세요.
                      </p>
                    </div>
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
