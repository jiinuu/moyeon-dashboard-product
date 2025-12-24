
import React, { useEffect, useState } from 'react';

interface HeaderProps {
  activeTab: 'dashboard' | 'ingestion';
  setActiveTab: (tab: 'dashboard' | 'ingestion') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [tempKey, setTempKey] = useState<string>('');

  const checkKeyStatus = async () => {
    try {
      // 1. 수동 입력 키 확인
      const manualKey = localStorage.getItem('GEMINI_API_KEY');
      if (manualKey) {
        setHasKey(true);
        return;
      }

      // 2. window.aistudio 객체 확인
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(!!selected);
        return;
      }
      
      // 3. 환경 변수 확인
      const envKey = (process as any).env.API_KEY;
      const isValidEnvKey = !!envKey && envKey !== "undefined" && envKey !== "";
      setHasKey(isValidEnvKey);
    } catch (e) {
      setHasKey(false);
    }
  };

  useEffect(() => {
    checkKeyStatus();
    const interval = setInterval(checkKeyStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenKey = async (e: React.MouseEvent) => {
    e.preventDefault();
    const aistudio = (window as any).aistudio;
    
    // aistudio 브릿지가 작동하면 우선 실행
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        setHasKey(true);
        return;
      } catch (err) {
        console.error("자동 설정 실패, 수동 모드 전환");
      }
    }
    
    // 자동 설정 실패 시 수동 입력 모달 표시
    setShowManualModal(true);
  };

  const saveManualKey = () => {
    if (tempKey.trim().length < 20) {
      alert("올바른 Gemini API Key를 입력해주세요.");
      return;
    }
    localStorage.setItem('GEMINI_API_KEY', tempKey.trim());
    setHasKey(true);
    setShowManualModal(false);
    setTempKey('');
    window.location.reload(); // 키 반영을 위해 새로고침
  };

  const clearKey = () => {
    localStorage.removeItem('GEMINI_API_KEY');
    setHasKey(false);
    window.location.reload();
  };

  return (
    <>
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

            {!hasKey ? (
              <button 
                onClick={handleOpenKey}
                className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all flex items-center animate-bounce"
              >
                <i className="fa-solid fa-key mr-2"></i>
                API 키 설정
              </button>
            ) : (!!localStorage.getItem('GEMINI_API_KEY')) && (
              <button 
                onClick={clearKey}
                className="text-slate-400 hover:text-red-500 text-xs font-bold transition-colors"
                title="키 제거"
              >
                <i className="fa-solid fa-eraser mr-1"></i> 키 리셋
              </button>
            )}
            
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-slate-400 hover:text-blue-600 transition-colors" title="Billing Info">
              <i className="fa-solid fa-circle-info text-xl"></i>
            </a>
          </div>
        </div>
      </header>

      {/* 수동 API 키 입력 모달 */}
      {showManualModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-fadeIn border border-slate-200">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <i className="fa-solid fa-key text-3xl"></i>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Gemini API Key 설정</h2>
              <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                자동 설정을 사용할 수 없는 환경입니다.<br/>
                Gemini API 키를 아래에 직접 입력해주세요.
              </p>
              
              <div className="relative mb-8">
                <input 
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>

              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={saveManualKey}
                  className="flex-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                  키 저장 및 연결
                </button>
              </div>

              <p className="mt-6 text-[11px] text-slate-400 font-medium">
                입력하신 키는 브라우저에만 저장되며 외부로 전송되지 않습니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
