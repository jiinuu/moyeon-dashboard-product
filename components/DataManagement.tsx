
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import * as XLSX from 'xlsx';
import { identifyAndCreateDynamicSchema, analyzeUploadedData, AnalysisResponse, SchemaMapping } from '../lib/aiService.ts';
import { PostUploadAnalysis } from './PostUploadAnalysis.tsx';

export const DataManagement: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(true);
  
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [lastUploadedData, setLastUploadedData] = useState<any[]>([]);
  const [aiResults, setAiResults] = useState<AnalysisResponse | null>(null);
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

  const escapeSql = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    const str = String(val).replace(/'/g, "''");
    return `'${str}'`;
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

      // 1. AI에게 스키마 설계 요청
      const schema = await identifyAndCreateDynamicSchema(rawJson);
      const finalTableName = `${schema.tableName.toLowerCase().replace(/[^a-z0-9_]/g, '')}_${Date.now().toString().slice(-6)}`;
      schema.tableName = finalTableName;
      setCurrentSchema(schema);
      
      // 2. 물리 테이블 생성 (SQL 클리닝 로직 추가)
      setUploadStatus(`데이터베이스에 신규 테이블 [${finalTableName}] 구축 중...`);
      
      // AI가 생성한 sqlColumns에서 혹시 모를 세미콜론이나 불필요한 공백 제거
      const cleanedColumns = schema.sqlColumns.trim().replace(/;+$/, '').replace(/^[\(\)]+|[\(\)]+$/g, '');
      const createTableSql = `CREATE TABLE IF NOT EXISTS public."${finalTableName}" (${cleanedColumns});`;
      
      const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: createTableSql });
      if (rpcError) {
        console.error("SQL Error:", createTableSql);
        throw new Error(`테이블 생성 실패: ${rpcError.message}`);
      }

      // 3. 데이터 정제
      setUploadStatus(`데이터 변환 및 무결성 검사 중...`);
      const processedData = rawJson.map((row: any) => {
        const cleanedRow: any = {};
        schema.mappings.forEach(m => {
          const rawVal = row[m.source];
          cleanedRow[m.target] = m.type === 'number' ? cleanNumericValue(rawVal) : (rawVal ? String(rawVal) : '');
        });
        return cleanedRow;
      });

      // 4. 데이터 적재
      const columns = schema.mappings.map(m => `"${m.target}"`).join(', ');
      const chunkSize = 100;
      for (let i = 0; i < processedData.length; i += chunkSize) {
        const chunk = processedData.slice(i, i + chunkSize);
        const values = chunk.map(row => {
          const rowValues = schema.mappings.map(m => escapeSql(row[m.target])).join(', ');
          return `(${rowValues})`;
        }).join(', ');

        const insertSql = `INSERT INTO public."${finalTableName}" (${columns}) VALUES ${values};`;
        
        const { error: insertError } = await supabase.rpc('exec_sql', { sql_query: insertSql });
        if (insertError) throw new Error(`데이터 적재 실패 (청크 ${i}): ${insertError.message}`);
        
        setUploadStatus(`적재 진행 중... (${Math.min(i + chunkSize, processedData.length)} / ${processedData.length})`);
      }

      setLastUploadedData(processedData);
      setUploadStatus('동적 대시보드 인사이트 생성 중...');
      
      const aiResponse = await analyzeUploadedData(processedData, schema);
      setAiResults(aiResponse);
      setShowAnalysis(true);

    } catch (err: any) {
      setUploadStatus('데이터 파이프라인 에러');
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
              <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">High-Performance Pipeline</span>
              <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">AI 자율 스키마 엔진</h2>
              <p className="text-slate-500 font-bold text-lg">캐시 지연 없이 새로운 물리 테이블을 즉시 생성하고 데이터를 동기화합니다.</p>
            </div>

            {!hasKey ? (
              <div className="bg-slate-50 border-4 border-dashed border-blue-200 rounded-[3rem] p-20 text-center">
                <i className="fa-solid fa-lock text-4xl text-blue-200 mb-6"></i>
                <h3 className="text-xl font-black text-slate-800 mb-4">API 키가 필요합니다</h3>
              </div>
            ) : (
              <div className="border-4 border-dashed border-slate-100 rounded-[3rem] p-20 text-center hover:border-emerald-400 hover:bg-emerald-50/10 transition-all cursor-pointer relative mb-10 group/box">
                <div className="w-24 h-24 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl group-hover/box:scale-105 transition-transform">
                  <i className="fa-solid fa-bolt-lightning text-4xl text-white"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-4">파일을 드래그하거나 선택하세요</h3>
                <p className="text-slate-400 mb-12 max-w-sm mx-auto font-bold text-sm">기존 캐시를 무시하고 DB 레벨에서 SQL 명령을 직접 실행하여 즉각적인 가용성을 보장합니다.</p>
                
                <label className={`relative z-10 cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''} bg-slate-900 text-white px-16 py-6 rounded-2xl font-black shadow-2xl hover:bg-emerald-700 transition-all inline-block`}>
                  {isUploading ? '엔진 가동 중...' : '데이터 분석 및 테이블 생성 시작'}
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx" disabled={isUploading} />
                </label>
              </div>
            )}

            {uploadStatus && (
              <div className={`p-8 rounded-[2rem] border animate-fadeIn mt-6 ${errorDetails ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center justify-center space-x-3">
                  {!errorDetails && <div className="animate-spin h-5 w-5 border-2 border-emerald-600 border-t-transparent rounded-full"></div>}
                  <p className={`font-black text-lg ${errorDetails ? 'text-red-700' : 'text-emerald-700'}`}>{uploadStatus}</p>
                </div>
                {errorDetails && (
                  <div className="mt-4 p-4 bg-white/50 rounded-xl text-left border border-red-100">
                    <p className="text-xs text-red-600 font-mono leading-relaxed font-bold mb-4">{errorDetails}</p>
                    <div className="p-4 bg-slate-900 rounded-xl">
                      <p className="text-[10px] text-emerald-400 font-bold mb-2">💡 시스템 진단 결과</p>
                      <p className="text-[10px] text-white/70 leading-relaxed">
                        SQL 문법 오차를 자동으로 교정하는 로직이 적용되었습니다. 다시 시도해 주세요. 만약 동일 에러가 지속된다면 Supabase에 'exec_sql' 함수가 올바르게 정의되어 있는지 확인이 필요합니다.
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
