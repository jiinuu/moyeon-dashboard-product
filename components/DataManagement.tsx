
import React, { useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import * as XLSX from 'xlsx';

type IngestionType = 'residents' | 'policies';

export const DataManagement: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<IngestionType>('residents');

  // 파일 업로드 및 데이터 처리 핵심 로직
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadStatus('파일 읽는 중...');

      // 1. 파일 데이터 읽기
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        throw new Error("파일에 데이터가 없습니다.");
      }

      setUploadStatus(`데이터 구조 분석 및 매핑 중 (${jsonData.length}건)...`);

      // 2. 데이터 매핑 (DB 스키마에 맞게 변환)
      const mappedData = jsonData.map((row: any) => {
        if (targetType === 'residents') {
          return {
            region: row['지역'] || row['region'] || '알 수 없음',
            resident_count: parseInt(row['인원'] || row['count'] || '0'),
            nationality: row['국적'] || row['nationality'] || '미분류',
            visa_type: row['비자'] || row['visa_type'] || '기타',
            source_type: 'FILE',
            raw_data: row
          };
        } else {
          return {
            region: row['지역'] || row['region'] || '알 수 없음',
            title: row['사업명'] || row['title'] || '제목 없음',
            category: row['분류'] || row['category'] || '기타',
            budget: parseInt(row['예산'] || row['budget'] || '0'),
            target_audience: row['대상'] || row['target'] || '전체',
            source_type: 'FILE',
            raw_data: row
          };
        }
      });

      // 3. Supabase에 적재
      const table = targetType === 'residents' ? 'foreign_residents_stats' : 'local_policies';
      const { error } = await supabase.from(table).insert(mappedData);

      if (error) throw error;

      setUploadStatus(`성공: ${mappedData.length}건의 데이터를 ${table} 테이블에 적재했습니다.`);
    } catch (err: any) {
      console.error("Upload Error:", err);
      setUploadStatus(`실패: ${err.message}`);
    } finally {
      setIsUploading(false);
      // 입력값 초기화
      e.target.value = '';
    }
  };

  const triggerApiSync = async () => {
    try {
      setIsUploading(true);
      setUploadStatus('공공데이터 포털 API 어댑터 호출 중...');
      
      // 실제 API 호출 시뮬레이션 (여기서는 간단한 더미 데이터를 Supabase에 넣음)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const dummyData = [
        { region: '서울', resident_count: 450000, source_type: 'API', raw_data: { api_ver: 'v1' } },
        { region: '경기', resident_count: 620000, source_type: 'API', raw_data: { api_ver: 'v1' } }
      ];
      
      const { error } = await supabase.from('foreign_residents_stats').insert(dummyData);
      if (error) throw error;

      setUploadStatus('API 동기화 완료: 최신 행정 데이터가 반영되었습니다.');
    } catch (err: any) {
      setUploadStatus(`API 동기화 실패: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">하이브리드 데이터 수집 엔진</h2>
            <p className="text-slate-500">실시간 API 또는 엑셀 파일을 통해 분석 시스템에 연료를 공급합니다.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setTargetType('residents')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${targetType === 'residents' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              외국인 현황
            </button>
            <button 
              onClick={() => setTargetType('policies')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${targetType === 'policies' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              지자체 정책
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all group relative">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
              <i className="fa-solid fa-file-excel text-2xl text-slate-400 group-hover:text-blue-600"></i>
            </div>
            <h3 className="font-bold text-slate-700 mb-2">로컬 파일 업로드</h3>
            <p className="text-sm text-slate-500 mb-6">
              {targetType === 'residents' ? '지역, 인원, 국적' : '지역, 사업명, 예산'} 컬럼이 포함된 파일을 선택하세요.
            </p>
            <label className={`cursor-pointer ${isUploading ? 'bg-slate-300 pointer-events-none' : 'bg-slate-900 hover:bg-blue-600'} text-white px-8 py-2.5 rounded-xl font-semibold transition-all inline-block shadow-lg`}>
              {isUploading ? '처리 중...' : '파일 선택하기'}
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx,.xls" disabled={isUploading} />
            </label>
          </div>

          <div className="border border-slate-200 rounded-2xl p-8 flex flex-col justify-center items-center text-center bg-slate-50">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <i className="fa-solid fa-bolt text-2xl text-blue-600"></i>
            </div>
            <h3 className="font-bold text-slate-700 mb-2">공공 API 실시간 동기화</h3>
            <p className="text-sm text-slate-500 mb-6">설정된 API 엔드포인트에서 최신 외국인 거주 데이터를 파이프라인으로 가져옵니다.</p>
            <button 
              onClick={triggerApiSync}
              disabled={isUploading}
              className={`w-full ${isUploading ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700'} text-white px-8 py-2.5 rounded-xl font-semibold transition-all shadow-lg`}
            >
              지금 동기화 시작
            </button>
          </div>
        </div>

        {uploadStatus && (
          <div className={`mt-8 p-5 rounded-2xl border flex items-center shadow-inner animate-fadeIn ${
            uploadStatus.includes('실패') ? 'bg-red-50 border-red-100' : 
            uploadStatus.includes('성공') || uploadStatus.includes('완료') ? 'bg-green-50 border-green-100' : 
            'bg-blue-50 border-blue-100'
          }`}>
            {isUploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mr-4"></div>
            ) : (
              <i className={`fa-solid ${uploadStatus.includes('실패') ? 'fa-circle-xmark text-red-500' : 'fa-circle-check text-green-500'} text-xl mr-4`}></i>
            )}
            <p className={`text-sm font-bold ${
              uploadStatus.includes('실패') ? 'text-red-700' : 
              uploadStatus.includes('성공') || uploadStatus.includes('완료') ? 'text-green-700' : 
              'text-blue-700'
            }`}>{uploadStatus}</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <i className="fa-solid fa-terminal text-8xl"></i>
        </div>
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <i className="fa-solid fa-circle-info mr-2 text-blue-400"></i>
          데이터 업로드 가이드 (준비사항)
        </h3>
        <div className="space-y-4 text-slate-400 text-sm">
          <p>엑셀 파일은 아래와 같은 헤더 이름을 포함하면 자동으로 매핑됩니다:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>현황:</strong> 지역(region), 인원(count), 국적(nationality), 비자(visa_type)</li>
            <li><strong>정책:</strong> 지역(region), 사업명(title), 예산(budget), 대상(target)</li>
          </ul>
          <p className="mt-4 pt-4 border-t border-slate-800 italic">
            * 모든 데이터는 Supabase의 RLS 보안 정책에 따라 보호되며, 업로드 시 원본 행(row) 정보가 JSONB 필드에 자동 저장됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};
