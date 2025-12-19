
import React, { useState, useEffect } from 'react';
import { GameProvider } from '../context/GameContext';
import BigScreenView from './BigScreenView';
import MobileInterface from './MobileInterface';
import AdminDashboard from './AdminDashboard';

const LegacyGame: React.FC = () => {
  // default to 'landing' unless URL params exist
  const [viewMode, setViewMode] = useState<'landing' | 'bigscreen' | 'mobile' | 'admin' | 'split'>('landing');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    
    if (modeParam === 'mobile') {
      setViewMode('mobile');
    } else if (modeParam === 'bigscreen') {
      setViewMode('bigscreen');
    } else if (modeParam === 'split' || modeParam === 'debug') {
      setViewMode('split');
    }
  }, []);

  const LandingPage = () => (
    <div className="w-full h-full bg-gray-900 text-white flex flex-col items-center justify-center relative overflow-hidden bg-grid-pattern">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        
        <div className="z-10 text-center mb-12 animate-fade-in">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4 tracking-tighter filter drop-shadow-lg">
                AI 股市操盘手
            </h1>
            <p className="text-xl text-gray-400 font-mono tracking-widest">REAL-TIME TRADING SIMULATION</p>
        </div>

        <div className="z-10 flex flex-col md:flex-row gap-8 animate-fade-in-up">
            <button 
                onClick={() => setViewMode('bigscreen')}
                className="group relative glass-panel hover:bg-gray-800 border border-blue-500/30 hover:border-blue-500 rounded-2xl p-8 w-72 text-left transition-all hover:scale-105 shadow-2xl"
            >
                <div className="absolute -top-3 -right-3 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full font-mono">HOST</div>
                <span className="material-icons text-5xl text-blue-400 mb-4 group-hover:animate-bounce">admin_panel_settings</span>
                <h2 className="text-2xl font-bold mb-2">创建交易大厅</h2>
                <p className="text-xs text-gray-500 font-mono">
                    Host View (PC/Big Screen)<br/>
                    Control game flow & Display market.
                </p>
            </button>

            <button 
                onClick={() => setViewMode('mobile')}
                className="group relative glass-panel hover:bg-gray-800 border border-green-500/30 hover:border-green-500 rounded-2xl p-8 w-72 text-left transition-all hover:scale-105 shadow-2xl"
            >
                <div className="absolute -top-3 -right-3 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full font-mono">PLAYER</div>
                <span className="material-icons text-5xl text-green-400 mb-4 group-hover:animate-bounce">smartphone</span>
                <h2 className="text-2xl font-bold mb-2">进入交易终端</h2>
                <p className="text-xs text-gray-500 font-mono">
                    Client View (Mobile)<br/>
                    Join game & Trade stocks.
                </p>
            </button>
        </div>

        <div className="mt-16 text-gray-600 text-xs font-mono">
            <button onClick={() => setViewMode('split')} className="hover:text-blue-400 underline transition-colors opacity-50 hover:opacity-100">
                [DEV_MODE] ENTER SPLIT SCREEN DEBUGGER
            </button>
        </div>
    </div>
  );

  return (
    <GameProvider>
      <div className="w-screen h-screen bg-black overflow-hidden relative font-sans">
        {viewMode === 'landing' && <LandingPage />}
        
        {/* Host Mode */}
        {viewMode === 'bigscreen' && <BigScreenView />}
        
        {/* Player Mode */}
        {viewMode === 'mobile' && (
           <div className="w-full h-full flex justify-center bg-[#050b14]">
              <MobileInterface />
           </div>
        )}

        {viewMode === 'admin' && <AdminDashboard />}

        {/* --- DEBUG SPLIT MODE (Modified) --- */}
        {viewMode === 'split' && (
           <div className="w-full h-full flex bg-black">
              {/* Left: Big Screen (50%) */}
              <div className="w-1/2 h-full border-r border-gray-800 relative overflow-hidden">
                 <div className="absolute top-2 left-2 z-50 bg-blue-600/80 backdrop-blur text-white text-[10px] font-mono px-2 py-1 rounded border border-blue-400/30">
                    HOST VIEW
                 </div>
                 {/* Scale down content if needed, or let it respond */}
                 <BigScreenView />
              </div>

              {/* Right Column (50%) - Mobile ONLY */}
              <div className="w-1/2 h-full flex flex-col bg-[#050b14] relative items-center justify-center p-4 border-l border-gray-900">
                  <div className="absolute top-2 left-2 z-50 bg-green-600/80 backdrop-blur text-white text-[10px] font-mono px-2 py-1 rounded border border-green-400/30">
                    PLAYER CLIENT
                 </div>
                 
                 {/* Admin Toggle Hint */}
                 <div className="absolute top-2 right-2 text-[10px] text-gray-500">
                    Use Admin button on Big Screen to configure
                 </div>
                 
                 {/* Phone Mockup - Now gets full height */}
                 <div className="w-[360px] h-[90%] border-[8px] border-gray-800 rounded-[3rem] overflow-hidden bg-black shadow-2xl ring-1 ring-gray-700 relative">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl z-50"></div>
                    <MobileInterface />
                 </div>
                 <div className="mt-4 text-xs text-gray-500 font-mono">iPhone 14 Pro Simulation</div>
              </div>
           </div>
        )}
      </div>
    </GameProvider>
  );
};

export default LegacyGame;
