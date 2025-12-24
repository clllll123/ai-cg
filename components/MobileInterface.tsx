
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { GamePhase, Sector, Stock, Player, TradingSession, LoanProvider, StockTransaction, OrderBookItem, OrderType } from '../types';
import StockChart from './StockChart';
import PlayerLogin from './PlayerLogin';

// --- Helper for Colors (Chinese Market: Red=Up, Green=Down) ---
const getColorClass = (val: number, base: number = 0) => {
    if (val > base) return 'text-red-500';
    if (val < base) return 'text-green-500';
    return 'text-gray-300';
};

// --- Go Back Button Component ---
const BackToDashboardButton: React.FC = () => {
    return (
        <a href="/dashboard" className="absolute top-4 left-4 z-50 flex items-center gap-1 text-gray-400 hover:text-white bg-gray-900/50 hover:bg-gray-800 backdrop-blur px-3 py-1.5 rounded-lg text-xs transition-all border border-gray-700 hover:border-gray-500">
            <span className="material-icons text-sm">arrow_back</span>
            <span>退出</span>
        </a>
    );
};

// --- Network Signal Indicator ---
const NetworkSignal: React.FC<{ lastSyncTime: number; connectionError: string | null }> = ({ lastSyncTime, connectionError }) => {
    const [status, setStatus] = useState<'excellent' | 'good' | 'fair' | 'poor'>('excellent');

    useEffect(() => {
        const interval = setInterval(() => {
            const diff = Date.now() - lastSyncTime;
            if (diff < 2500) setStatus('excellent');
            else if (diff < 4000) setStatus('good');
            else if (diff < 8000) setStatus('fair');
            else setStatus('poor');
        }, 1000);
        return () => clearInterval(interval);
    }, [lastSyncTime]);

    let color = 'text-green-500';
    let icon = 'wifi';
    let label = 'Live';

    if (connectionError) {
        color = 'text-red-500';
        icon = 'wifi_off';
        label = '断开';
    } else if (status === 'excellent') { color = 'text-green-500'; icon = 'wifi'; label = '极佳'; }
    else if (status === 'good') { color = 'text-green-400'; icon = 'wifi'; label = '良好'; }
    else if (status === 'fair') { color = 'text-yellow-500'; icon = 'network_wifi_2_bar'; label = '一般'; }
    else { color = 'text-red-500'; icon = 'signal_wifi_bad'; label = '弱'; }

    return (
        <div className={`flex items-center gap-1 text-[10px] font-mono font-bold ${color} bg-gray-900/80 px-2 py-1 rounded-full border border-gray-700/50 shadow-sm`}>
            <span className="material-icons text-[12px]">{icon}</span>
            <span>{label}</span>
        </div>
    );
};

// --- Loading Screen ---
const LoadingScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full bg-[#050b14] text-white p-6 sm:p-8">
        <div className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3 sm:mb-4"></div>
        <h2 className="text-xs sm:text-sm font-bold text-blue-400">正在接入交易所...</h2>
    </div>
);

// --- Lobby Screen ---
const LobbyScreen: React.FC<{ isSynced: boolean, onSync: () => void, roomCode: string }> = ({ isSynced, onSync, roomCode }) => {
    return (
        <div className="flex flex-col h-full bg-[#050b14] text-white relative overflow-hidden p-4 sm:p-6">
            <BackToDashboardButton />
            <div className="flex-1 flex flex-col items-center justify-center z-10">
                <div className="mb-6 sm:mb-8 relative">
                    <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full"></div>
                    <span className="material-icons text-5xl sm:text-6xl text-blue-400 relative z-10">meeting_room</span>
                </div>
                
                <h1 className="text-xl sm:text-2xl font-black mb-2 text-center">交易候机室</h1>
                <div className="text-[10px] sm:text-xs font-mono bg-gray-900 px-2.5 sm:px-3 py-1 rounded border border-gray-800 text-gray-500 mb-6 sm:mb-8">
                    ROOM: {roomCode}
                </div>

                <div className="w-full max-w-xs bg-gray-900/80 backdrop-blur border border-gray-800 p-4 sm:p-6 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <span className="text-[10px] sm:text-xs text-gray-400">市场数据同步</span>
                        {isSynced ? (
                            <span className="text-green-500 text-[10px] sm:text-xs font-bold flex items-center gap-1">
                                <span className="material-icons text-[12px] sm:text-[14px]">check_circle</span> 就绪
                            </span>
                        ) : (
                            <span className="text-yellow-500 text-[10px] sm:text-xs font-bold flex items-center gap-1 animate-pulse">
                                <span className="material-icons text-[12px] sm:text-[14px]">downloading</span> 下载中
                            </span>
                        )}
                    </div>
                    
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4 sm:mb-6">
                        <div className={`h-full transition-all duration-500 ${isSynced ? 'bg-green-500 w-full' : 'bg-blue-500 w-1/3 animate-pulse'}`}></div>
                    </div>

                    {!isSynced ? (
                        <button onClick={onSync} className="w-full py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg text-[10px] sm:text-xs">
                            点击同步数据
                        </button>
                    ) : (
                        <div className="text-center bg-green-900/10 border border-green-900/30 py-2.5 sm:py-3 rounded-xl">
                            <span className="text-green-500 text-[10px] sm:text-xs font-bold animate-pulse">等待大屏开盘...</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="text-center text-[9px] sm:text-[10px] text-gray-600">请保持屏幕常亮</div>
        </div>
    );
};

// --- STOCK LIST ITEM ---
const MobileStockItem = React.memo(({ stock, onClick, phase, tradingSession }: { stock: Stock; onClick: (id: string) => void, phase: GamePhase, tradingSession: TradingSession }) => {
  const prevPrice = useRef(stock.price);
  const [flashType, setFlashType] = useState<'' | 'flash-bg-red' | 'flash-bg-green'>('');
  const isOpening = phase === GamePhase.OPENING;
  const isMarketClosed = tradingSession === TradingSession.BREAK || tradingSession === TradingSession.DAY_END || phase === GamePhase.ENDED;

  useEffect(() => {
    // Only flash if price actually changed significantly
    if (Math.abs(stock.price - prevPrice.current) > 0.001) {
        if (!isOpening && !isMarketClosed) {
            setFlashType(''); // Reset to trigger reflow if needed
            // Use setTimeout to allow browser to register the state reset if overlapping
            setTimeout(() => {
                setFlashType(stock.price > prevPrice.current ? 'flash-bg-red' : 'flash-bg-green');
            }, 10);
        }
    }
    prevPrice.current = stock.price;
  }, [stock.price, isOpening, isMarketClosed]);

  const change = ((stock.price - stock.openPrice) / stock.openPrice) * 100;
  const isUp = change >= 0;
  const colorClass = isOpening ? 'text-gray-400' : (isUp ? 'text-red-500' : 'text-green-500');
  
  return (
      <div 
        onClick={() => onClick(stock.id)} 
        className={`relative p-4 rounded-xl mb-3 border border-gray-800/50 flex justify-between items-center active:scale-[0.98] transition-transform bg-gray-900/40 overflow-hidden ${isMarketClosed ? 'grayscale opacity-70' : ''}`}
      >
        {/* Flash Background Layer */}
        <div 
            className={`absolute inset-0 z-0 pointer-events-none ${flashType}`} 
            onAnimationEnd={() => setFlashType('')}
        ></div>

        <div className="z-10 relative">
            <div className="font-bold text-white text-base flex items-center gap-2">
                {stock.name}
                {!isOpening && change >= 29.9 && <span className="text-[10px] bg-red-600 text-white px-1 rounded font-normal animate-pulse">涨停</span>}
                {!isOpening && change <= -29.9 && <span className="text-[10px] bg-green-600 text-white px-1 rounded font-normal animate-pulse">跌停</span>}
            </div>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">{stock.sector.split('/')[0]}</span>
                <span className="text-[10px] text-gray-500 font-mono">{stock.symbol}</span>
            </div>
        </div>
        <div className="text-right z-10 relative">
            <div className={`text-lg font-mono font-bold ${colorClass}`}>
               ¥{stock.price.toFixed(2)}
            </div>
            <div className={`text-xs font-mono font-bold mt-0.5 ${colorClass}`}>
                {isOpening ? '--' : `${isUp ? '+' : ''}${change.toFixed(2)}%`}
            </div>
        </div>
      </div>
  );
}, (prev, next) => prev.stock === next.stock && prev.phase === next.phase && prev.tradingSession === next.tradingSession);

// --- ME TAB ---
const MeTab: React.FC<{ player: Player, settings: any, borrowMoney: any, repayDebt: any, stocks: Stock[] }> = ({ player, settings, borrowMoney, repayDebt, stocks }) => {
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanAmount, setLoanAmount] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<LoanProvider | null>(null);

  const equity = useMemo(() => {
      let assets = player.cash; 
      stocks.forEach(s => { assets += (player.portfolio[s.id] || 0) * s.price; });
      return assets - player.debt;
  }, [player, stocks]);

  const openLoan = (provider: LoanProvider) => {
      setSelectedProvider(provider);
      setLoanAmount(0);
      setShowLoanModal(true);
  };

  return (
    <div className="p-4 space-y-6 pb-20 animate-fade-in">
       {/* User Info Card */}
       <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 p-4 opacity-10"><span className="material-icons text-8xl text-white">account_balance_wallet</span></div>
          <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-blue-400">
                      {player.avatar || '👤'}
                  </div>
                  <div>
                      <div className="text-xs text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded border border-blue-500/30 inline-block mb-1">{player.prefix}</div>
                      <div className="text-xl font-bold text-white leading-none">{player.name}</div>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <div className="text-[10px] text-gray-400 uppercase mb-1">总资产 (Equity)</div>
                      <div className="font-mono text-xl font-bold text-white">¥{equity.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                  </div>
                  <div>
                      <div className="text-[10px] text-gray-400 uppercase mb-1">可用现金</div>
                      <div className="font-mono text-xl font-bold text-yellow-400">¥{player.cash.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                  </div>
                  <div>
                      <div className="text-[10px] text-gray-400 uppercase mb-1">当前负债</div>
                      <div className="font-mono text-xl font-bold text-red-400">¥{player.debt.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                  </div>
                  <div>
                      <div className="text-[10px] text-gray-400 uppercase mb-1">初始本金</div>
                      <div className="font-mono text-xl font-bold text-gray-500">¥{player.initialCapital.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                  </div>
              </div>
          </div>
       </div>

       {/* Stats Section */}
       <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 p-3 rounded-xl border border-gray-700 text-center">
                <div className="text-[10px] text-gray-500 mb-1 flex justify-center items-center gap-1"><span className="material-icons text-xs">receipt_long</span> 交易次数</div>
                <div className="font-mono font-bold text-white text-lg">{player.stats?.tradeCount || 0}</div>
            </div>
            <div className="bg-gray-900 p-3 rounded-xl border border-gray-700 text-center">
                <div className="text-[10px] text-gray-500 mb-1 flex justify-center items-center gap-1"><span className="material-icons text-xs">trending_up</span> 历史峰值</div>
                <div className="font-mono font-bold text-green-400 text-lg">¥{((player.stats?.peakValue || 0)/10000).toFixed(1)}w</div>
            </div>
       </div>

       {/* Loan Section */}
       <div>
           <div className="flex justify-between items-center mb-3 px-1">
               <h3 className="font-bold text-sm text-gray-400 uppercase tracking-widest flex items-center gap-2">
                   <span className="material-icons text-sm">account_balance</span> 金融借贷中心
               </h3>
           </div>
           
           <div className="space-y-3">
                {/* Repay Button if in debt */}
                {player.debt > 0 && (
                    <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl flex justify-between items-center mb-4 shadow-lg relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                        <div>
                            <div className="text-xs text-red-300 mb-1">待还本息总额</div>
                            <div className="text-xl font-mono font-bold text-red-500">¥{player.debt.toLocaleString()}</div>
                        </div>
                        <button 
                            onClick={() => repayDebt(Math.min(player.cash, player.debt))} 
                            className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg active:scale-95 transition-all"
                        >
                            一键还款
                        </button>
                    </div>
                )}

                {/* Loan Providers List */}
                {(settings.loanProviders || []).map((provider: LoanProvider) => (
                    <div 
                        key={provider.id} 
                        onClick={() => openLoan(provider)}
                        className={`relative overflow-hidden rounded-xl border p-4 flex justify-between items-center bg-gradient-to-r from-gray-900 to-gray-800 transition-all active:scale-[0.98] cursor-pointer shadow-md border-${provider.color}-500/30 group`}
                    >
                        <div className="relative z-10">
                            <div className={`font-bold text-base text-${provider.color}-400 flex items-center gap-2 group-hover:text-${provider.color}-300 transition-colors`}>
                                {provider.name}
                                <span className={`text-[9px] px-2 py-0.5 rounded-full bg-${provider.color}-900/50 text-${provider.color}-200 border border-${provider.color}-500/30`}>
                                    1:{provider.leverage}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{provider.desc}</div>
                        </div>
                        <div className="text-right relative z-10">
                            <div className="text-[10px] text-gray-500">日利率</div>
                            <div className={`text-lg font-mono font-bold text-${provider.color}-400 group-hover:scale-110 transition-transform`}>{(provider.rate * 100).toFixed(0)}%</div>
                        </div>
                    </div>
                ))}
           </div>
       </div>
       
       <div className="text-center">
           <button onClick={() => window.location.reload()} className="bg-gray-800 text-gray-500 py-2 px-6 rounded-full text-xs font-mono mt-4 border border-gray-700 hover:text-white hover:border-gray-500 transition-all">
               RELOAD APP
           </button>
       </div>

       {/* Loan Modal */}
       {showLoanModal && selectedProvider && (
           <div className="fixed inset-0 z-[100] flex items-end bg-black/80 backdrop-blur-sm pb-safe" onClick={() => setShowLoanModal(false)}>
               <div className="w-full bg-[#111] border-t border-gray-800 p-6 rounded-t-3xl shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                   <div className="flex justify-between items-center mb-6">
                       <h3 className={`font-bold text-xl text-${selectedProvider.color}-400`}>
                           {selectedProvider.name} <span className="text-white text-sm">申请融资</span>
                       </h3>
                       <button onClick={() => setShowLoanModal(false)} className="text-gray-500 text-2xl">✕</button>
                   </div>

                   <div className="bg-gray-900 p-4 rounded-xl mb-6 border border-gray-800">
                       <div className="flex justify-between mb-2">
                           <span className="text-xs text-gray-500">我的现金</span>
                           <span className="text-sm font-mono font-bold text-yellow-400">¥{player.cash.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between border-t border-gray-800 pt-2 mt-2">
                           <span className="text-xs text-gray-500">最大可借 (杠杆{selectedProvider.leverage}倍)</span>
                           <span className="text-sm font-mono font-bold text-blue-400">¥{(player.cash * (selectedProvider.leverage - 1)).toLocaleString()}</span>
                       </div>
                   </div>

                   <div className="mb-6">
                       <div className="flex justify-between mb-2">
                           <span className="text-xs text-gray-500">借入金额</span>
                       </div>
                       <div className="flex items-center gap-3">
                           <button onClick={() => setLoanAmount(Math.max(0, loanAmount - 10000))} className="w-12 h-12 bg-gray-800 rounded-xl text-xl font-bold border border-gray-700">-</button>
                           <div className="flex-1 bg-gray-800 rounded-xl h-12 flex items-center justify-center border border-gray-700">
                               <input 
                                   type="number" 
                                   value={loanAmount} 
                                   onChange={e => setLoanAmount(Number(e.target.value))}
                                   className="bg-transparent text-center text-xl font-mono font-bold text-white w-full outline-none"
                               />
                           </div>
                           <button onClick={() => setLoanAmount(loanAmount + 10000)} className="w-12 h-12 bg-gray-800 rounded-xl text-xl font-bold border border-gray-700">+</button>
                       </div>
                       <div className="flex gap-2 mt-3">
                           <button onClick={() => setLoanAmount(10000)} className="flex-1 bg-gray-800 py-2 rounded-lg text-xs text-gray-400 font-mono">1w</button>
                           <button onClick={() => setLoanAmount(50000)} className="flex-1 bg-gray-800 py-2 rounded-lg text-xs text-gray-400 font-mono">5w</button>
                           <button onClick={() => setLoanAmount(100000)} className="flex-1 bg-gray-800 py-2 rounded-lg text-xs text-gray-400 font-mono">10w</button>
                       </div>
                   </div>

                   <button 
                        onClick={() => { borrowMoney(loanAmount, selectedProvider.name, selectedProvider.rate); setShowLoanModal(false); }}
                        className={`w-full py-4 bg-${selectedProvider.color}-600 hover:bg-${selectedProvider.color}-500 text-white font-bold rounded-xl shadow-lg text-lg flex justify-center items-center gap-2`}
                   >
                       <span>确认借入</span>
                       <span className="font-mono opacity-80">¥{loanAmount.toLocaleString()}</span>
                   </button>
               </div>
           </div>
       )}
    </div>
  );
};

// --- STOCK DETAIL COMPONENT (REFACTORED) ---

// Real Order Book Sub-component (Accepts props instead of generating)
const OrderBook: React.FC<{ bids: OrderBookItem[], asks: OrderBookItem[] }> = React.memo(({ bids, asks }) => {
    // Determine max volume for visual bar
    const maxVol = Math.max(
        ...bids.map(b => b.v), 
        ...asks.map(a => a.v),
        100 // Minimum baseline
    );

    return (
        <div className="mb-4 bg-gray-900/50 rounded-lg border border-gray-800 p-2 text-[10px] font-mono">
            {/* Header */}
            <div className="flex justify-between mb-1 pb-1 border-b border-gray-800 text-gray-500 px-1">
                <span>买盘 (Bid)</span>
                <span>卖盘 (Ask)</span>
            </div>

            <div className="flex gap-2">
                 {/* BIDS (Buy) */}
                <div className="flex-1 space-y-0.5">
                    {bids.map((b, i) => (
                        <div key={`bid-${i}`} className="flex justify-between items-center relative h-5">
                            {/* Vol Bar */}
                            <div className="absolute top-0 bottom-0 right-0 bg-red-900/20" style={{ width: `${(b.v / maxVol) * 100}%` }}></div>
                            <span className="text-gray-500 z-10 w-6">买{i+1}</span>
                            <span className="text-red-500 z-10 font-bold">{b.p.toFixed(2)}</span>
                            <span className="text-gray-400 z-10 text-right w-8">{b.v}</span>
                        </div>
                    ))}
                </div>

                {/* ASKS (Sell) */}
                <div className="flex-1 space-y-0.5">
                    {asks.map((a, i) => (
                        <div key={`ask-${i}`} className="flex justify-between items-center relative h-5">
                            {/* Vol Bar (Left aligned for right column usually, but here simplicity) */}
                            <div className="absolute top-0 bottom-0 left-0 bg-green-900/20" style={{ width: `${(a.v / maxVol) * 100}%` }}></div>
                            <span className="text-gray-400 z-10 w-8">{a.v}</span>
                            <span className="text-green-500 z-10 font-bold">{a.p.toFixed(2)}</span>
                            <span className="text-gray-500 z-10 w-6 text-right">卖{i+1}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

// Financial Stats Grid
const StatsGrid: React.FC<{ stock: Stock }> = ({ stock }) => {
    const change = ((stock.price - stock.openPrice) / stock.openPrice) * 100;
    
    // Calculate P/E (Price / EPS)
    const pe = stock.eps > 0 ? (stock.price / stock.eps) : 0;
    
    // Calculate Turnover Rate (Total Vol / Total Shares)
    const turnover = stock.totalShares > 0 ? (stock.totalVolume / stock.totalShares) * 100 : 0;
    
    // Calculate Market Cap (Price * Total Shares)
    const mktCap = stock.price * stock.totalShares;
    
    const formatNumber = (num: number) => {
        if (num > 100000000) return (num / 100000000).toFixed(2) + '亿';
        if (num > 10000) return (num / 10000).toFixed(1) + '万';
        return num.toFixed(0);
    };

    // Find Day High/Low
    const prices = stock.history.map(h => h.price);
    const dayHigh = Math.max(...prices, stock.price);
    const dayLow = Math.min(...prices, stock.price);

    return (
        <div className="grid grid-cols-4 gap-2 mb-4 px-1">
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">今开</span>
                <span className={`text-xs font-mono font-bold ${getColorClass(stock.openPrice, stock.history[0]?.price || stock.openPrice)}`}>{stock.openPrice.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">最高</span>
                <span className="text-xs font-mono font-bold text-red-400">{dayHigh.toFixed(2)}</span>
            </div>
             <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">最低</span>
                <span className="text-xs font-mono font-bold text-green-400">{dayLow.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">成交量</span>
                <span className="text-xs font-mono font-bold text-yellow-400">{formatNumber(stock.totalVolume)}</span>
            </div>
             <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">成交额</span>
                <span className="text-xs font-mono font-bold text-gray-300">{formatNumber(stock.totalVolume * stock.price)}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">换手率</span>
                <span className="text-xs font-mono font-bold text-gray-300">{turnover.toFixed(2)}%</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">市盈率(TTM)</span>
                <span className="text-xs font-mono font-bold text-gray-300">{pe > 0 ? pe.toFixed(1) : '-'}</span>
            </div>
             <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">总市值</span>
                <span className="text-xs font-mono font-bold text-gray-300">{formatNumber(mktCap)}</span>
            </div>
        </div>
    );
};

interface StockDetailProps {
    stock: Stock;
    player: Player;
    onClose: () => void;
    onCancelOrder: (id: string) => void;
    onOpenTrade: (action: 'buy' | 'sell') => void;
    phase: GamePhase;
    tradingSession: TradingSession;
}

const StockDetail: React.FC<StockDetailProps> = ({ stock, player, onClose, onCancelOrder, onOpenTrade, phase, tradingSession }) => {
    const change = ((stock.price - stock.openPrice) / stock.openPrice) * 100;
    const isUp = change >= 0;
    const colorClass = isUp ? 'text-red-500' : 'text-green-500';
    const chartColor = isUp ? '#ef4444' : '#22c55e';
    
    // Check Market Status for Visuals
    const isMarketClosed = tradingSession === TradingSession.BREAK || tradingSession === TradingSession.DAY_END || phase === GamePhase.ENDED;
    
    // Position info
    const heldQty = player.portfolio[stock.id] || 0;
    const avgCost = player.costBasis[stock.id] || 0;
    const profit = (stock.price - avgCost) * heldQty;
    const profitPercent = avgCost > 0 ? (profit / (avgCost * heldQty)) * 100 : 0;
    
    // Pending orders for this stock
    const myOrders = player.pendingOrders.filter(o => o.stockId === stock.id);

    return (
        <div className="fixed inset-0 z-[100] bg-[#050b14] flex flex-col animate-slide-up">
            {/* Header - Always active */}
            <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center bg-[#050b14] pt-safe z-10">
                <button onClick={onClose} className="text-gray-400 text-2xl p-1"><span className="material-icons">arrow_back</span></button>
                <div className="text-center">
                    <div className="font-bold text-white text-base">{stock.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{stock.symbol}</div>
                </div>
                <div className="w-8"></div>
            </div>

            {/* Scrollable Content - Grayscale if closed */}
            <div className={`flex-1 overflow-y-auto pb-24 relative ${isMarketClosed ? 'grayscale transition-all duration-1000' : ''}`}>
                
                {/* Market Closed Overlay */}
                {isMarketClosed && (
                    <div className="absolute top-40 left-0 right-0 z-20 flex justify-center pointer-events-none">
                        <div className="bg-black/60 border border-white/20 backdrop-blur-sm px-6 py-2 rounded-full text-white font-bold text-sm tracking-widest uppercase shadow-2xl flex items-center gap-2">
                            <span className="material-icons text-sm">pause_circle</span> 休市中
                        </div>
                    </div>
                )}

                {/* Price Info */}
                <div className="px-4 py-4 flex justify-between items-baseline border-b border-gray-800/50">
                    <div className={`text-4xl font-mono font-bold ${colorClass}`}>
                        ¥{stock.price.toFixed(2)}
                    </div>
                    <div className={`text-right ${colorClass}`}>
                        <div className="font-bold text-lg">{isUp?'+':''}{change.toFixed(2)}%</div>
                        <div className="text-xs text-gray-500">Vol: {(stock.totalVolume/10000).toFixed(1)}万</div>
                    </div>
                </div>

                {/* Chart - Opacity lower if closed */}
                <div className={`h-64 w-full py-4 border-b border-gray-800/50 ${isMarketClosed ? 'opacity-50' : ''}`}>
                     <StockChart data={stock.history} color={chartColor} height="100%" basePrice={stock.openPrice} />
                </div>

                <div className="px-4 pt-2">
                     {/* Financial Indicators Grid */}
                     <StatsGrid stock={stock} />

                     {/* Real Synced Order Book */}
                     {stock.buyBook && stock.sellBook ? (
                         <OrderBook bids={stock.buyBook} asks={stock.sellBook} />
                     ) : (
                         <div className="text-center text-xs text-gray-600 py-4 mb-4 border border-gray-800 border-dashed rounded">等待盘口数据同步...</div>
                     )}

                     {/* My Position (Always Visible) */}
                     <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-4 shadow-lg">
                         <div className="text-xs text-gray-500 mb-2 uppercase flex justify-between">
                             <span>我的持仓 (My Position)</span>
                             <span className="text-yellow-500 font-mono">Cash: ¥{player.cash.toLocaleString()}</span>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <div className="text-xs text-gray-400">持仓股数</div>
                                 <div className="font-mono text-white text-lg">{heldQty > 0 ? heldQty : <span className="text-gray-600">0</span>}</div>
                             </div>
                             <div className="text-right">
                                 <div className="text-xs text-gray-400">浮动盈亏</div>
                                 <div className={`font-mono text-lg font-bold ${heldQty > 0 ? (profit>=0?'text-red-500':'text-green-500') : 'text-gray-600'}`}>
                                     {heldQty > 0 ? `${profit>=0?'+':''}${profit.toFixed(0)} (${profitPercent.toFixed(1)}%)` : '--'}
                                 </div>
                             </div>
                         </div>
                         {heldQty > 0 && (
                            <div className="mt-2 text-xs text-gray-500 font-mono">
                                持仓成本: ¥{avgCost.toFixed(2)}
                            </div>
                         )}
                     </div>

                     {/* Pending Orders */}
                     <div className="mb-4">
                         <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">当前委托 (Active Orders)</h4>
                         {myOrders.length === 0 ? (
                             <div className="text-center text-gray-600 text-xs py-4 border border-gray-800 border-dashed rounded-lg">暂无挂单</div>
                         ) : (
                             <div className="space-y-2">
                                 {myOrders.map(o => (
                                     <div key={o.id} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center border border-gray-700 animate-fade-in">
                                         <div>
                                             <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${o.type==='buy'?'bg-red-900 text-red-300':'bg-green-900 text-green-300'}`}>
                                                    {o.type === 'buy' ? '买入' : '卖出'}
                                                </span>
                                                <span className="text-gray-300 text-sm font-mono">@{o.price.toFixed(2)}</span>
                                             </div>
                                             <div className="text-[10px] text-gray-500 mt-0.5">{new Date(o.timestamp).toLocaleTimeString()}</div>
                                         </div>
                                         <div className="flex items-center gap-3">
                                             <span className="text-sm font-mono text-white font-bold">{o.amount}股</span>
                                             <button onClick={() => onCancelOrder(o.id)} className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded text-xs">
                                                 撤单
                                             </button>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                     
                     {/* Company Info */}
                     <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 mb-8">
                         <h4 className="text-xs font-bold text-gray-500 mb-2">公司简介</h4>
                         <p className="text-sm text-gray-400 leading-relaxed">{stock.description}</p>
                     </div>
                </div>
            </div>

            {/* Action Bar (Fixed Bottom) - Disabled look if closed */}
            <div className={`absolute bottom-0 left-0 right-0 px-4 py-4 bg-[#050b14] border-t border-gray-800 flex gap-3 pb-safe z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] ${isMarketClosed ? 'grayscale opacity-80' : ''}`}>
                <button 
                    onClick={() => onOpenTrade('buy')}
                    disabled={isMarketClosed}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-gray-700 disabled:to-gray-800 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition-all flex flex-col items-center justify-center leading-none"
                >
                    <span className="text-base">买入</span>
                    <span className="text-[10px] font-normal opacity-80 mt-1">{isMarketClosed ? '休市中' : '做多看涨'}</span>
                </button>
                <button 
                    onClick={() => onOpenTrade('sell')}
                    disabled={isMarketClosed}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-gray-700 disabled:to-gray-800 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition-all flex flex-col items-center justify-center leading-none"
                >
                    <span className="text-base">卖出</span>
                    <span className="text-[10px] font-normal opacity-80 mt-1">{isMarketClosed ? '休市中' : '做空/平仓'}</span>
                </button>
            </div>
        </div>
    );
};

// --- MAIN INTERFACE ---
const MobileInterface: React.FC = () => {
  const { players, activePlayerId, stocks, placeOrder, cancelOrder, phase, tradingSession, notifications, marketIndex, roomCode, isDataSynced, requestDataSync, settings, borrowMoney, repayDebt, currentDay, timeLeft, lastSyncTime, mqttConnectionError } = useGame();
  
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio' | 'me'>('market');
  const [viewingStockId, setViewingStockId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState<number>(100);
  const [tradePrice, setTradePrice] = useState<number>(0); 
  const [isOrdering, setIsOrdering] = useState(false);
  const [showOrderSubmitted, setShowOrderSubmitted] = useState(false); 
  const [orderType, setOrderType] = useState<OrderType>(OrderType.LIMIT);
  const [stopPrice, setStopPrice] = useState<number>(0);
  const [trailingPercent, setTrailingPercent] = useState<number>(5);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [icebergSize, setIcebergSize] = useState<number>(0);
  const [tradeError, setTradeError] = useState<string | null>(null); 

  const player = players.find(p => p.id === activePlayerId);
  const initialIndex = 3000;
  const indexChange = ((marketIndex - initialIndex) / initialIndex) * 100;

  if (!activePlayerId || !player) return <PlayerLogin />;
  if (phase === GamePhase.LOBBY) return <LobbyScreen isSynced={isDataSynced} onSync={requestDataSync} roomCode={roomCode} />;
  if (stocks.length === 0) { if (!isDataSynced) requestDataSync(); return <LoadingScreen />; }

  const liveStock = viewingStockId ? stocks.find(s => s.id === viewingStockId) : null;
  const filteredStocks = stocks.filter(s => {
      const matchesSearch = s.name.includes(searchTerm) || s.symbol.includes(searchTerm.toUpperCase());
      const matchesSector = selectedSector === 'ALL' || s.sector === selectedSector;
      return matchesSearch && matchesSector;
  });

  const calculateEquity = () => {
    let assets = player.cash; 
    stocks.forEach(s => { assets += (player.portfolio[s.id] || 0) * s.price; });
    return assets - player.debt; 
  };
  const equity = calculateEquity();
  const pnl = equity - player.initialCapital;
  const pnlPercent = player.initialCapital > 0 ? (pnl / player.initialCapital) * 100 : 0;

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStockClick = (id: string) => { setViewingStockId(id); setIsTradeModalOpen(false); };
  const openTradeModal = (action: 'buy' | 'sell') => {
    const s = stocks.find(st => st.id === viewingStockId);
    if (!s) return;
    setTradeAction(action);
    setTradeAmount(100);
    setTradePrice(s.price);
    setOrderType(OrderType.LIMIT);
    setStopPrice(0);
    setTrailingPercent(5);
    setShowAdvancedSettings(false);
    setIcebergSize(0);
    setIsTradeModalOpen(true);
  };
  
  const setQuickAmount = (type: 'min' | 'quarter' | 'half' | 'max') => {
      const s = stocks.find(st => st.id === viewingStockId);
      if (!s) return;
      if (tradeAction === 'buy') {
          const maxAffordable = Math.floor(player.cash / s.price);
          let amt = 0;
          if (type === 'min') amt = 100;
          if (type === 'quarter') amt = Math.floor(maxAffordable * 0.25 / 100) * 100;
          if (type === 'half') amt = Math.floor(maxAffordable * 0.5 / 100) * 100;
          if (type === 'max') amt = Math.floor(maxAffordable / 100) * 100;
          setTradeAmount(Math.max(100, amt));
      } else {
          const owned = player.portfolio[s.id] || 0;
          let amt = 0;
          if (type === 'min') amt = Math.min(100, owned);
          if (type === 'quarter') amt = Math.floor(owned * 0.25 / 100) * 100;
          if (type === 'half') amt = Math.floor(owned * 0.5 / 100) * 100;
          if (type === 'max') amt = owned;
          setTradeAmount(Math.max(0, amt)); // Sell can be 0 if owned is less than 100 logic (handled by UI)
      }
  };

  const executeTrade = () => {
    if (viewingStockId) {
      const tradeCost = tradePrice * tradeAmount;
      const isBuy = tradeAction === 'buy';
      
      if (isBuy && player.cash < tradeCost) {
        setTradeError(`资金不足！需要 ¥${tradeCost.toLocaleString()}，但只有 ¥${player.cash.toLocaleString()}`);
        return;
      }
      
      if (tradeAmount <= 0) {
        setTradeError('交易数量必须大于0');
        return;
      }
      
      if (tradePrice <= 0) {
        setTradeError('交易价格必须大于0');
        return;
      }
      
      setTradeError(null);
      setIsOrdering(true);
      placeOrder(
          viewingStockId, 
          tradePrice, 
          tradeAmount, 
          tradeAction === 'buy',
          orderType,
          stopPrice > 0 ? stopPrice : undefined,
          orderType === OrderType.TRAILING_STOP ? trailingPercent : undefined,
          icebergSize > 0 ? icebergSize : undefined
      );
      setTimeout(() => { 
          setIsOrdering(false); 
          setShowOrderSubmitted(true);
          setTimeout(() => {
              setShowOrderSubmitted(false);
              setIsTradeModalOpen(false);
          }, 1000); 
      }, 300); 
    }
  };

  const tradeCost = tradePrice * tradeAmount;
  const canAfford = player.cash >= tradeCost;
  const isBuy = tradeAction === 'buy';

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-white font-sans w-full md:max-w-md md:mx-auto relative overflow-hidden">
      
      {/* Toast Notifications */}
      <div className="absolute top-24 left-0 right-0 z-[60] flex flex-col items-center gap-2 pointer-events-none px-4">
         {notifications.map(n => (
           <div key={n.id} className="pointer-events-auto bg-gray-800/90 backdrop-blur border border-gray-700 text-white px-4 py-2 rounded-full shadow-xl text-xs animate-fade-in-down">
              {n.message}
           </div>
         ))}
      </div>

      {/* Header */}
      <header className="px-5 py-3 pt-safe bg-[#050b14] border-b border-gray-800 flex justify-between items-center shrink-0 z-20 shadow-lg relative">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
             <div className="text-[10px] text-gray-500 font-bold uppercase">Total Assets</div>
             <NetworkSignal lastSyncTime={lastSyncTime} connectionError={mqttConnectionError} />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tighter">¥{equity.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
          <div className="flex items-center gap-2 mt-0.5">
             <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ${pnl>=0?'bg-red-900/30 text-red-500':'bg-green-900/30 text-green-500'}`}>
                {pnl>=0?'+':''}{pnlPercent.toFixed(2)}%
             </span>
             <span className="text-[10px] text-yellow-400 font-bold font-mono border border-yellow-500/30 px-1.5 py-0.5 rounded bg-yellow-900/20">
                 现金 ¥{player.cash.toLocaleString(undefined, {maximumFractionDigits:0})}
             </span>
          </div>
        </div>
        <div className="text-right">
             <div className="flex flex-col items-end gap-1 mb-1">
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">Day {currentDay}/{settings.totalDays}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${tradingSession===TradingSession.BREAK?'bg-yellow-600 text-white':'bg-blue-600 text-white'}`}>
                        {phase === GamePhase.OPENING ? '集合竞价' : tradingSession}
                    </span>
                 </div>
                 <div className={`flex items-center gap-1 font-mono text-xs font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
                     <span className="material-icons text-[10px]">timer</span>
                     {formatTime(timeLeft)}
                 </div>
             </div>
             <div className={`text-lg font-bold font-mono flex items-center justify-end gap-1 ${indexChange>=0?'text-red-500':'text-green-500'} leading-none`}>
                 <span className="text-sm">{indexChange>=0?'▲':'▼'}</span>
                 {marketIndex.toFixed(2)}
                 <span className="text-[10px] ml-1">{indexChange>=0?'+':''}{indexChange.toFixed(2)}%</span>
             </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#050b14] relative scroll-smooth pb-20">
          {!liveStock && activeTab === 'market' && (
              <>
                <div className="sticky top-0 z-30 bg-[#050b14]/95 backdrop-blur px-4 py-2 border-b border-gray-800 shadow-md">
                    <div className="relative mb-2">
                        <input type="text" placeholder="搜索代码/名称..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} 
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors" />
                        <span className="material-icons absolute left-3 top-2 text-gray-500 text-lg">search</span>
                    </div>
                    <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar mask-image-r">
                        <button onClick={() => setSelectedSector('ALL')} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold transition-colors ${selectedSector === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>全部</button>
                        {Object.values(Sector).map((sec) => (
                            <button key={sec} onClick={() => setSelectedSector(sec)} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold transition-colors ${selectedSector === sec ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>{sec.split('/')[0]}</button>
                        ))}
                    </div>
                </div>
                <div className="p-4">
                    {filteredStocks.map(stock => (
                        <MobileStockItem key={stock.id} stock={stock} onClick={handleStockClick} phase={phase} tradingSession={tradingSession} />
                    ))}
                    {filteredStocks.length === 0 && <div className="text-center text-gray-500 text-sm mt-10">未找到相关股票</div>}
                </div>
              </>
          )}

          {!liveStock && activeTab === 'portfolio' && (
              <div className="p-4 space-y-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase">当前持仓</h3>
                  {Object.keys(player.portfolio).length === 0 ? <div className="text-center text-gray-600 text-xs py-10">空空如也，快去交易吧！</div> : (
                      Object.entries(player.portfolio).map(([sid, qty]) => {
                          const s = stocks.find(st=>st.id===sid);
                          if(!s || (qty as number) <= 0) return null;
                          const avgCost = player.costBasis[sid] || 0;
                          const currentVal = s.price * (qty as number);
                          const profit = currentVal - (avgCost * (qty as number));
                          const profitPct = avgCost > 0 ? (profit / (avgCost * (qty as number))) * 100 : 0;
                          return (
                            <div key={sid} onClick={() => handleStockClick(sid)} className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-lg active:scale-[0.98] transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div><div className="font-bold text-lg text-white">{s.name}</div><div className="text-xs text-gray-500 font-mono">{s.symbol}</div></div>
                                    <div className={`text-right ${getColorClass(profit)}`}><div className="text-lg font-mono font-bold">{profit > 0 ? '+' : ''}{profit.toFixed(0)}</div><div className="text-xs bg-gray-800 px-1 rounded inline-block">{profitPct.toFixed(2)}%</div></div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center bg-gray-800/50 rounded-lg p-2">
                                    <div><div className="text-[10px] text-gray-500">持仓</div><div className="text-sm font-mono text-white">{qty}</div></div>
                                    <div><div className="text-[10px] text-gray-500">成本</div><div className="text-sm font-mono text-gray-300">{avgCost.toFixed(2)}</div></div>
                                    <div><div className="text-[10px] text-gray-500">现价</div><div className={`text-sm font-mono font-bold ${getColorClass(s.price, s.openPrice)}`}>{s.price.toFixed(2)}</div></div>
                                </div>
                            </div>
                          );
                      })
                  )}
              </div>
          )}

          {!liveStock && activeTab === 'me' && <MeTab player={player} settings={settings} borrowMoney={borrowMoney} repayDebt={repayDebt} stocks={stocks} />}
      </div>

      {liveStock && <StockDetail stock={liveStock} player={player} onClose={() => setViewingStockId(null)} onCancelOrder={cancelOrder} onOpenTrade={openTradeModal} phase={phase} tradingSession={tradingSession} />}

      {isTradeModalOpen && liveStock && (
         <div className="fixed inset-0 z-[120] flex items-end bg-black/80 backdrop-blur-sm pb-safe" onClick={() => !isOrdering && setIsTradeModalOpen(false)}>
           <div className="w-full bg-[#111] border-t border-gray-800 p-6 rounded-t-3xl shadow-2xl animate-slide-up relative overflow-hidden" onClick={e => e.stopPropagation()}>
              
              {showOrderSubmitted && (
                  <div className="absolute inset-0 bg-[#111] z-50 flex flex-col items-center justify-center animate-fade-in p-6">
                      <div className="w-20 h-20 rounded-full border-4 border-green-500 flex items-center justify-center mb-4"><span className="material-icons text-5xl text-green-500 animate-pulse">check_circle</span></div>
                      <h3 className="text-2xl font-bold text-white mb-1">订单已提交</h3>
                      <p className="text-gray-500 text-sm mb-4">正在等待主机确认...</p>
                      <div className="bg-gray-900 rounded-xl p-4 w-full border border-gray-800">
                          <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-400">股票</span>
                              <span className="text-white font-medium">{liveStock.name}</span>
                          </div>
                          <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-400">操作</span>
                              <span className={tradeAction === 'buy' ? 'text-red-400 font-medium' : 'text-green-400 font-medium'}>{tradeAction === 'buy' ? '买入' : '卖出'}</span>
                          </div>
                          <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-400">价格</span>
                              <span className="text-white font-medium">¥{tradePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                              <span className="text-gray-400">数量</span>
                              <span className="text-white font-medium">{tradeAmount}股</span>
                          </div>
                      </div>
                  </div>
              )}

              <div className="flex justify-between items-center mb-6">
                  <h3 className={`font-bold text-xl ${tradeAction==='buy'?'text-red-500':'text-green-500'}`}>
                      {tradeAction === 'buy' ? '买入' : '卖出'} <span className="text-white text-base font-normal">{liveStock.name}</span>
                  </h3>
                  <button onClick={() => { setIsTradeModalOpen(false); setTradeError(null); }} className="text-gray-500 text-2xl">✕</button>
              </div>
              
              {tradeError && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-2 animate-shake">
                      <span className="material-icons text-red-500 text-lg mt-0.5">error</span>
                      <div className="flex-1">
                          <div className="text-sm font-bold text-red-400 mb-1">交易失败</div>
                          <div className="text-xs text-red-300">{tradeError}</div>
                      </div>
                      <button onClick={() => setTradeError(null)} className="text-red-400 hover:text-red-300">
                          <span className="material-icons text-lg">close</span>
                      </button>
                  </div>
              )}
              
              <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded text-xs border border-gray-700">
                      <span className="text-gray-400">可用资金</span>
                      <span className="text-yellow-400 font-mono font-bold text-sm">¥{player.cash.toLocaleString()}</span>
                  </div>
                  
                  <div>
                      <span className="text-gray-500 text-xs mb-2 block">订单类型</span>
                      <div className="grid grid-cols-3 gap-2">
                          <button 
                              onClick={() => setOrderType(OrderType.MARKET)}
                              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                                  orderType === OrderType.MARKET 
                                  ? 'bg-blue-600 text-white shadow-lg' 
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                          >
                              市价单
                          </button>
                          <button 
                              onClick={() => setOrderType(OrderType.LIMIT)}
                              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                                  orderType === OrderType.LIMIT 
                                  ? 'bg-blue-600 text-white shadow-lg' 
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                          >
                              限价单
                          </button>
                          <button 
                              onClick={() => setOrderType(OrderType.STOP_LOSS)}
                              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                                  orderType === OrderType.STOP_LOSS 
                                  ? 'bg-blue-600 text-white shadow-lg' 
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                          >
                              止损单
                          </button>
                          <button 
                              onClick={() => setOrderType(OrderType.STOP_PROFIT)}
                              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                                  orderType === OrderType.STOP_PROFIT 
                                  ? 'bg-blue-600 text-white shadow-lg' 
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                          >
                              止盈单
                          </button>
                          <button 
                              onClick={() => setOrderType(OrderType.TRAILING_STOP)}
                              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                                  orderType === OrderType.TRAILING_STOP 
                                  ? 'bg-blue-600 text-white shadow-lg' 
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                          >
                              追踪止损
                          </button>
                          <button 
                              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                                  showAdvancedSettings 
                                  ? 'bg-purple-600 text-white shadow-lg' 
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                          >
                              <span className="material-icons text-xs">settings</span>
                              高级
                          </button>
                      </div>
                  </div>

                  {(orderType === OrderType.LIMIT || orderType === OrderType.STOP_LOSS || orderType === OrderType.STOP_PROFIT) && (
                      <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-xs">
                              {orderType === OrderType.LIMIT ? '限价' : '触发价'}
                          </span>
                          <div className="flex items-center gap-3">
                              <button onClick={()=>setTradePrice(Number((tradePrice-0.1).toFixed(2)))} className="w-10 h-10 bg-gray-800 rounded text-xl">-</button>
                              <span className="text-2xl font-mono font-bold w-24 text-center">{tradePrice.toFixed(2)}</span>
                              <button onClick={()=>setTradePrice(Number((tradePrice+0.1).toFixed(2)))} className="w-10 h-10 bg-gray-800 rounded text-xl">+</button>
                          </div>
                      </div>
                  )}

                  {orderType === OrderType.MARKET && (
                      <div className="flex items-center justify-between bg-blue-900/20 border border-blue-500/30 px-3 py-2 rounded">
                          <span className="text-blue-400 text-xs">市价单</span>
                          <span className="text-blue-300 text-xs">以最优价格立即成交</span>
                      </div>
                  )}

                  {(orderType === OrderType.STOP_LOSS || orderType === OrderType.STOP_PROFIT) && (
                      <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-xs">执行价</span>
                          <div className="flex items-center gap-3">
                              <button onClick={()=>setStopPrice(Number((stopPrice-0.1).toFixed(2)))} className="w-10 h-10 bg-gray-800 rounded text-xl">-</button>
                              <span className="text-xl font-mono font-bold w-24 text-center text-yellow-400">{stopPrice > 0 ? stopPrice.toFixed(2) : '市价'}</span>
                              <button onClick={()=>setStopPrice(Number((stopPrice+0.1).toFixed(2)))} className="w-10 h-10 bg-gray-800 rounded text-xl">+</button>
                          </div>
                      </div>
                  )}

                  {orderType === OrderType.TRAILING_STOP && (
                      <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-xs">回调比例 (%)</span>
                          <div className="flex items-center gap-3">
                              <button onClick={()=>setTrailingPercent(Math.max(1, trailingPercent-1))} className="w-10 h-10 bg-gray-800 rounded text-xl">-</button>
                              <span className="text-2xl font-mono font-bold w-16 text-center text-purple-400">{trailingPercent}%</span>
                              <button onClick={()=>setTrailingPercent(Math.min(20, trailingPercent+1))} className="w-10 h-10 bg-gray-800 rounded text-xl">+</button>
                          </div>
                      </div>
                  )}

                  {showAdvancedSettings && (
                      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 space-y-3">
                          <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                              <span className="material-icons text-xs">info</span>
                              高级设置
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-gray-500 text-xs"> iceberg 大单拆分</span>
                              <div className="flex items-center gap-2">
                                  <button onClick={()=>setIcebergSize(Math.max(0, icebergSize-1000))} className="w-8 h-8 bg-gray-800 rounded text-sm">-</button>
                                  <span className="text-sm font-mono w-20 text-center">{icebergSize > 0 ? icebergSize : '关闭'}</span>
                                  <button onClick={()=>setIcebergSize(Math.min(tradeAmount, icebergSize+1000))} className="w-8 h-8 bg-gray-800 rounded text-sm">+</button>
                              </div>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-gray-500 text-xs"> 订单有效期</span>
                              <select className="bg-gray-800 text-white text-xs py-1 px-2 rounded border border-gray-700">
                                  <option value="0">当日有效</option>
                                  <option value="1">1天</option>
                                  <option value="3">3天</option>
                                  <option value="7">7天</option>
                              </select>
                          </div>
                      </div>
                  )}

                  <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">数量</span>
                      <div className="flex items-center gap-3">
                          <button onClick={()=>setTradeAmount(Math.max(100, tradeAmount-100))} className="w-10 h-10 bg-gray-800 rounded text-xl">-</button>
                          <span className="text-2xl font-mono font-bold w-24 text-center">{tradeAmount}</span>
                          <button onClick={()=>setTradeAmount(tradeAmount+100)} className="w-10 h-10 bg-gray-800 rounded text-xl">+</button>
                      </div>
                  </div>
                  {isBuy && !canAfford && <div className="text-red-500 text-xs text-center font-bold animate-pulse bg-red-900/20 py-1 rounded">资金不足 (需 ¥{tradeCost.toFixed(0)})</div>}
                  <div className="flex gap-2 justify-end">
                      <button onClick={() => setQuickAmount('min')} className="flex-1 px-1 py-2 bg-gray-800 rounded text-xs text-gray-400 hover:bg-gray-700">最小</button>
                      <button onClick={() => setQuickAmount('quarter')} className="flex-1 px-1 py-2 bg-gray-800 rounded text-xs text-gray-400 hover:bg-gray-700">1/4仓</button>
                      <button onClick={() => setQuickAmount('half')} className="flex-1 px-1 py-2 bg-gray-800 rounded text-xs text-gray-400 hover:bg-gray-700">半仓</button>
                      <button onClick={() => setQuickAmount('max')} className="flex-1 px-1 py-2 bg-gray-800 rounded text-xs text-gray-400 hover:bg-gray-700">全仓</button>
                  </div>
              </div>

              <button 
                onClick={executeTrade} 
                disabled={isOrdering || (isBuy && !canAfford)}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2 ${tradeAction==='buy'?'bg-red-600 text-white disabled:bg-red-900/50 disabled:text-red-300':'bg-green-600 text-white disabled:bg-green-900/50'}`}
              >
                  {isOrdering ? <><span className="material-icons animate-spin">sync</span><span>提交中...</span></> : <><span>确认{tradeAction === 'buy' ? '买入' : '卖出'}</span><span className="text-xs opacity-70">({orderType})</span></>}
              </button>
           </div>
         </div>
      )}
      
      {!liveStock && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#050b14]/95 backdrop-blur border-t border-gray-800 flex justify-around items-center z-40 pb-safe md:max-w-md md:mx-auto">
            <button onClick={() => setActiveTab('market')} className={`flex flex-col items-center gap-1 p-2 ${activeTab==='market'?'text-blue-500':'text-gray-500'}`}><span className="material-icons">candlestick_chart</span><span className="text-[10px]">行情</span></button>
            <button onClick={() => setActiveTab('portfolio')} className={`flex flex-col items-center gap-1 p-2 ${activeTab==='portfolio'?'text-blue-500':'text-gray-500'}`}><span className="material-icons">pie_chart</span><span className="text-[10px]">持仓</span></button>
            <button onClick={() => setActiveTab('me')} className={`flex flex-col items-center gap-1 p-2 ${activeTab==='me'?'text-blue-500':'text-gray-500'}`}><span className="material-icons">person</span><span className="text-[10px]">我的</span></button>
        </div>
      )}
    </div>
  );
};

export default MobileInterface;
