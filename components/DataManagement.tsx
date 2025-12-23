
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
  
  // AI 분석용 상태
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [lastUploadedData, setLastUploadedData] = useState<any[]>([]);
  const [aiResults, setAiResults] = useState<{ insights: AIInsight[], recommendations: AIRecommendation[] } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadStatus('데이터 추출 중...');

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) throw new Error("데이터가 비어있습니다.");

      setUploadStatus('AI 전처리 및 DB 적재 중...');

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
      if (error) throw error;

      setLastUploadedData(mappedData);
      setUploadStatus('데이터 적재 성공! AI 심화 분석을 시작합니다...');
      
      // AI 분석 시작
      const aiResponse = await analyzeUploadedData(mappedData, targetType);
      setAiResults(aiResponse);
      setShowAnalysis(true);

    } catch (err: any) {
      setUploadStatus(`실패: ${err.message}`);
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

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">데이터 인텔리전스 업로더</h2>
            <p className="text-slate-500">AI가 데이터를 분석하여 전처리 및 인사이트를 즉시 도출합니다.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setTargetType('residents')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${targetType === 'residents' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >외국인 현황</button>
            <button 
              onClick={() => setTargetType('policies')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${targetType === 'policies' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >지자체 정책</button>
          </div>
        </div>

        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-cloud-arrow-up text-3xl text-blue-500"></i>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">분석할 파일을 드래그하세요</h3>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">Excel, CSV 파일을 업로드하면 AI가 자동으로 스키마를 매핑하고 분석 방향을 추천합니다.</p>
          
          <label className={`cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''} bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold shadow-lg hover:shadow-blue-200 transition-all inline-block`}>
            {isUploading ? '분석 엔진 가동 중...' : '파일 선택 및 AI 분석 시작'}
            <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx" disabled={isUploading} />
          </label>
        </div>

        {uploadStatus && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center text-blue-700 text-sm font-medium animate-pulse">
            <i className="fa-solid fa-spinner fa-spin mr-3"></i>
            {uploadStatus}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-lg font-bold mb-2">시니어 데이터 엔지니어 Tip</h3>
          <p className="text-indigo-100 text-sm opacity-90 leading-relaxed">
            데이터를 적재할 때 raw_data (JSONB) 컬럼에 원본을 보존하는 이유는 추후 AI 모델이 비정형 데이터를 재처리할 때 유연성을 확보하기 위함입니다. 
            현재 시스템은 업로드 즉시 지능형 초동 분석을 수행합니다.
          </p>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
          <i className="fa-solid fa-brain text-9xl"></i>
        </div>
      </div>
    </div>
  );
};
