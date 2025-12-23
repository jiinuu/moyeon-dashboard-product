
import React, { useEffect, useState } from 'react';

interface HeaderProps {
  activeTab: 'dashboard' | 'ingestion';
  setActiveTab: (tab: 'dashboard' | 'ingestion') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const [hasKey, setHasKey] = useState<boolean>(true);

  const checkKeyStatus = async () => {
    try {
      // 1. window.aistudio 객체 직접 확인
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
        return;
      }
      
      // 2. aistudio가 없는 경우 환경 변수 확인
      const envKey = (process as any).env.API_KEY;
      const isValidEnvKey = !!envKey && envKey !== "undefined" && envKey !== "";
      setHasKey(isValidEnvKey);
    } catch (e) {
      console.warn("API Key check skipped:", e);
      setHasKey(false);
    }
  };

  useEffect(() => {
    checkKeyStatus();
    // 2초마다 주기적으로 체크 (키 선택 직후 반영을 위해)
    const interval = setInterval(checkKeyStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenKey = async (e: React.MouseEvent) => {
    e.preventDefault();
    const aistudio = (window as any).aistudio;
    
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        // 규정에 따라 호출 직후 성공으로 간주하고 상태 업데이트
        setHasKey(true);
      } catch (err) {
        console.error("API 키 선택 창 실행 실패:", err);
      }
    } else {
      console.error("aistudio.openSelectKey is not available in this context.");
      // aistudio가 없는 일반 브라우저 환경일 경우 안내
      const envKey = (process as any).env.API_KEY;
      if (!envKey || envKey === "undefined") {
        alert("API 키가 감지되지 않았습니다. 환경 변수(API_KEY)가 설정되어 있는지 확인해주세요.");
      }
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
            <i className="fa-solid fa-brain text-white text-2xl"></i>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black text-slate-800 leading-tight">
              AI 정책 매칭 엔진
            </h1>
            <p className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">Autonomous Data System</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 sm:space-x-4">
          <nav className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              대시보드
            </button>
            <button
              onClick={() => setActiveTab('ingestion')}
              className={`px-3 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'ingestion' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              데이터 수집
            </button>
          </nav>

          {!hasKey && (
            <button 
              onClick={handleOpenKey}
              className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all flex items-center animate-bounce"
            >
              <i className="fa-solid fa-key mr-2"></i>
              API 키 설정
            </button>
          )}
          
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-slate-400 hover:text-blue-600 transition-colors" title="Billing Info">
            <i className="fa-solid fa-circle-info text-xl"></i>
          </a>
        </div>
      </div>
    </header>
  );
};
