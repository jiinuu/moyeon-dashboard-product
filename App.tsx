
import React, { useState } from 'react';
import { Header } from './components/Header';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { DataManagement } from './components/DataManagement';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ingestion'>('dashboard');

  return (
    <div className="min-h-screen flex flex-col">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {activeTab === 'dashboard' ? (
          <AnalysisDashboard />
        ) : (
          <DataManagement />
        )}
      </main>

      <footer className="bg-slate-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm">
            &copy; 2024 Foreigner Policy Mismatch Analysis System (MVP). 
            Engineered with Supabase, React, and Python ETL.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
