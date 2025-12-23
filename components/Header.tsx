
import React, { useEffect, useState } from 'react';

interface HeaderProps {
  activeTab: 'dashboard' | 'ingestion';
  setActiveTab: (tab: 'dashboard' | 'ingestion') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const [hasKey, setHasKey] = useState<boolean>(true);

  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio) {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleOpenKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasKey(true);
      // 키 선택 후 페이지를 새로고침하거나 상태를 업데이트하여 process.env.API_KEY가 반영되도록 함
      setTimeout(() => window.location.reload(), 500);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
            <i className="fa-solid fa-brain text-white text-2xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 leading-tight">
              AI 정책 매칭 엔진
            </h1>
            <p className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">Autonomous Data System</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <nav className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              분석 대시보드
            </button>
            <button
              onClick={() => setActiveTab('ingestion')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'ingestion' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              데이터 자율 수집
            </button>
          </nav>

          {!hasKey && (
            <button 
              onClick={handleOpenKey}
              className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-xs font-black border border-amber-200 hover:bg-amber-200 transition-all flex items-center"
            >
              <i className="fa-solid fa-key mr-2"></i>
              API KEY 설정 필요
            </button>
          )}
          
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-slate-400 hover:text-blue-600 transition-colors">
            <i className="fa-solid fa-circle-question text-xl"></i>
          </a>
        </div>
      </div>
    </header>
  );
};
