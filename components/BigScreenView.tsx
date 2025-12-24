
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useUser } from '../context/UserContext';
import { GamePhase, Stock, MarketNews, TradingSession, Danmu, MidDayReport, Sector, NewsFrequency, NewsType, StockTransaction, DailyEvent } from '../types';
import StockChart from './StockChart';
import AdminDashboard from './AdminDashboard';
import CompanyOperationsPanel from './CompanyOperationsPanel';
import InvestmentMarketplacePanel from './InvestmentMarketplacePanel';
import { NewsDashboard } from './NewsMarqueePanel';
import { gameApi } from '../services/api';

// --- Daily Event Display Component ---
const EventDisplay: React.FC<{ event: DailyEvent | null; loading: boolean }> = ({ event, loading }) => {
  if (loading) {
    return (
      <div className="w-full max-w-4xl mb-6 bg-gray-800/80 backdrop-blur-xl border border-gray-700 rounded-3xl p-6 shadow-2xl animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-700 rounded w-1/6"></div>
        </div>
        <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="w-full max-w-4xl mb-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-6 shadow-2xl">
        <div className="text-center text-gray-400">
          <span className="material-icons text-4xl mb-2">schedule</span>
          <p className="text-lg font-bold">今日大事件即将公布</p>
          <p className="text-sm">市场正在等待重要消息...</p>
        </div>
      </div>
    );
  }

  const getEventColor = () => {
    const positiveEffects = event.effects.filter(e => 
      e.type === 'SECTOR_BOOST' || 
      (e.type === 'MARKET_SENTIMENT' && e.value > 0)
    ).length;
    
    const negativeEffects = event.effects.filter(e => 
      e.type === 'SECTOR_CRASH' || 
      (e.type === 'MARKET_SENTIMENT' && e.value < 0)
    ).length;

    if (positiveEffects > negativeEffects) return 'from-green-500/20 to-blue-500/20 border-green-500/30';
    if (negativeEffects > positiveEffects) return 'from-red-500/20 to-orange-500/20 border-red-500/30';
    return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
  };

  const getEventIcon = () => {
    const positiveEffects = event.effects.filter(e => 
      e.type === 'SECTOR_BOOST' || 
      (e.type === 'MARKET_SENTIMENT' && e.value > 0)
    ).length;
    
    const negativeEffects = event.effects.filter(e => 
      e.type === 'SECTOR_CRASH' || 
      (e.type === 'MARKET_SENTIMENT' && e.value < 0)
    ).length;

    if (positiveEffects > negativeEffects) return 'trending_up';
    if (negativeEffects > positiveEffects) return 'trending_down';
    return 'swap_horiz';
  };

  return (
    <div className={`w-full max-w-4xl mb-6 bg-gradient-to-r ${getEventColor()} backdrop-blur-xl border rounded-3xl p-6 shadow-2xl animate-fade-in-up`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="material-icons text-2xl">{getEventIcon()}</span>
          <h3 className="text-2xl font-black text-white">{event.title}</h3>
        </div>
        <span className="text-sm text-gray-400 bg-black/30 px-3 py-1 rounded-full">
          {event.triggerCondition === 'MORNING' ? '早盘' : event.triggerCondition === 'AFTERNOON' ? '尾盘' : '盘中'}
        </span>
      </div>
      
      <div className="mb-4">
        <p className="text-gray-300 text-lg leading-relaxed">{event.description}</p>
        <div className="mt-3 p-3 bg-black/20 rounded-xl border border-white/10">
          <p className="text-blue-300 font-semibold">{event.newsFlash}</p>
        </div>
      </div>

      {event.effects.length > 0 && (
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-sm text-gray-400 mb-2 uppercase tracking-wider">市场影响</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {event.effects.map((effect, index) => (
              <div key={index} className="flex items-center gap-2 text-sm p-2 bg-black/20 rounded">
                <span className={`material-icons text-xs ${
                  effect.type.includes('BOOST') ? 'text-green-400' : 
                  effect.type.includes('CRASH') ? 'text-red-400' : 
                  'text-yellow-400'
                }`}>
                  {effect.type.includes('BOOST') ? 'arrow_upward' : 
                   effect.type.includes('CRASH') ? 'arrow_downward' : 
                   'trending_flat'}
                </span>
                <span className="text-gray-300">{effect.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Confetti Effect Component ---
const Confetti: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const particles: any[] = [];
        const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // Create particles
        for (let i = 0; i < 200; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 10 + 5,
                h: Math.random() * 5 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                vy: Math.random() * 3 + 2,
                vx: Math.random() * 2 - 1,
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 10 - 5
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach((p, index) => {
                p.y += p.vy;
                p.x += Math.sin(p.y * 0.01) + p.vx;
                p.rotation += p.rotationSpeed;

                if (p.y > canvas.height) {
                    p.y = -20;
                    p.x = Math.random() * canvas.width;
                }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[100]" />;
};

// --- Sub-component for Stock Card (Optimized Flash) ---
const StockCard: React.FC<{ stock: Stock, showBigChart: boolean, fontSize: string, phase: GamePhase }> = React.memo(({ stock, showBigChart, fontSize, phase }) => {
  const [flashType, setFlashType] = useState<'' | 'flash-bg-red' | 'flash-bg-green'>('');
  const prevPriceRef = useRef(stock.price);
  const isOpening = phase === GamePhase.OPENING;

  // Calculate High/Low/Stats
  const { dayHigh, dayLow, volumeStr, netInflow, inflowRatio } = useMemo(() => {
      const prices = stock.history.map(h => h.price);
      const curHigh = Math.max(...prices, stock.price);
      const curLow = Math.min(...prices, stock.price);
      
      const vol = (stock.totalVolume / 10000).toFixed(1) + '万';
      
      // Calculate approximate net inflow from recent transactions
      let net = 0;
      let totalTxVol = 0;
      stock.transactions.slice(0, 50).forEach(tx => {
          const val = tx.price * tx.volume;
          totalTxVol += val;
          if(tx.type === 'buy') net += val;
          else net -= val;
      });
      const ratio = totalTxVol > 0 ? ((net / totalTxVol) + 1) / 2 : 0.5; 

      return { dayHigh: curHigh, dayLow: curLow, volumeStr: vol, netInflow: net, inflowRatio: ratio };
  }, [stock.history, stock.totalVolume, stock.transactions, stock.price]);

  const rangePercent = dayHigh === dayLow ? 50 : ((stock.price - dayLow) / (dayHigh - dayLow)) * 100;

  useEffect(() => {
    // Sharp flash on price change only
    if (Math.abs(stock.price - prevPriceRef.current) > 0.001 && !isOpening) {
        setFlashType(''); // Reset to allow reflow
        // Trigger animation
        const newFlash = stock.price > prevPriceRef.current ? 'flash-bg-red' : 'flash-bg-green';
        setTimeout(() => setFlashType(newFlash), 10);
    }
    prevPriceRef.current = stock.price;
  }, [stock.price, isOpening]);

  const change = ((stock.price - stock.openPrice) / stock.openPrice) * 100;
  const isUp = change >= 0;
  
  // Base container style
  const containerBase = isOpening ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-900/40 border-gray-800';
  const priceColor = isOpening ? 'text-gray-300' : (isUp ? 'text-red-500' : 'text-green-500');
  const badgeColor = isOpening ? 'bg-gray-700 text-gray-400' : (isUp ? 'bg-red-600' : 'bg-green-600');
  const chartColor = isOpening ? '#9ca3af' : (isUp ? '#ef4444' : '#22c55e'); 

  return (
    <div className={`relative overflow-hidden rounded-xl border flex flex-col h-full ${containerBase} shadow-lg group transition-colors duration-300`}>
      
      {/* Flash Layer */}
      <div 
        className={`absolute inset-0 z-0 pointer-events-none ${flashType}`} 
        onAnimationEnd={() => setFlashType('')}
      ></div>

      {/* 1. Top Section: Header Info (35%) */}
      <div className="flex justify-between items-start px-4 pt-3 pb-1 relative z-10 h-[35%]">
          {/* Left: Identity */}
          <div className="flex flex-col justify-start gap-1 w-3/5 overflow-hidden">
              <h2 className="font-black text-gray-100 text-2xl truncate drop-shadow-md leading-tight tracking-tight">
                  {stock.name}
              </h2>
              <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-blue-300 bg-blue-900/30 border border-blue-500/30 px-1.5 py-0.5 rounded tracking-wide">
                      {stock.sector.split('/')[0]}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">{stock.symbol}</span>
              </div>
          </div>

          {/* Right: Price */}
          <div className="flex flex-col items-end justify-start w-2/5">
             <div className={`font-mono font-black text-3xl tracking-tighter drop-shadow-lg leading-none ${priceColor}`}>
                 ¥{stock.price.toFixed(2)}
             </div>
             <div className={`flex items-center justify-center px-2 py-0.5 rounded text-white shadow-lg mt-1 min-w-[60px] ${badgeColor}`}>
                <span className="text-sm font-mono font-bold leading-none">{isOpening ? '--' : (isUp ? '+' : '')}{change.toFixed(2)}%</span>
             </div>
          </div>
      </div>

      {/* 2. Middle Section: Data Density (25%) */}
      <div className="px-4 h-[25%] flex flex-col justify-center gap-2 relative z-10">
          {/* A. Price Range Bar */}
          <div className="w-full flex items-center gap-2">
              <span className="text-[9px] font-mono text-green-500">{dayLow.toFixed(2)}</span>
              <div className="flex-1 h-1.5 bg-gray-700/50 rounded-full overflow-hidden relative">
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 transition-all duration-1000 ease-out"
                    style={{ left: `${rangePercent}%` }}
                  ></div>
                  <div className="w-full h-full bg-gradient-to-r from-green-900 via-gray-700 to-red-900 opacity-50"></div>
              </div>
              <span className="text-[9px] font-mono text-red-500">{dayHigh.toFixed(2)}</span>
          </div>

          {/* B. Stats Row */}
          <div className="flex justify-between items-center text-[10px] text-gray-400 bg-black/20 rounded px-2 py-1 border border-white/5">
              <div className="flex gap-2">
                  <span>量: <span className="text-yellow-400 font-mono">{volumeStr}</span></span>
              </div>
              <div className="flex items-center gap-1">
                  <span>资金:</span>
                  <div className="w-10 h-1.5 bg-gray-700 rounded-sm overflow-hidden flex">
                      <div className="h-full bg-green-500" style={{ width: `${(1-inflowRatio)*100}%` }}></div>
                      <div className="h-full bg-red-500" style={{ width: `${inflowRatio*100}%` }}></div>
                  </div>
              </div>
          </div>
      </div>

      {/* 3. Bottom Section: Chart (40%) */}
      <div className="flex-1 w-full relative border-t border-gray-700/30 bg-gradient-to-b from-transparent to-black/20 z-10">
          <StockChart data={stock.history} color={chartColor} height="100%" basePrice={stock.openPrice} />
      </div>
    </div>
  );
}, (prev, next) => {
    return prev.stock.price === next.stock.price && prev.stock.lastPrice === next.stock.lastPrice && prev.stock.history.length === next.stock.history.length && prev.phase === next.phase;
});

// --- Ranking Item Component (Combined) ---
const MarketMoverItem: React.FC<{ stock: Stock, rank: number, phase: GamePhase }> = React.memo(({ stock, rank, phase }) => {
    const change = ((stock.price - stock.openPrice) / stock.openPrice) * 100;
    const isUp = change >= 0;
    const isOpening = phase === GamePhase.OPENING;
    const colorClass = isOpening ? 'text-gray-400' : (isUp ? 'text-red-500' : 'text-green-500'); 
    
    // Gradient background based on movement intensity
    const bgOpacity = Math.min(0.3, Math.abs(change) / 20);
    const bgStyle = isOpening ? {} : { backgroundColor: isUp ? `rgba(239,68,68,${bgOpacity})` : `rgba(34,197,94,${bgOpacity})` };

    return (
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50 transition-colors" style={bgStyle}>
            <div className="flex items-center gap-3 overflow-hidden w-2/3">
                <div className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold shrink-0 ${rank <= 3 ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400'}`}>{rank}</div>
                <div className="flex flex-col">
                    <div className="text-sm font-bold text-gray-200 truncate leading-none mb-0.5">{stock.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono leading-none">{stock.symbol}</div>
                </div>
            </div>
            <div className="text-right">
                <div className={`text-sm font-mono font-bold ${colorClass} leading-none mb-0.5`}>{isOpening ? '--' : (isUp ? '+' : '')}{change.toFixed(2)}%</div>
                <div className="text-[10px] text-gray-400 font-mono leading-none">¥{stock.price.toFixed(2)}</div>
            </div>
        </div>
    );
}, (prev, next) => prev.stock.price === next.stock.price && prev.phase === next.phase);

// --- Real Time Trade Item (Big & Flashy) ---
const RealTimeTradeItem: React.FC<{ tx: any }> = ({ tx }) => {
    const isBuy = tx.type === 'buy';
    // Calculate total value for emphasis
    const totalVal = tx.price * tx.amount;
    const isBigTrade = totalVal > 50000;

    return (
        <div className={`flex justify-between items-center p-3 mb-2 rounded-xl border-l-4 animate-slide-in-right shadow-lg ${isBuy ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'} ${isBigTrade ? 'ring-1 ring-yellow-500/30' : ''}`}>
            <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-black px-2 py-0.5 rounded shadow ${isBuy ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                        {isBuy ? '买入' : '卖出'}
                    </span>
                    <span className="text-sm font-bold text-white tracking-wide">{tx.playerDisplayName}</span>
                </div>
                <div className="text-xs text-gray-400 pl-1">{new Date(tx.timestamp).toLocaleTimeString()}</div>
            </div>
            
            <div className="text-right">
                <div className="text-base font-bold text-gray-200">{tx.stockName}</div>
                <div className="flex items-baseline justify-end gap-2">
                    <span className="text-xs text-gray-400 font-mono">@{tx.price.toFixed(2)}</span>
                    <span className={`font-mono font-black ${isBigTrade ? 'text-yellow-400 text-xl' : 'text-gray-300 text-lg'}`}>
                        {tx.amount.toLocaleString()} <span className="text-xs font-normal text-gray-500">股</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

// ... (StockPreviewModal, ReportModal kept same, NewsItem enhanced) ...
const StockPreviewModal: React.FC<{ stocks: Stock[], onClose: () => void }> = ({ stocks, onClose }) => {
    return (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 w-full max-w-4xl h-[80vh] rounded-3xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="material-icons text-purple-400">inventory_2</span> 
                        股票池预览 ({stocks.length})
                    </h2>
                    <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full text-white transition-colors">
                        <span className="material-icons">close</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-900/30">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {stocks.map(s => (
                            <div key={s.id} className="bg-gray-800 border border-gray-700 p-4 rounded-xl hover:border-gray-500 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-white text-lg">{s.name}</div>
                                    <div className="text-xs font-mono text-gray-500">{s.symbol}</div>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="text-[10px] bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">{s.sector.split('/')[0]}</span>
                                    <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded font-mono">¥{s.price.toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-gray-400 leading-snug line-clamp-2">{s.description}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ReportModal: React.FC<{ report: MidDayReport, title: string }> = ({ report, title }) => (
    <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-12 animate-fade-in backdrop-blur-md">
        <div className="bg-gray-900 border border-gray-600 w-full max-w-4xl p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-600 blur-[100px] opacity-20"></div>
            <div className="text-center mb-8 relative z-10">
                <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold mb-2 tracking-widest uppercase">{title}</div>
                <h2 className="text-4xl font-black text-white">{report.title || "市场分析报告"}</h2>
            </div>
            <div className="grid grid-cols-3 gap-6 relative z-10">
                <div className="col-span-3 bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                    <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2"><span className="material-icons">analytics</span> 市场综述</h3>
                    <p className="text-lg text-gray-300 leading-relaxed">{report.summary}</p>
                </div>
                <div className="bg-red-900/20 p-6 rounded-2xl border border-red-900/50">
                    <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2"><span className="material-icons">trending_up</span> 明星个股</h3>
                    <p className="text-gray-300">{report.starStock}</p>
                </div>
                <div className="bg-green-900/20 p-6 rounded-2xl border border-green-900/50">
                    <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2"><span className="material-icons">trending_down</span> 避雷指南</h3>
                    <p className="text-gray-300">{report.trashStock}</p>
                </div>
                <div className="bg-yellow-900/20 p-6 rounded-2xl border border-yellow-900/50">
                    <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2"><span className="material-icons">visibility</span> 后市展望</h3>
                    <p className="text-gray-300">{report.marketOutlook}</p>
                </div>
            </div>
        </div>
    </div>
);

const getNewsLabel = (freq: NewsFrequency) => {
    switch(freq) {
        case NewsFrequency.LOW: return '安静';
        case NewsFrequency.MEDIUM: return '标准';
        case NewsFrequency.HIGH: return '活跃';
        case NewsFrequency.CRAZY: return '疯狂';
        default: return '标准';
    }
};

const BigScreenView: React.FC = () => {
  const navigate = useNavigate();
  const { stocks, marketIndex, players, timeLeft, phase, tradingSession, currentDay, news, roomCode, settings, danmuList, isHostOnline, startGame, regenerateStocks, updateSettings, midDayReport, dailyReport, startupCompanies, selectedCompany, availableDecisions, decisionResults, selectCompany, executeCompanyDecision, generateStartupCompanies, investmentMarketplace, createInvestmentCompetition, createInvestmentCooperation, joinCompetition, joinCooperation, createAlliance, joinAlliance, refreshInvestmentMarketplace } = useGame();
  const { user, updateProfile } = useUser();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showInvestmentMarketplace, setShowInvestmentMarketplace] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showStockPreview, setShowStockPreview] = useState(false);
  const [lobbyStep, setLobbyStep] = useState<'config' | 'scan'>('config');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 9;
  const [gameResultsSaved, setGameResultsSaved] = useState(false); 
  
  // Real Trade Feed State
  const [realTimeTrades, setRealTimeTrades] = useState<any[]>([]);
  
  // Daily Event State
  const [dailyEvent, setDailyEvent] = useState<DailyEvent | null>(null);
  const [eventLoading, setEventLoading] = useState(false);

  // Handle step parameter from URL for optimized flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stepParam = params.get('step');
    if (stepParam === 'scan') {
      setLobbyStep('scan');
    }
  }, []);
  
  // Fetch Daily Event
   useEffect(() => {
     const fetchDailyEvent = async () => {
       if (phase !== GamePhase.LOBBY) return;
       
       setEventLoading(true);
       // Determine current time (morning/afternoon) based on game settings
       const currentTime = new Date().getHours() < 12 ? 'MORNING' : 'AFTERNOON';
       
       try {
         const marketTrend = 0; // Default neutral trend for lobby
         const activeSectors = Object.values(Sector).slice(0, 5); // Use first 5 sectors
         
         const response = await fetch('/api/events/generate', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({
             currentTime,
             marketTrend,
             activeSectors
           })
         });
         
         if (response.ok) {
           const data = await response.json();
           if (data.success) {
             setDailyEvent(data.data);
           }
         }
       } catch (error) {
         console.error('获取大事件失败:', error);
         // Use a default event if API fails
         setDailyEvent({
           id: 'default-event',
           title: '市场平稳开局',
           description: '今日市场开盘平稳，投资者情绪稳定，各板块表现均衡。',
           effects: [
             {
               type: 'MARKET_SENTIMENT',
               value: 0.1,
               description: '市场情绪小幅回暖'
             }
           ],
           newsFlash: '今日市场开盘平稳，投资者可关注各板块轮动机会。',
           triggerCondition: currentTime
         });
       } finally {
         setEventLoading(false);
       }
     };
     
     fetchDailyEvent();
   }, [phase]);
  
  const lastProcessedTradeIds = useRef<Set<string>>(new Set());

  // Bottom Tab State (Trades vs Rankings)
  const [bottomTab, setBottomTab] = useState<'TRADES' | 'RANKINGS'>('RANKINGS');

  // Auto-switch bottom tab every 10s
  useEffect(() => {
      const interval = setInterval(() => {
          setBottomTab(prev => prev === 'TRADES' ? 'RANKINGS' : 'TRADES');
      }, 10000);
      return () => clearInterval(interval);
  }, []);

  // --- Real-time Trade Listener ---
  useEffect(() => {
      // Scan all real players for new trades
      const realPlayers = players.filter(p => !p.isBot);
      let newTrades: any[] = [];

      realPlayers.forEach(p => {
          if (p.tradeHistory && p.tradeHistory.length > 0) {
              // Check the latest trade
              const latest = p.tradeHistory[0];
              if (!lastProcessedTradeIds.current.has(latest.id) && (Date.now() - latest.time < 5000)) {
                  lastProcessedTradeIds.current.add(latest.id);
                  newTrades.push({
                      id: latest.id,
                      playerDisplayName: p.displayName,
                      type: latest.type,
                      stockName: latest.playerName, 
                      price: latest.price,
                      amount: latest.volume,
                      timestamp: latest.time
                  });
              }
          }
      });

      if (newTrades.length > 0) {
          // Keep only last 12 trades to fill the space
          setRealTimeTrades(prev => [...newTrades, ...prev].slice(0, 12)); 
          // If new trade comes in, switch to trades view temporarily
          setBottomTab('TRADES');
      }
  }, [players]);

  const sortedStocks = useMemo(() => [...stocks].sort((a, b) => parseInt(a.id) - parseInt(b.id)), [stocks]);
  
  // Merged Rankings: Top Movers (Abs change high to low)
  const marketMovers = useMemo(() => {
     const withChange = [...stocks].map(s => ({ 
         ...s, 
         changePercent: ((s.price - s.openPrice) / s.openPrice) * 100,
         absChange: Math.abs(((s.price - s.openPrice) / s.openPrice) * 100)
     }));
     // Sort by absolute change magnitude
     return withChange.sort((a, b) => b.absChange - a.absChange).slice(0, 10);
  }, [stocks]);

  // ... (Winners calculation same as before) ...
  const winners = useMemo(() => {
      if (phase !== GamePhase.ENDED) return [];
      return players
        .filter(p => !p.isBot)
        .map(p => {
            let assets = p.cash;
            stocks.forEach(s => { assets += (p.portfolio[s.id] || 0) * s.price; });
            assets -= p.debt;
            return { ...p, totalAssets: assets };
        })
        .sort((a, b) => b.totalAssets - a.totalAssets)
        .slice(0, 5);
  }, [phase, players, stocks]);

  useEffect(() => {
    if (stocks.length <= itemsPerPage) return;
    const interval = setInterval(() => { setCurrentPage(prev => (prev + 1) % Math.ceil(stocks.length / itemsPerPage)); }, 10000); 
    return () => clearInterval(interval);
  }, [stocks.length]);
  
  const visibleStocks = sortedStocks.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const initialIndex = 3000;

  // 游戏结束时保存游戏结果
  useEffect(() => {
    if (phase === GamePhase.ENDED && !gameResultsSaved && user && winners.length > 0) {
      const saveGameResults = async () => {
        try {
          // 为每个玩家保存游戏结果
          for (const player of winners) {
            if (player.id && player.id === user.id) {
              // 计算玩家资产
              let finalAssets = player.cash;
              stocks.forEach(s => { finalAssets += (player.portfolio[s.id] || 0) * s.price; });
              finalAssets -= player.debt;

              // 获取玩家排名
              const playerRank = winners.findIndex(p => p.id === player.id) + 1;
              
              // 保存游戏结果
              const result = await gameApi.saveGameResult({
                roomId: roomCode,
                userId: user.id,
                finalAssets,
                initialAssets: 100000, // 假设初始资产为10万
                rank: playerRank,
                totalPlayers: winners.length,
                tradeCount: player.stats?.tradeCount || 0,
                peakValue: player.stats?.peakValue || finalAssets,
                isWinner: playerRank === 1
              });

              if (result.success) {
                // 更新用户数据
                const { user: updatedUser } = result.data;
                updateProfile({
                  level: updatedUser.level,
                  xp: updatedUser.experience,
                  nextLevelExp: updatedUser.nextLevelExp,
                  rank: updatedUser.rank,
                  stats: {
                    ...user?.stats,
                    totalGames: (user?.stats?.totalGames || 0) + 1,
                    wins: (user?.stats?.wins || 0) + (playerRank === 1 ? 1 : 0)
                  }
                });
                
                if (updatedUser.leveledUp) {
                  // 如果有等级提升，设置等级提升数据
                  updateProfile({
                    levelUpData: {
                      oldLevel: updatedUser.oldLevel,
                      newLevel: updatedUser.newLevel,
                      oldRank: updatedUser.oldRank,
                      newRank: updatedUser.newRank,
                      expGained: updatedUser.expGained
                    }
                  });
                  console.log('玩家等级提升:', updatedUser);
                }
              }
            }
          }
          
          setGameResultsSaved(true);
        } catch (error) {
          console.error('保存游戏结果失败:', error);
        }
      };

      saveGameResults();
    }
  }, [phase, gameResultsSaved, user, winners, roomCode, stocks]);
  const indexChange = ((marketIndex - initialIndex) / initialIndex) * 100;
  const isIndexUp = indexChange >= 0;

  const sessionDuration = phase === GamePhase.OPENING ? settings.openingDuration 
                        : (tradingSession === TradingSession.BREAK ? settings.breakDuration 
                        : (tradingSession === TradingSession.DAY_END ? settings.breakDuration : settings.morningDuration));
  const progress = Math.max(0, Math.min(100, ((sessionDuration - timeLeft) / sessionDuration) * 100));
  
  const latestExpert = useMemo(() => [...news].find(n => n.type === NewsType.EXPERT), [news]);

  const getQrUrl = () => {
      const baseUrl = window.location.href.split('?')[0];
      return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(baseUrl + `?mode=mobile&code=${roomCode}`)}&bgcolor=111827&color=ffffff`;
  };

  // --- LOBBY VIEW ---
  if (phase === GamePhase.LOBBY) {
      // 1. CONFIGURATION STEP
      if (lobbyStep === 'config') {
          return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white relative bg-grid-pattern p-8">
                {/* Debug: Show startup companies count */}
                <div className="fixed bottom-4 right-4 z-50 glass-panel px-3 py-1 rounded text-xs text-gray-400">
                  创业公司: {startupCompanies.length}
                </div>
                
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/dashboard')} 
                    className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-800 px-4 py-2 rounded-xl border border-gray-700 hover:border-gray-500 z-50"
                >
                    <span className="material-icons">arrow_back</span>
                    <span className="font-bold">返回控制台</span>
                </button>

                {showStockPreview && <StockPreviewModal stocks={stocks} onClose={() => setShowStockPreview(false)} />}
                
                <div className="text-center mb-10 animate-fade-in-down">
                    <h1 className="text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">{settings.gameTitle}</h1>
                    <p className="text-xl text-gray-400 tracking-widest font-mono uppercase">游戏参数配置</p>
                </div>

                {/* Daily Event Display */}
                <EventDisplay event={dailyEvent} loading={eventLoading} />

                <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700 rounded-3xl p-8 w-full max-w-4xl shadow-2xl animate-fade-in-up">
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        {/* Days */}
                        <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700 hover:border-blue-500/50 transition-colors">
                            <label className="text-xs text-gray-500 mb-2 block uppercase tracking-wider font-bold">比赛天数</label>
                            <div className="flex items-center justify-between">
                                <button onClick={() => updateSettings({ totalDays: Math.max(1, settings.totalDays - 1) })} className="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 flex items-center justify-center transition-colors">
                                    <span className="material-icons">remove</span>
                                </button>
                                <span className="font-mono text-3xl font-black text-white">{settings.totalDays} <span className="text-sm font-normal text-gray-400">天</span></span>
                                <button onClick={() => updateSettings({ totalDays: settings.totalDays + 1 })} className="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 flex items-center justify-center transition-colors">
                                    <span className="material-icons">add</span>
                                </button>
                            </div>
                        </div>

                        {/* Duration */}
                        <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700 hover:border-blue-500/50 transition-colors">
                            <label className="text-xs text-gray-500 mb-2 block uppercase tracking-wider font-bold">单节时长 (早/午)</label>
                            <div className="flex items-center justify-between">
                                <button onClick={() => updateSettings({ morningDuration: Math.max(60, settings.morningDuration - 60), afternoonDuration: Math.max(60, settings.morningDuration - 60) })} className="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 flex items-center justify-center transition-colors">
                                    <span className="material-icons">remove</span>
                                </button>
                                <span className="font-mono text-3xl font-black text-white">{Math.floor(settings.morningDuration / 60)} <span className="text-sm font-normal text-gray-400">分</span></span>
                                <button onClick={() => updateSettings({ morningDuration: settings.morningDuration + 60, afternoonDuration: settings.morningDuration + 60 })} className="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 flex items-center justify-center transition-colors">
                                    <span className="material-icons">add</span>
                                </button>
                            </div>
                        </div>

                        {/* Cash */}
                        <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700 hover:border-blue-500/50 transition-colors">
                            <label className="text-xs text-gray-500 mb-2 block uppercase tracking-wider font-bold">初始资金</label>
                            <div className="flex items-center justify-between">
                                <button onClick={() => updateSettings({ initialCash: Math.max(10000, settings.initialCash - 10000) })} className="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 flex items-center justify-center transition-colors">
                                    <span className="material-icons">remove</span>
                                </button>
                                <span className="font-mono text-3xl font-black text-white">¥{(settings.initialCash/10000).toFixed(0)}<span className="text-sm font-normal text-gray-400">万</span></span>
                                <button onClick={() => updateSettings({ initialCash: settings.initialCash + 10000 })} className="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 flex items-center justify-center transition-colors">
                                    <span className="material-icons">add</span>
                                </button>
                            </div>
                        </div>

                        {/* News Freq */}
                        <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700 hover:border-blue-500/50 transition-colors">
                            <label className="text-xs text-gray-500 mb-2 block uppercase tracking-wider font-bold">新闻频率</label>
                            <div className="flex items-center justify-between">
                                <button 
                                    onClick={() => { 
                                        const freqs = Object.values(NewsFrequency); 
                                        const idx = freqs.indexOf(settings.newsFrequency); 
                                        const next = freqs[(idx + 1) % freqs.length]; 
                                        updateSettings({ newsFrequency: next }); 
                                    }} 
                                    className="w-full h-10 bg-gray-800 rounded-xl hover:bg-gray-700 text-lg font-bold text-white flex items-center justify-center gap-3 transition-colors"
                                >
                                    {getNewsLabel(settings.newsFrequency)}
                                    <span className="text-xs text-gray-500 font-normal">({settings.newsFrequency})</span>
                                </button>
                            </div>
                        </div>

                        {/* Stock Pool (Full Width) */}
                        <div className="col-span-2 bg-gray-900/50 p-6 rounded-2xl border border-gray-700 hover:border-blue-500/50 transition-colors flex justify-between items-center">
                            <div>
                                <label className="text-xs text-gray-500 block uppercase tracking-wider font-bold mb-1">股票池规模</label>
                                <div className="text-white font-black text-2xl">{settings.stockCount} <span className="text-sm font-normal text-gray-400">支股票</span></div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowStockPreview(true)} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-bold text-blue-400 border border-gray-600 transition-colors flex items-center gap-2">
                                    <span className="material-icons">visibility</span> 预览名单
                                </button>
                                <button onClick={() => regenerateStocks(Object.values(Sector))} className="px-6 py-3 bg-purple-900/30 hover:bg-purple-900/50 rounded-xl text-sm font-bold text-purple-300 border border-purple-500/30 transition-colors flex items-center gap-2">
                                    <span className="material-icons">refresh</span> 重新生成
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-700">
                         <button 
                            onClick={() => setLobbyStep('scan')} 
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xl px-12 py-4 rounded-2xl shadow-lg shadow-blue-900/30 transform hover:scale-[1.02] transition-all flex items-center gap-3"
                        >
                            <span>生成房间</span>
                            <span className="material-icons">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
          );
      }

      // 2. SCAN & WAIT STEP
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white relative bg-grid-pattern p-8">
            <button 
                onClick={() => setLobbyStep('config')} 
                className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-800 px-4 py-2 rounded-xl border border-gray-700 hover:border-gray-500 z-50"
            >
                <span className="material-icons">arrow_back</span>
                <span className="font-bold">修改配置</span>
            </button>

            {showStockPreview && <StockPreviewModal stocks={stocks} onClose={() => setShowStockPreview(false)} />}
            
            <div className="text-center mb-6 animate-fade-in-down">
                <h1 className="text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">{settings.gameTitle}</h1>
                <p className="text-lg text-gray-400 tracking-widest font-mono uppercase">等待玩家加入</p>
            </div>

            {/* Daily Event Display */}
            <EventDisplay event={dailyEvent} loading={eventLoading} />

            <div className="flex gap-8 items-stretch w-full max-w-6xl h-[550px]">
                
                {/* 1. LEFT: QR CODE */}
                <div className="w-2/5 bg-gray-800 rounded-3xl border-2 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.2)] flex flex-col items-center justify-center p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-500 animate-pulse"></div>
                    <div className="text-sm text-blue-300 mb-6 uppercase tracking-widest font-bold">学生扫码入场</div>
                    <div className="bg-white p-4 rounded-2xl mb-6 shadow-2xl">
                        <img src={getQrUrl()} alt="Join QR Code" className="w-56 h-56 rounded-lg" />
                    </div>
                    <div className="text-center w-full">
                        <div className="text-xs text-gray-500 mb-2 uppercase tracking-widest">房间号</div>
                        <div className="text-6xl font-mono font-black text-white tracking-[0.1em]">{roomCode}</div>
                    </div>
                </div>

                {/* 2. RIGHT: CONNECTED PLAYERS */}
                <div className="w-3/5 flex flex-col gap-4">
                    <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-3xl p-6 flex-1 flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
                            <h3 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                                <span className="material-icons text-green-400">groups</span>
                                已连接玩家
                            </h3>
                            <span className="bg-blue-900 text-blue-200 px-4 py-1 rounded-full text-sm font-bold font-mono">{players.filter(p=>!p.isBot).length} / {settings.maxPlayers}</span>
                        </div>
                        
                        {players.filter(p=>!p.isBot).length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                                <span className="material-icons text-6xl opacity-20 mb-4">person_add</span>
                                <p>等待第一位玩家加入...</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 content-start pr-2">
                                {players.filter(p=>!p.isBot).map(p => (
                                    <div key={p.id} className="bg-blue-900/30 text-blue-200 px-4 py-3 rounded-xl text-sm font-bold border border-blue-500/30 animate-fade-in flex items-center gap-3 w-full">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs text-white uppercase">
                                            {p.displayName.substring(0, 2)}
                                        </div>
                                        <span className="flex-1 truncate">{p.displayName}</span>
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={startGame} 
                        className="w-full py-5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-2xl rounded-2xl shadow-lg transform hover:scale-[1.01] transition-all flex items-center justify-center gap-3 group"
                    >
                        <span className="group-hover:animate-pulse material-icons text-3xl">play_circle</span>
                        开始比赛
                    </button>
                </div>
            </div>
            
            <button onClick={() => setShowAdminPanel(true)} className="absolute bottom-6 right-6 text-gray-600 hover:text-white flex items-center gap-2 text-sm">
                <span className="material-icons">settings</span> 高级设置
            </button>
            
            {showAdminPanel && <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center"><AdminDashboard onClose={() => setShowAdminPanel(false)} /></div>}
        </div>
      );
  }
  
  // --- ENDED VIEW ---
  if (phase === GamePhase.ENDED) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white relative bg-grid-pattern p-8">
              <button 
                  onClick={() => navigate('/dashboard')} 
                  className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-800 px-4 py-2 rounded-xl border border-gray-700 hover:border-gray-500 z-50"
              >
                  <span className="material-icons">arrow_back</span>
                  <span className="font-bold">返回控制台</span>
              </button>
              <Confetti />
              <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 mb-8 z-10 filter drop-shadow-lg">🏆 最终大赢家 🏆</h1>
              
              {winners.length > 0 ? (
                  <div className="flex items-end justify-center gap-6 z-10 w-full max-w-5xl h-[500px]">
                      {/* 2nd Place */}
                      {winners[1] && (
                          <div className="flex flex-col items-center w-1/3 animate-slide-up" style={{animationDelay: '0.2s'}}>
                              <div className="mb-4 text-center">
                                  <div className="text-2xl font-bold text-gray-300">{winners[1].displayName}</div>
                                  <div className="text-sm text-gray-500">{winners[1].prefix}</div>
                              </div>
                              <div className="w-full h-64 bg-gradient-to-b from-gray-400 to-gray-600 rounded-t-xl flex flex-col justify-end p-4 border-t-4 border-gray-300 shadow-2xl relative">
                                  <div className="text-center">
                                      <div className="text-4xl font-bold text-white mb-2">🥈</div>
                                      <div className="font-mono text-2xl font-bold text-white">¥{winners[1].totalAssets.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                                  </div>
                              </div>
                          </div>
                      )}
                      
                      {/* 1st Place */}
                      {winners[0] && (
                          <div className="flex flex-col items-center w-1/3 animate-slide-up z-20 -mt-12">
                              <div className="mb-4 text-center">
                                  <div className="text-3xl font-black text-yellow-300 drop-shadow-md">{winners[0].displayName}</div>
                                  <div className="text-base text-yellow-500/80 font-bold">{winners[0].prefix}</div>
                              </div>
                              <div className="w-full h-80 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-xl flex flex-col justify-end p-6 border-t-4 border-yellow-200 shadow-[0_0_50px_rgba(234,179,8,0.4)] relative">
                                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-6xl">👑</div>
                                  <div className="text-center">
                                      <div className="text-5xl font-bold text-white mb-2">🥇</div>
                                      <div className="font-mono text-4xl font-black text-white">¥{winners[0].totalAssets.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                                  </div>
                              </div>
                          </div>
                      )}
                      
                      {/* 3rd Place */}
                      {winners[2] && (
                          <div className="flex flex-col items-center w-1/3 animate-slide-up" style={{animationDelay: '0.4s'}}>
                              <div className="mb-4 text-center">
                                  <div className="text-2xl font-bold text-orange-200">{winners[2].displayName}</div>
                                  <div className="text-sm text-orange-400/60">{winners[2].prefix}</div>
                              </div>
                              <div className="w-full h-48 bg-gradient-to-b from-orange-500 to-orange-700 rounded-t-xl flex flex-col justify-end p-4 border-t-4 border-orange-300 shadow-2xl relative">
                                  <div className="text-center">
                                      <div className="text-4xl font-bold text-white mb-2">🥉</div>
                                      <div className="font-mono text-2xl font-bold text-white">¥{winners[2].totalAssets.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="text-2xl text-gray-500">没有真人玩家参与交易</div>
              )}
              
              <button onClick={() => window.location.reload()} className="mt-12 bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold text-white shadow-lg z-10">返回大厅</button>
          </div>
      );
  }

  // --- MAIN GAME VIEW ---
  return (
    <div className="w-full h-full bg-grid-pattern text-gray-100 p-4 flex flex-col gap-4 overflow-hidden relative font-sans">
      
      {/* Reports Overlay */}
      {midDayReport && tradingSession === TradingSession.BREAK && <ReportModal report={midDayReport} title="午间股评" />}
      {dailyReport && tradingSession === TradingSession.DAY_END && <ReportModal report={dailyReport} title="日结报告" />}

      {/* QR Code Modal */}
      {showQrModal && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-12" onClick={() => setShowQrModal(false)}>
              <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-bold text-white mb-4">扫码加入交易</h3>
                  <div className="bg-white p-2 rounded-xl mb-4"><img src={getQrUrl()} alt="Join QR" className="w-64 h-64" /></div>
                  <div className="text-4xl font-mono font-bold tracking-widest text-blue-400">{roomCode}</div>
                  <button onClick={() => setShowQrModal(false)} className="mt-6 text-gray-500 hover:text-white">关闭</button>
              </div>
          </div>
      )}

      {/* 1. TOP HEADER BAR */}
      <div className="flex items-stretch justify-between h-20 shrink-0 bg-gray-900/90 backdrop-blur border-b border-gray-700 px-6 py-3 rounded-2xl shadow-xl z-50">
         <div className="flex items-center gap-6">
             <div className="flex flex-col">
                 <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-white">{settings.gameTitle}</h1>
                 <div className="text-xs text-gray-500 flex items-center gap-2">
                     <span className="bg-gray-800 px-1 rounded text-gray-400">Day {currentDay}</span>
                     <span>|</span>
                     <button onClick={() => setShowQrModal(true)} className="hover:text-white flex items-center gap-1"><span className="material-icons text-xs">qr_code</span> {roomCode}</button>
                 </div>
             </div>
             
             <div className="flex flex-col justify-center px-6 border-l border-gray-700 h-full">
                 <span className="text-[10px] text-gray-400 uppercase tracking-widest">AI Composite Index</span>
                 <div className="flex items-baseline gap-2">
                     <span className={`text-3xl font-mono font-black ${isIndexUp?'text-red-500':'text-green-500'}`}>{marketIndex.toFixed(2)}</span>
                     <span className={`text-sm font-bold ${isIndexUp?'text-red-500':'text-green-500'}`}>{isIndexUp?'▲':'▼'} {Math.abs(indexChange).toFixed(2)}%</span>
                 </div>
             </div>
         </div>

         <div className="flex flex-col justify-center items-center w-1/4">
             <div className="text-sm font-bold text-yellow-400 mb-1 flex items-center gap-2">
                 {phase === GamePhase.OPENING ? 'PRE-MARKET' : tradingSession}
                 {timeLeft <= 10 && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
             </div>
             <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden relative">
                 <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }}></div>
             </div>
             <div className="text-xs font-mono text-gray-400 mt-1">{Math.floor(timeLeft / 60).toString().padStart(2,'0')}:{ (timeLeft % 60).toString().padStart(2,'0') } Remaining</div>
         </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
         {/* 2. LEFT: STOCK GRID (60%) */}
         <div className="w-3/5 glass-panel rounded-2xl p-4 shadow-2xl relative flex flex-col">
            <div className="grid grid-cols-3 grid-rows-3 gap-4 h-full overflow-hidden">
                {visibleStocks.map(stock => (
                   <StockCard key={stock.id} stock={stock} showBigChart={true} fontSize="" phase={phase} />
                ))}
            </div>
         </div>

         {/* 3. RIGHT: INFO DASHBOARD (40%) - REDESIGNED */}
         <div className="w-2/5 flex flex-col gap-4 overflow-hidden relative">
            
            {/* NEWS FEED (Top - 60%) - NEW CATEGORIZED NEWS DISPLAY */}
            <div className="glass-panel rounded-2xl flex flex-col h-[60%] overflow-hidden relative border border-blue-500/20 shadow-lg">
                <div className="bg-blue-900/10 border-b border-blue-500/20 p-2 shrink-0 flex justify-between items-center z-20">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-blue-400 text-sm">campaign</span>
                        <span className="text-xs font-bold text-blue-100">实时快讯 (Market News)</span>
                    </div>
                    {latestExpert && <div className="text-[10px] bg-blue-900 text-blue-300 px-2 py-0.5 rounded animate-pulse">专家解读中</div>}
                </div>
                
                {/* News Dashboard with Categorized Display */}
                <div className="flex-1 overflow-hidden p-2">
                    <NewsDashboard news={news} onNewsClick={(item) => console.log('News clicked:', item)} />
                </div>
            </div>

            {/* B. BOTTOM TAB PANEL (40%) - REAL TRADES & MOVERS MERGED */}
            <div className="glass-panel rounded-2xl flex flex-col h-[40%] overflow-hidden relative border border-gray-700 shadow-lg">
                {/* Tabs */}
                <div className="flex border-b border-gray-700 bg-gray-900/50">
                    <button 
                        onClick={() => setBottomTab('RANKINGS')}
                        className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${bottomTab === 'RANKINGS' ? 'bg-gray-800 text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <span className="material-icons text-xs">leaderboard</span> 异动榜
                    </button>
                    <button 
                        onClick={() => setBottomTab('TRADES')}
                        className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${bottomTab === 'TRADES' ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <span className="material-icons text-xs">bolt</span> 真人实盘
                        {realTimeTrades.length > 0 && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto scrollbar-hide bg-black/20 p-2">
                    {bottomTab === 'RANKINGS' && (
                        <div className="space-y-1">
                            {marketMovers.map((s, i) => (
                                <MarketMoverItem key={s.id} stock={s} rank={i+1} phase={phase} />
                            ))}
                        </div>
                    )}

                    {bottomTab === 'TRADES' && (
                        <div className="space-y-2">
                            {realTimeTrades.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 py-4">
                                    <span className="material-icons text-3xl mb-2 opacity-30">query_stats</span>
                                    <span className="text-xs">等待真人玩家交易...</span>
                                </div>
                            ) : (
                                realTimeTrades.map((tx) => <RealTimeTradeItem key={tx.id} tx={tx} />)
                            )}
                        </div>
                    )}
                </div>
            </div>

         </div>
      </div>
      
      {showAdminPanel && <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center"><AdminDashboard onClose={() => setShowAdminPanel(false)} /></div>}
      {selectedCompany && (
        <CompanyOperationsPanel
          company={selectedCompany}
          availableDecisions={availableDecisions}
          onExecuteDecision={executeCompanyDecision}
          onClose={() => selectCompany(null)}
          playerCash={players.find(p => p.id === user?.id)?.cash || 0}
        />
      )}
      {showInvestmentMarketplace && (
        <InvestmentMarketplacePanel
          marketplace={investmentMarketplace}
          startupCompanies={startupCompanies}
          onCreateCompetition={createInvestmentCompetition}
          onCreateCooperation={createInvestmentCooperation}
          onJoinCompetition={joinCompetition}
          onJoinCooperation={joinCooperation}
          onCreateAlliance={createAlliance}
          onJoinAlliance={joinAlliance}
          onRefresh={refreshInvestmentMarketplace}
          onClose={() => setShowInvestmentMarketplace(false)}
          playerCash={players.find(p => p.id === user?.id)?.cash || 0}
        />
      )}
      <button onClick={() => setShowAdminPanel(true)} className="fixed bottom-4 right-4 z-50 glass-panel p-3 rounded-full text-gray-400 hover:text-white shadow-xl hover:bg-blue-600 transition-all"><span className="material-icons">settings</span></button>
      
      {/* Startup Companies Button */}
      {phase === GamePhase.TRADING && (
        <button 
          onClick={() => {
            if (startupCompanies.length === 0) {
              generateStartupCompanies();
            }
            selectCompany(startupCompanies[0] || null);
          }}
          className="fixed bottom-4 right-20 z-50 glass-panel p-3 rounded-full text-gray-400 hover:text-white shadow-xl hover:bg-purple-600 transition-all"
        >
          <span className="material-icons">business_center</span>
        </button>
      )}
      
      {/* Investment Marketplace Button */}
      {phase === GamePhase.TRADING && (
        <button 
          onClick={() => setShowInvestmentMarketplace(true)}
          className="fixed bottom-4 right-36 z-50 glass-panel p-3 rounded-full text-gray-400 hover:text-white shadow-xl hover:bg-blue-600 transition-all"
        >
          <span className="material-icons">account_balance</span>
        </button>
      )}
      
      {/* Back to Dashboard Button */}
      <button 
        onClick={() => navigate('/dashboard')}
        className="fixed top-4 left-4 z-[60] glass-panel p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all flex items-center gap-2 opacity-50 hover:opacity-100 duration-300"
      >
        <span className="material-icons">arrow_back</span>
        <span className="text-xs font-bold">返回控制台</span>
      </button>
    </div>
  );
};

export default BigScreenView;
