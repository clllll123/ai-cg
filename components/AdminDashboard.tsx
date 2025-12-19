
import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { GamePhase, NewsFrequency, Sector, BotLevel, LoanProvider } from '../types';

interface AdminDashboardProps {
  onClose?: () => void;
}

interface StatData {
  count: number;
  totalWealth: number;
  label: string;
}

const FREQUENCY_DESCRIPTIONS: Record<NewsFrequency, string> = {
  [NewsFrequency.LOW]: "安静 (约1-2分钟/条)",
  [NewsFrequency.MEDIUM]: "热闹 (约30秒/条)",
  [NewsFrequency.HIGH]: "喧嚣 (约10秒/条)",
  [NewsFrequency.CRAZY]: "华尔街模式 (刷屏)"
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const { 
    phase, settings, players, stocks, updateSettings, regenerateStocks, updateStockName, startGame, stopGame, resetGame, kickPlayer, timeLeft, roomCode, distributeDividends
  } = useGame();

  const [selectedSectors, setSelectedSectors] = useState<Sector[]>(Object.values(Sector));
  
  // Check for API Key presence
  // @ts-ignore
  const hasApiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY);

  // Local state for new loan provider input
  const [newProvider, setNewProvider] = useState<Partial<LoanProvider>>({
      name: '', rate: 0.1, leverage: 2, color: 'gray', desc: ''
  });

  // Local state for Dividend
  const [dividendStockId, setDividendStockId] = useState<string>('');
  const [dividendAmount, setDividendAmount] = useState<number>(0.5);

  // --- Calculate Market Stats ---
  const marketStats = useMemo(() => {
    const stats: Record<string, StatData> = {
      [BotLevel.NEWBIE]: { count: 0, totalWealth: 0, label: '散户 (1x)' },
      [BotLevel.PRO]: { count: 0, totalWealth: 0, label: '大户 (5x)' },
      [BotLevel.HOT_MONEY]: { count: 0, totalWealth: 0, label: '游资 (20x)' },
      [BotLevel.WHALE]: { count: 0, totalWealth: 0, label: '机构 (50x)' },
      REAL: { count: 0, totalWealth: 0, label: '真人玩家' }
    };

    let totalMarketWealth = 0;

    players.forEach(p => {
       // Calculate current total wealth (Cash + Stock Market Value)
       let wealth = p.cash;
       Object.entries(p.portfolio).forEach(([sid, qty]) => {
          const stock = stocks.find(s => s.id === sid);
          if (stock) wealth += stock.price * (qty as number);
       });
       // Subtract debt
       wealth -= p.debt;
       
       totalMarketWealth += wealth;

       if (!p.isBot) {
         stats.REAL.count++;
         stats.REAL.totalWealth += wealth;
       } else if (p.botLevel) {
         // p.botLevel is a value from Enum, which matches keys in stats if we treat them as strings
         const key = p.botLevel as string;
         if (stats[key]) {
             stats[key].count++;
             stats[key].totalWealth += wealth;
         }
       }
    });

    return { stats, totalMarketWealth };
  }, [players, stocks]);

  const toggleSector = (sector: Sector) => {
    setSelectedSectors(prev => {
      if (prev.includes(sector)) {
        return prev.filter(s => s !== sector);
      } else {
        return [...prev, sector];
      }
    });
  };

  const handleRegenerate = () => {
    if (selectedSectors.length === 0) {
      alert("请至少选择一个行业板块！");
      return;
    }
    regenerateStocks(selectedSectors);
  };

  const selectAllSectors = () => setSelectedSectors(Object.values(Sector));
  const clearAllSectors = () => setSelectedSectors([]);

  const handleStartGame = () => {
      startGame();
      if (onClose) onClose(); // Close modal on start
  };

  const handleResetGame = () => {
      if(confirm('确定要重置游戏吗？所有玩家数据将被清空。')) {
          resetGame();
      }
  };

  const addLoanProvider = () => {
      if (!newProvider.name) return;
      const provider: LoanProvider = {
          id: `lp_${Date.now()}`,
          name: newProvider.name || 'New Bank',
          rate: Number(newProvider.rate) || 0.1,
          leverage: Number(newProvider.leverage) || 2,
          color: newProvider.color || 'gray',
          desc: newProvider.desc || '风险自负'
      };
      updateSettings({ loanProviders: [...settings.loanProviders, provider] });
      setNewProvider({ name: '', rate: 0.1, leverage: 2, color: 'gray', desc: '' });
  };

  const removeLoanProvider = (id: string) => {
      updateSettings({ loanProviders: settings.loanProviders.filter(p => p.id !== id) });
  };

  const handleDividend = () => {
      if (!dividendStockId) return;
      if (confirm(`确定要对选中的股票执行每股 ¥${dividendAmount} 的现金分红吗？\n(资金将直接发放给所有持仓玩家)`)) {
          distributeDividends(dividendStockId, dividendAmount);
          alert('分红已执行');
      }
  };

  const formatMoney = (val: number) => {
     if (val > 100000000) return `¥${(val/100000000).toFixed(2)}亿`;
     if (val > 10000) return `¥${(val/10000).toFixed(1)}万`;
     return `¥${val.toFixed(0)}`;
  };

  const realPlayers = players.filter(p => !p.isBot);
  const botCount = players.length - realPlayers.length; // This logic in component is based on state, but we configure bot count in settings

  // Calculate Recommended Stock Count
  // Logic: Ideally 1 stock per 1.5 - 2 active traders to ensure liquidity.
  // We use settings.botCount because that's what WILL be generated on reset/start, plus current real players.
  const totalProjectedAgents = realPlayers.length + settings.botCount;
  const recommendedStockCount = Math.max(4, Math.floor(totalProjectedAgents * 0.6));

  const applyRecommendation = () => {
      updateSettings({ stockCount: recommendedStockCount });
  };

  return (
    <div className="h-full bg-gray-900 text-white p-6 overflow-y-auto font-sans relative">
      {/* Close Button for Modal Mode */}
      {onClose && (
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 bg-gray-700 hover:bg-gray-600 rounded-full p-2 transition-colors z-50"
        >
            <span className="material-icons text-white">close</span>
        </button>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-700 pb-4 pr-12">
          <div>
             <h1 className="text-2xl font-bold flex items-center gap-2">
               <span className="material-icons text-red-500">admin_panel_settings</span>
               管理员控制台
             </h1>
             <div className="flex items-center gap-4 mt-1">
                 <div className="text-sm text-gray-400">控制游戏流程与参数设置</div>
                 {hasApiKey ? (
                     <span className="text-[10px] bg-green-900 text-green-300 px-2 py-0.5 rounded border border-green-600">AI Service Online</span>
                 ) : (
                     <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded border border-gray-600">AI Service Offline (No Key)</span>
                 )}
             </div>
          </div>
          <div className="text-right">
             <div className="text-xs text-gray-500">当前阶段</div>
             <div className="font-bold text-yellow-400 text-lg">{phase}</div>
             {phase === GamePhase.TRADING && <div className="text-mono">{Math.floor(timeLeft / 60)}分{timeLeft % 60}秒</div>}
          </div>
        </div>
        
        {/* --- MARKET ECOSYSTEM ANALYTICS --- */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
           <h2 className="text-lg font-bold mb-4 text-green-400 flex items-center gap-2">
             <span className="material-icons">pie_chart</span> 
             市场资金生态分布
             <span className="text-sm font-normal text-gray-400 ml-auto">总流动性: {formatMoney(marketStats.totalMarketWealth)}</span>
           </h2>
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {(Object.entries(marketStats.stats) as [string, StatData][]).map(([key, data]) => {
                  const percent = marketStats.totalMarketWealth > 0 ? (data.totalWealth / marketStats.totalMarketWealth) * 100 : 0;
                  let barColor = 'bg-gray-600';
                  if (key === 'REAL') barColor = 'bg-blue-500';
                  if (key === BotLevel.NEWBIE) barColor = 'bg-green-500';
                  if (key === BotLevel.HOT_MONEY) barColor = 'bg-red-500';
                  if (key === BotLevel.WHALE) barColor = 'bg-purple-600';

                  return (
                    <div key={key} className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">{data.label}</div>
                        <div className="text-xl font-bold font-mono mb-1">{data.count} <span className="text-xs font-normal text-gray-500">人</span></div>
                        <div className="text-sm font-mono text-gray-200">{formatMoney(data.totalWealth)}</div>
                        <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                           <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }}></div>
                        </div>
                        <div className="text-xs text-right mt-1 text-gray-500">{percent.toFixed(1)}% 资金占比</div>
                    </div>
                  );
              })}
           </div>
        </div>

        {/* Phase 1: Settings (Lobby) */}
        {phase === GamePhase.LOBBY && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
             
             <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500/50 rounded-xl flex justify-between items-center">
                <div>
                   <div className="text-xs text-blue-300 uppercase tracking-wider">当前交易大厅代码</div>
                   <div className="text-4xl font-mono font-bold text-white tracking-[0.5em]">{roomCode}</div>
                </div>
                <div className="text-right text-sm text-gray-400">
                   请将此代码告知玩家
                </div>
             </div>

             <h2 className="text-lg font-bold mb-4 text-blue-400">比赛配置</h2>
             
             {/* --- LOAN SETTINGS --- */}
             <div className="bg-gray-900 p-4 rounded-xl border border-gray-600 mb-6">
                 <h3 className="font-bold text-sm text-yellow-400 mb-3 flex items-center gap-2">
                     <span className="material-icons text-sm">account_balance</span> 融资渠道设置 (杠杆配置)
                 </h3>
                 <div className="grid gap-3 mb-4">
                     {settings.loanProviders.map(p => (
                         <div key={p.id} className="flex items-center gap-3 bg-gray-800 p-2 rounded border border-gray-700">
                             <div className={`w-8 h-8 rounded flex items-center justify-center bg-${p.color}-900 border border-${p.color}-500 text-${p.color}-300 font-bold`}>
                                 {p.name[0]}
                             </div>
                             <div className="flex-1">
                                 <div className="font-bold text-sm">{p.name}</div>
                                 <div className="text-xs text-gray-400">{p.desc}</div>
                             </div>
                             <div className="text-right mr-4">
                                 <div className="text-xs text-gray-500">利率/杠杆</div>
                                 <div className="font-mono text-sm font-bold">{(p.rate * 100).toFixed(0)}% / 1:{p.leverage}</div>
                             </div>
                             <button onClick={() => removeLoanProvider(p.id)} className="text-gray-500 hover:text-red-500 p-1">
                                 <span className="material-icons text-sm">delete</span>
                             </button>
                         </div>
                     ))}
                 </div>
                 
                 {/* Add New Provider */}
                 <div className="flex gap-2 items-end border-t border-gray-700 pt-3">
                     <div className="flex-1">
                         <label className="text-[10px] text-gray-500">名称</label>
                         <input className="w-full bg-gray-800 text-xs p-2 rounded border border-gray-600" placeholder="渠道名称" value={newProvider.name} onChange={e => setNewProvider({...newProvider, name: e.target.value})} />
                     </div>
                     <div className="w-20">
                         <label className="text-[10px] text-gray-500">利率 (0.1=10%)</label>
                         <input className="w-full bg-gray-800 text-xs p-2 rounded border border-gray-600" type="number" step="0.01" value={newProvider.rate} onChange={e => setNewProvider({...newProvider, rate: Number(e.target.value)})} />
                     </div>
                     <div className="w-20">
                         <label className="text-[10px] text-gray-500">杠杆 (倍)</label>
                         <input className="w-full bg-gray-800 text-xs p-2 rounded border border-gray-600" type="number" value={newProvider.leverage} onChange={e => setNewProvider({...newProvider, leverage: Number(e.target.value)})} />
                     </div>
                     <button onClick={addLoanProvider} className="bg-blue-600 text-white p-2 rounded h-[34px] flex items-center"><span className="material-icons text-sm">add</span></button>
                 </div>
             </div>

             {/* Stock Generation Settings */}
             <div className="bg-gray-900 p-4 rounded-xl border border-gray-600 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-sm text-purple-400">股票池设置 (AI 生成)</h3>
                </div>
                
                {/* AI & PLAYER RATIO RECOMMENDATION */}
                <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg mb-4 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] text-purple-300 uppercase tracking-wider">智能推荐算法</div>
                        <div className="text-xs text-gray-300 mt-1">
                            当前交易主体: <span className="font-bold text-white">{totalProjectedAgents}</span> 人 
                            (真人{realPlayers.length} + AI{settings.botCount})
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-[10px] text-gray-400">建议股票数</div>
                            <div className="text-xl font-bold text-purple-400">{recommendedStockCount} <span className="text-xs">支</span></div>
                        </div>
                        {settings.stockCount !== recommendedStockCount && (
                            <button 
                                onClick={applyRecommendation}
                                className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded transition-colors animate-pulse"
                            >
                                应用推荐
                            </button>
                        )}
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-xs text-gray-500 mb-1">
                      股票数量: <span className="text-white font-bold">{settings.stockCount}</span> 支
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">4</span>
                      <input 
                        type="range"
                        min="4" max="200" step="4"
                        value={settings.stockCount}
                        onChange={(e) => updateSettings({ stockCount: parseInt(e.target.value) })}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-gray-500">200</span>
                    </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs text-gray-500">行业板块选择 (至少选1个)</label>
                    <div className="space-x-2">
                       <button onClick={selectAllSectors} className="text-[10px] text-blue-400 hover:text-blue-300">全选</button>
                       <button onClick={clearAllSectors} className="text-[10px] text-gray-500 hover:text-gray-400">清空</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.values(Sector).map(sector => (
                      <button
                        key={sector}
                        onClick={() => toggleSector(sector)}
                        className={`text-xs px-2 py-1 rounded border transition-all ${
                          selectedSectors.includes(sector)
                            ? 'bg-blue-900/50 border-blue-500 text-blue-200'
                            : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500'
                        }`}
                      >
                        {sector}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                   onClick={handleRegenerate}
                   className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-2 rounded-lg mb-4 flex items-center justify-center gap-2 shadow-lg"
                >
                   <span className="material-icons">auto_awesome</span>
                   AI 生成股票池
                </button>

                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 border-t border-gray-700 pt-4">
                   {stocks.map(stock => (
                     <div key={stock.id} className="flex items-center gap-2 bg-gray-800 p-2 rounded border border-gray-700">
                        <span className="text-[10px] px-1 rounded bg-gray-700 text-gray-300 whitespace-nowrap overflow-hidden max-w-[60px] text-ellipsis">
                          {stock.sector.split('/')[0]}
                        </span>
                        <input 
                          type="text"
                          value={stock.name}
                          onChange={(e) => updateStockName(stock.id, e.target.value)}
                          className="bg-transparent border-b border-gray-600 text-xs font-bold w-full focus:outline-none focus:border-blue-400"
                        />
                        <span className="text-xs font-mono text-gray-500">¥{stock.price}</span>
                     </div>
                   ))}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                   <label className="block text-xs text-gray-500 mb-1">初始资金 (单位: 万)</label>
                   <div className="flex items-center gap-2">
                     <input 
                       type="number" 
                       value={settings.initialCash / 10000} 
                       onChange={(e) => updateSettings({ initialCash: Math.max(1, parseInt(e.target.value)) * 10000 })}
                       className="flex-1 bg-gray-900 border border-gray-600 rounded p-2"
                     />
                     <span className="text-gray-400 font-bold">万</span>
                   </div>
                </div>
                <div>
                   <label className="block text-xs text-gray-500 mb-1">集合竞价时长 (秒)</label>
                   <div className="flex items-center gap-2">
                     <input 
                       type="number" 
                       value={settings.openingDuration} 
                       onChange={(e) => updateSettings({ openingDuration: Math.max(10, parseInt(e.target.value)) })}
                       className="flex-1 bg-gray-900 border border-gray-600 rounded p-2"
                     />
                     <span className="text-gray-400 font-bold">s</span>
                   </div>
                </div>
             </div>

             {/* TIME AND BOT SETTINGS */}
             <div className="grid grid-cols-3 gap-4 mb-6 bg-gray-900 p-4 rounded-xl border border-gray-600">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">单节交易时长 (分)</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            min="1" max="60"
                            value={settings.morningDuration / 60} 
                            onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value)) * 60;
                                updateSettings({ morningDuration: val, afternoonDuration: val });
                            }}
                            className="flex-1 bg-gray-800 border border-gray-500 rounded p-2 text-white"
                        />
                        <span className="text-xs text-gray-400">min</span>
                    </div>
                    <div className="text-[9px] text-gray-600 mt-1">控制早盘和尾盘</div>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">午休时长 (秒)</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number"
                            min="10" 
                            value={settings.breakDuration} 
                            onChange={(e) => updateSettings({ breakDuration: Number(e.target.value) })}
                            className="flex-1 bg-gray-800 border border-gray-500 rounded p-2 text-white"
                        />
                        <span className="text-xs text-gray-400">s</span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">AI 机器人数量</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number"
                            min="0" max="200" 
                            value={settings.botCount} 
                            onChange={(e) => updateSettings({ botCount: Number(e.target.value) })}
                            className="flex-1 bg-gray-800 border border-gray-500 rounded p-2 text-white"
                        />
                        <span className="text-xs text-gray-400">个</span>
                    </div>
                </div>
             </div>
             
             {/* Market Speed Control */}
             <div className="mb-6">
                <label className="block text-xs text-gray-500 mb-1">市场心跳频率: {settings.marketRefreshRate / 1000}秒/次 (基础Tick)</label>
                <div className="flex items-center gap-2">
                   <span className="text-xs text-red-400 font-bold">极速 (0.5s)</span>
                   <input 
                      type="range"
                      min="0.5" max="5" step="0.5"
                      value={settings.marketRefreshRate / 1000}
                      onChange={(e) => updateSettings({ marketRefreshRate: Number(e.target.value) * 1000 })}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                   />
                   <span className="text-xs text-blue-400 font-bold">缓慢 (5s)</span>
                </div>
             </div>
             
             <div className="flex justify-between items-center border-t border-gray-700 pt-4">
               <div className="flex-1 mr-4">
                  <h3 className="font-bold mb-2">已加入真人玩家 ({realPlayers.length})</h3>
                  <div className="text-xs text-gray-400 mb-2">系统将自动补充 {botCount} 个 AI 机器人</div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                     {realPlayers.length > 0 ? realPlayers.map(p => (
                       <span key={p.id} className={`px-3 py-1 rounded-full text-xs flex items-center gap-2 bg-blue-900 text-blue-200 border border-blue-700`}>
                         {p.displayName}
                         <button onClick={() => kickPlayer(p.id)} className="hover:text-red-400 ml-1 font-bold">✕</button>
                       </span>
                     )) : (
                       <div className="text-gray-500 text-sm italic w-full">等待玩家加入...</div>
                     )}
                  </div>
               </div>
               <button 
                 onClick={handleStartGame}
                 className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-lg font-bold shadow-lg text-lg min-w-[150px]"
               >
                 开始比赛
               </button>
             </div>
          </div>
        )}

        {/* Phase 2: In-Game Controls */}
        {(phase === GamePhase.TRADING || phase === GamePhase.OPENING) && (
          <div className="grid grid-cols-1 gap-6">
             <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold mb-4 text-red-400">比赛控制</h2>
                  <p className="text-sm text-gray-400 mb-4">
                     当前 AI 正在以 <strong>{settings.newsFrequency} ({FREQUENCY_DESCRIPTIONS[settings.newsFrequency]})</strong> 的频率自动干预市场。
                     <br/>
                     市场心跳: <strong>{settings.marketRefreshRate / 1000}秒/次</strong> (随机活跃模式)
                  </p>
                  
                  {/* Real-time speed adjustment */}
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-1">实时调整心跳速度</label>
                    <div className="flex items-center gap-2">
                       <input 
                          type="range"
                          min="0.5" max="5" step="0.5"
                          value={settings.marketRefreshRate / 1000}
                          onChange={(e) => updateSettings({ marketRefreshRate: Number(e.target.value) * 1000 })}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                       />
                       <span className="text-sm font-mono w-16 text-right">{settings.marketRefreshRate / 1000}s</span>
                    </div>
                  </div>

                  {/* MARKET DEPTH & PLAYER IMPACT CONTROL (NEW) */}
                  <div className="bg-gray-900 p-4 rounded-xl border border-gray-600 mb-4">
                      <h3 className="font-bold text-sm text-orange-400 mb-3 flex items-center gap-2">
                          <span className="material-icons text-sm">tune</span> 市场平衡参数
                      </h3>
                      
                      {/* Depth Control */}
                      <div className="mb-4">
                          <label className="block text-[10px] text-gray-500 mb-1">市场深度 (价格弹性)</label>
                          <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-500 w-12">高波动</span>
                                  <input 
                                      type="range" 
                                      min="1000" max="200000" step="1000"
                                      value={settings.marketDepth}
                                      onChange={(e) => updateSettings({ marketDepth: Number(e.target.value) })}
                                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <span className="text-[10px] text-gray-500 w-12 text-right">极稳定</span>
                              </div>
                              <div className="flex justify-between">
                                  <div className="text-[10px] text-gray-400 font-mono">深度: {settings.marketDepth.toLocaleString()}</div>
                                  <div className="flex gap-1">
                                      <button onClick={() => updateSettings({ marketDepth: 2000 })} className="text-[9px] bg-gray-800 border border-gray-600 px-1 rounded hover:bg-orange-900">娱乐</button>
                                      <button onClick={() => updateSettings({ marketDepth: 10000 })} className="text-[9px] bg-gray-800 border border-gray-600 px-1 rounded hover:bg-blue-900">标准</button>
                                      <button onClick={() => updateSettings({ marketDepth: 200000 })} className="text-[9px] bg-gray-800 border border-gray-600 px-1 rounded hover:bg-gray-700">真实</button>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Player Impact Control */}
                      <div>
                          <label className="block text-[10px] text-gray-500 mb-1">玩家影响力 (主角光环)</label>
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 w-8">公平</span>
                              <input 
                                  type="range" 
                                  min="1" max="50" step="1"
                                  value={settings.playerImpactMultiplier || 1}
                                  onChange={(e) => updateSettings({ playerImpactMultiplier: Number(e.target.value) })}
                                  className="flex-1 h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-purple-500"
                              />
                              <span className="text-[10px] text-gray-500 w-8 text-right">上帝</span>
                          </div>
                          <div className="text-right text-[10px] text-purple-300 font-mono mt-1">
                              当前倍数: {settings.playerImpactMultiplier || 1}x
                          </div>
                      </div>
                  </div>

                  {/* DIVIDEND DISTRIBUTION (NEW) */}
                  <div className="bg-gray-900 p-4 rounded-xl border border-gray-600 mt-4">
                      <h3 className="font-bold text-sm text-green-400 mb-3 flex items-center gap-2">
                          <span className="material-icons text-sm">payments</span> 上市公司现金分红
                      </h3>
                      <div className="flex gap-2 items-center">
                          <div className="flex-1">
                              <select 
                                  value={dividendStockId}
                                  onChange={e => setDividendStockId(e.target.value)}
                                  className="w-full bg-gray-800 text-white text-xs p-2 rounded border border-gray-600 outline-none"
                              >
                                  <option value="">选择股票...</option>
                                  {stocks.map(s => (
                                      <option key={s.id} value={s.id}>{s.name} ({s.sector.split('/')[0]})</option>
                                  ))}
                              </select>
                          </div>
                          <div className="w-32 flex items-center gap-1">
                              <label className="text-[10px] text-gray-500 whitespace-nowrap">每股派息</label>
                              <input 
                                  type="number" 
                                  step="0.1"
                                  value={dividendAmount}
                                  onChange={e => setDividendAmount(parseFloat(e.target.value))}
                                  className="w-full bg-gray-800 text-white text-xs p-2 rounded border border-gray-600 outline-none"
                              />
                          </div>
                          <button 
                              onClick={handleDividend}
                              disabled={!dividendStockId}
                              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-3 py-2 rounded text-xs font-bold"
                          >
                              执行分红
                          </button>
                      </div>
                  </div>

                </div>
                <div className="flex gap-4 mt-6">
                  <button 
                     onClick={stopGame}
                     className="flex-1 bg-red-900/50 hover:bg-red-800 border border-red-700 text-red-200 py-4 rounded-lg font-bold"
                  >
                     强制休市 (结束比赛)
                  </button>
                </div>
             </div>
          </div>
        )}

        {/* Phase 3: Ended */}
        {phase === GamePhase.ENDED && (
           <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
              <h2 className="text-2xl font-bold mb-4 text-white">比赛已结束</h2>
              <p className="text-gray-400 mb-6">查看大屏幕上的数据统计，确认无误后可重置房间。</p>
              <button 
                onClick={handleResetGame}
                className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-lg font-bold text-lg"
              >
                重置房间 (返回大厅)
              </button>
           </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
