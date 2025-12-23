
import React from 'react';

interface HeaderProps {
  activeTab: 'dashboard' | 'ingestion';
  setActiveTab: (tab: 'dashboard' | 'ingestion') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-blue-200 shadow-lg">
            <i className="fa-solid fa-earth-asia text-white text-xl"></i>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            외국인 정책 미스매치 분석 시스템
          </h1>
        </div>
        
        <nav className="flex space-x-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-5 py-2 rounded-full transition-all duration-300 ${
              activeTab === 'dashboard' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-chart-pie mr-2"></i>
            분석 대시보드
          </button>
          <button
            onClick={() => setActiveTab('ingestion')}
            className={`px-5 py-2 rounded-full transition-all duration-300 ${
              activeTab === 'ingestion' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-database mr-2"></i>
            데이터 수집/관리
          </button>
        </nav>
      </div>
    </header>
  );
};
