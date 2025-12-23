
import React, { useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import * as XLSX from 'xlsx';
import { identifyDataStructure, analyzeUploadedData, AIInsight, AIRecommendation, SchemaMapping } from '../lib/aiService.ts';
import { PostUploadAnalysis } from './PostUploadAnalysis.tsx';

export const DataManagement: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [lastUploadedData, setLastUploadedData] = useState<any[]>([]);
  const [aiResults, setAiResults] = useState<{ insights: AIInsight[], recommendations: AIRecommendation[] } | null>(null);
  const [currentSchema, setCurrentSchema] = useState<SchemaMapping | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadStatus('AI가 데이터 구조를 파악하고 있습니다...');

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawJson = XLSX.utils.sheet_to_json(sheet);

      if (rawJson.length === 0) throw new Error("파일에 데이터가 없습니다.");

      // 1. AI에게 데이터 성격 판단 맡기기
      const schema = await identifyDataStructure(rawJson);
      setCurrentSchema(schema);
      setUploadStatus(`감지된 데이터 타입: ${schema.targetTable === 'residents' ? '거주 현황' : '정책 예산'}`);

      // 2. 스키마에 맞춰 정밀 매핑 (DB 에러 방지를 위해 필요한 필드만 추출)
      const mappedData = rawJson.map((row: any) => {
        const cleanObj: any = {
          region: row[schema.columnMap['region']] || row['지역'] || row['region'] || '알 수 없음',
          source_type: 'FILE',
          raw_data: row
        };

        if (schema.targetTable === 'residents') {
          cleanObj.resident_count = parseInt(row[schema.columnMap['resident_count']] || row['인원'] || row['count'] || '0');
          cleanObj.nationality = row[schema.columnMap['nationality']] || row['국적'] || '미분류';
          cleanObj.visa_type = row[schema.columnMap['visa_type']] || row['비자'] || '기타';
          // budget 필드는 절대 넣지 않음 (에러 방지)
        } else {
          cleanObj.budget = parseInt(row[schema.columnMap['budget']] || row['예산'] || row['budget'] || '0');
          cleanObj.title = row[schema.columnMap['title']] || row['사업명'] || row['title'] || '제목 없음';
          // resident_count 필드는 절대 넣지 않음 (에러 방지)
        }
        return cleanObj;
      });

      const table = schema.targetTable === 'residents' ? 'foreign_residents_stats' : 'local_policies';
      
      setUploadStatus(`DB 최적화 적재 중 (${mappedData.length}건)...`);
      const { error } = await supabase.from(table).insert(mappedData);
      
      if (error) {
        if (error.message.includes('row-level security')) {
          throw new Error("보안 정책(RLS) 에러. Supabase SQL Editor에서 정책 설정을 완료해 주세요.");
        }
        throw error;
      }

      setLastUploadedData(mappedData);
      setUploadStatus('적재 완료! 실시간 AI 통찰력을 생성합니다...');
      
      const aiResponse = await analyzeUploadedData(mappedData, schema.targetTable);
      setAiResults(aiResponse);
      setShowAnalysis(true);

    } catch (err: any) {
      setUploadStatus(`처리 실패: ${err.message}`);
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
          type={currentSchema?.targetTable || 'residents'} 
          aiResults={aiResults} 
          onClose={() => setShowAnalysis(false)} 
        />
      )}

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden relative">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative z-10">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-800 mb-2">지능형 자율 데이터 처리기</h2>
            <p className="text-slate-500 font-medium">형식에 구애받지 마세요. AI가 데이터를 읽고 자동으로 분류합니다.</p>
          </div>

          <div className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-16 text-center hover:border-blue-400 hover:bg-blue-50/10 transition-all group cursor-pointer relative overflow-hidden">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-200 group-hover:rotate-6 transition-transform">
              <i className="fa-solid fa-cloud-arrow-up text-4xl text-white"></i>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-4">어떤 엑셀이든 드롭하세요</h3>
            <p className="text-slate-400 mb-10 max-w-sm mx-auto font-medium">AI가 컬럼명을 해석하고 불필요한 필드는 정제하여 안전하게 적재합니다.</p>
            
            <label className={`relative z-10 cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''} bg-slate-900 text-white px-12 py-5 rounded-2xl font-black shadow-2xl hover:bg-blue-600 hover:shadow-blue-200 transition-all inline-block active:scale-95`}>
              {isUploading ? (
                <span className="flex items-center">
                  <i className="fa-solid fa-atom fa-spin mr-3 text-blue-400"></i> AI 분석 엔진 가동 중...
                </span>
              ) : '분석할 파일 선택하기'}
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx" disabled={isUploading} />
            </label>
          </div>

          {uploadStatus && (
            <div className={`mt-10 p-6 rounded-2xl border flex items-center shadow-sm animate-fadeIn ${
              uploadStatus.includes('실패') ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${uploadStatus.includes('실패') ? 'bg-red-200' : 'bg-blue-200 animate-pulse'}`}>
                <i className={`fa-solid ${uploadStatus.includes('실패') ? 'fa-xmark' : 'fa-wand-magic-sparkles'}`}></i>
              </div>
              <p className="font-bold text-sm">{uploadStatus}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl flex items-center space-x-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
            <i className="fa-solid fa-code-merge text-2xl text-blue-400"></i>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-1">동적 필드 정제 기술</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              DB 스키마 캐시 에러를 방지하기 위해, AI가 목적 테이블(현황/정책)에 존재하지 않는 컬럼은 적재 직전 자동으로 필터링합니다.
            </p>
          </div>
        </div>
        <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl flex flex-col justify-center">
          <div className="text-3xl font-black mb-1">100%</div>
          <p className="text-xs font-medium text-indigo-200">스키마 호환성 보장</p>
        </div>
      </div>
    </div>
  );
};
