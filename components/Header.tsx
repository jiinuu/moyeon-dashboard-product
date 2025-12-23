
import React, { useEffect, useState } from 'react';

interface HeaderProps {
  activeTab: 'dashboard' | 'ingestion';
  setActiveTab: (tab: 'dashboard' | 'ingestion') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [isAistudioAvailable, setIsAistudioAvailable] = useState<boolean>(false);

  const checkKeyStatus = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      setIsAistudioAvailable(true);
      try {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } catch (e) {
        console.error("API Key check error:", e);
        setHasKey(false);
      }
    } else {
      // aistudio가 없는 환경에서는 환경 변수 확인
      const envKey = (process as any).env.API_KEY;
      setHasKey(!!envKey && envKey !== "undefined");
    }
  };

  useEffect(() => {
    checkKeyStatus();
    const interval = setInterval(checkKeyStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenKey = async (e: React.MouseEvent) => {
    e.preventDefault();
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        // 레이스 컨디션 방지: 성공했다고 가정하고 즉시 상태 업데이트
        setHasKey(true);
      } catch (err) {
        console.error("Failed to open key selection dialog:", err);
      }
    } else {
      console.warn("aistudio.openSelectKey is not available in this context.");
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

          {(!hasKey) && (
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
