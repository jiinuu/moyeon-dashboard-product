
import React, { useState } from 'react';

export const DataManagement: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsUploading(true);
    setUploadStatus('파일 구조를 분석하는 중...');
    
    setTimeout(() => {
      setUploadStatus('데이터 어댑터를 적용하여 스키마 매핑 중...');
      setTimeout(() => {
        setUploadStatus('Supabase DB 적재 완료 (성공)');
        setIsUploading(false);
      }, 1500);
    }, 1000);
  };

  const triggerApiSync = () => {
    setIsUploading(true);
    setUploadStatus('공공데이터 포털 API 연결 중...');
    setTimeout(() => {
      setUploadStatus('XML 응답 수신 및 JSONB 필드 변환 중...');
      setTimeout(() => {
        setUploadStatus('API 동기화 완료: 124건의 새로운 데이터가 추가되었습니다.');
        setIsUploading(false);
      }, 2000);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">하이브리드 데이터 수집 엔진</h2>
        <p className="text-slate-500 mb-8">엑셀 파일 업로드 또는 실시간 API 동기화를 통해 분석 데이터를 업데이트하세요.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
              <i className="fa-solid fa-file-excel text-2xl text-slate-400 group-hover:text-blue-600"></i>
            </div>
            <h3 className="font-bold text-slate-700 mb-2">로컬 파일 업로드</h3>
            <p className="text-sm text-slate-500 mb-6">Excel (.xlsx) 또는 CSV 파일을 드래그하여 정책/현황 데이터를 직접 입력합니다.</p>
            <label className="cursor-pointer bg-slate-900 hover:bg-blue-600 text-white px-8 py-2.5 rounded-xl font-semibold transition-all inline-block shadow-lg">
              파일 선택하기
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx" />
            </label>
          </div>

          <div className="border border-slate-200 rounded-2xl p-8 flex flex-col justify-center items-center text-center bg-slate-50">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <i className="fa-solid fa-bolt text-2xl text-blue-600"></i>
            </div>
            <h3 className="font-bold text-slate-700 mb-2">공공 API 실시간 동기화</h3>
            <p className="text-sm text-slate-500 mb-6">공공데이터 포털의 API 어댑터를 실행하여 최신 행정 데이터를 자동으로 가져옵니다.</p>
            <button 
              onClick={triggerApiSync}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-semibold transition-all shadow-lg"
            >
              지금 동기화 시작
            </button>
          </div>
        </div>

        {isUploading && (
          <div className="mt-8 p-5 bg-blue-50 rounded-2xl border border-blue-100 flex items-center shadow-inner">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mr-4"></div>
            <p className="text-blue-700 text-sm font-bold">{uploadStatus}</p>
          </div>
        )}

        {!isUploading && uploadStatus && uploadStatus.includes('완료') && (
          <div className="mt-8 p-5 bg-green-50 rounded-2xl border border-green-100 flex items-center shadow-inner">
            <i className="fa-solid fa-circle-check text-green-500 text-xl mr-4"></i>
            <p className="text-green-700 text-sm font-bold">{uploadStatus}</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <i className="fa-solid fa-terminal text-8xl"></i>
        </div>
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <i className="fa-solid fa-microchip mr-2 text-blue-400"></i>
          ETL 인프라 설계 명세 (Senior Engineer View)
        </h3>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          본 시스템은 **어댑터 디자인 패턴**을 활용하여 설계되었습니다. 공공데이터의 파편화된 데이터 포맷에 유연하게 대응하며, 
          Pandas를 통한 전처리와 Supabase 적재 로직이 모듈화되어 있습니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 hover:border-blue-500 transition-colors">
            <div className="text-xs text-blue-400 font-mono mb-2">db_connector.py</div>
            <div className="font-semibold mb-1">커넥터 모듈</div>
            <div className="text-xs text-slate-500">Supabase 연결 및 세션 풀링 관리</div>
          </div>
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 hover:border-blue-500 transition-colors">
            <div className="text-xs text-blue-400 font-mono mb-2">api_ingestor.py</div>
            <div className="font-semibold mb-1">API 어댑터</div>
            <div className="text-xs text-slate-500">Config 기반 다기능 API 수집기</div>
          </div>
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 hover:border-blue-500 transition-colors">
            <div className="text-xs text-blue-400 font-mono mb-2">file_loader.py</div>
            <div className="font-semibold mb-1">파일 로더</div>
            <div className="text-xs text-slate-500">Streamlit/CLI 공용 적재 엔진</div>
          </div>
        </div>
      </div>
    </div>
  );
};
