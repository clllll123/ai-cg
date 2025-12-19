
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { GamePhase, Stock, Player, MarketNews, GameSettings, NewsFrequency, Sector, Notification, BroadcastEvent, BotLevel, PendingOrder, StockTransaction, TradingSession, MidDayReport, LoanProvider, Danmu, NetworkMessage, NetworkAction, StockTick, NewsType, OrderBookItem } from '../types';
import { generateMarketNews, generateMidDayReport } from '../services/geminiService';
import { generateStocks } from '../services/stockGenerator';

declare var mqtt: any; // Global MQTT definition

interface GameContextType {
  // State
  phase: GamePhase;
  currentDay: number; 
  tradingSession: TradingSession;
  stocks: Stock[];
  marketIndex: number;
  marketIndexHistory: { time: number; value: number }[];
  players: Player[];
  activePlayerId: string | null;
  news: MarketNews[];
  timeLeft: number;
  settings: GameSettings;
  roomCode: string;
  notifications: Notification[];
  broadcastEvent: BroadcastEvent | null;
  marketSentiment: 'bull' | 'bear' | 'neutral'; 
  midDayReport: MidDayReport | null;
  dailyReport: MidDayReport | null; // NEW: End of day report
  danmuList: Danmu[]; 
  
  // Network State
  isHostOnline: boolean;
  isMqttConnected: boolean; 
  lastSyncTime: number; 
  isDataSynced: boolean; 
  
  // Actions
  updateSettings: (newSettings: Partial<GameSettings>) => void;
  regenerateStocks: (allowedSectors?: Sector[]) => void;
  updateStockName: (id: string, name: string) => void; 
  joinGame: (name: string, code: string) => Promise<{ success: boolean; message?: string }>; 
  startGame: () => void;
  stopGame: () => void;
  resetGame: () => void;
  placeOrder: (stockId: string, price: number, amount: number, isBuy: boolean) => void;
  cancelOrder: (orderId: string) => void;
  kickPlayer: (playerId: string) => void;
  dismissNotification: (id: string) => void; 
  placeBet: (prediction: 'BULL' | 'BEAR') => void; 
  borrowMoney: (amount: number, providerName: string, rate: number) => void; 
  repayDebt: (amount: number) => void;
  sendDanmu: (content: string, type: 'text' | 'emoji' | 'rich') => void;
  distributeDividends: (stockId: string, amountPerShare: number) => void; 
  requestDataSync: () => void; 
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Updated Defaults
const DEFAULT_SETTINGS: GameSettings = {
  gameTitle: 'AI 股市操盘手大赛',
  totalDays: 2,
  dayDurationMinutes: 10, 
  openingDuration: 60, 
  morningDuration: 300, 
  breakDuration: 60,   
  afternoonDuration: 300, 
  initialCash: 100000,
  maxPlayers: 100,
  botCount: 40, 
  stockCount: 32, 
  newsFrequency: NewsFrequency.MEDIUM,
  marketRefreshRate: 1500, // Faster refresh for smoother charts
  // CHANGED: Increased marketDepth to 100,000 to significantly reduce V-shape volatility and make charts smoother
  marketDepth: 100000, 
  playerImpactMultiplier: 1.0, 
  loanProviders: [
      { id: 'bank', name: '正规银行', rate: 0.02, leverage: 2, color: 'blue', desc: '低息稳健 (1:2)' },
      { id: 'underground', name: '地下钱庄', rate: 0.15, leverage: 3, color: 'purple', desc: '快速放款 (1:3)' },
      { id: 'brother_wang', name: '社会你王哥', rate: 0.30, leverage: 4, color: 'red', desc: '该博就博 (1:4)' }
  ]
};

const INITIAL_INDEX = 3000;

// NETWORK OPTIMIZATION CONSTANTS
const TRANSACTION_FEE_RATE = 0.0015; 
const MAX_FLUCTUATION = 0.30; 

const DANMU_COST_TEXT = 500;
const DANMU_COST_EMOJI = 100;
const DANMU_COST_RICH = 5000;

const MQTT_BROKER_URL = 'wss://broker.emqx.io:8084/mqtt'; 
const TOPIC_PREFIX = 'stock-game-v1';

const generateRoomCode = () => Math.floor(1000 + Math.random() * 9000).toString();

const BOT_NAMES = {
  NEWBIE: ['散户小王', '韭菜一号', '高位站岗', '满仓踏空', '抄底破产', '佛系持股', '打板客', '追涨杀跌', '小散户', '股市小白', '退休老王', '炒股养家'],
  PRO: ['价值投资者', '基本面大师', '老股民', '技术派', '趋势交易者', '民间股神', '短线精灵', '波段之王', '复利增长', '稳健投资'],
  HOT_MONEY: ['佛山无影脚', '宁波敢死队', '赵老哥', '章盟主', '温州帮', '顶级游资', '拉萨天团', '金田路', '炒新一族', '封板主力'],
  WHALE: ['北向资金', '社保基金', '摩根大通', '中信证券', '高瓴资本', '汇金公司', '养老基金', '挪威主权基金', '贝莱德', '巴菲特门徒']
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isClient = window.location.search.includes('mode=mobile');
  const isHost = !isClient;

  const [phase, setPhase] = useState<GamePhase>(GamePhase.LOBBY);
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [tradingSession, setTradingSession] = useState<TradingSession>(TradingSession.MORNING);
  const [settings, setSettingsState] = useState<GameSettings>(DEFAULT_SETTINGS);
  
  // Client Data State
  const [isDataSynced, setIsDataSynced] = useState(false);

  // Stock Data
  const [stocks, setStocks] = useState<Stock[]>(() => {
      if (isHost) return generateStocks(DEFAULT_SETTINGS.stockCount);
      try {
          const cached = localStorage.getItem('local_stock_cache');
          if (cached) {
              const parsed = JSON.parse(cached);
              return parsed;
          }
      } catch(e) {}
      return []; 
  });
  
  const [marketIndex, setMarketIndex] = useState<number>(INITIAL_INDEX);
  const [marketIndexHistory, setMarketIndexHistory] = useState<{ time: number; value: number }[]>([]);
  const [marketSentiment, setMarketSentiment] = useState<'bull' | 'bear' | 'neutral'>('neutral');
  const [midDayReport, setMidDayReport] = useState<MidDayReport | null>(null);
  const [dailyReport, setDailyReport] = useState<MidDayReport | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(() => {
      if(isClient) return localStorage.getItem('player_id');
      return null;
  });

  const [news, setNews] = useState<MarketNews[]>([]);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.morningDuration);
  
  // Room code persistence
  const [roomCode, setRoomCode] = useState<string>(() => {
      if(isClient) return localStorage.getItem('room_code') || '';
      return generateRoomCode();
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const processedNotificationIdsRef = useRef<Set<string>>(new Set()); 

  const [broadcastEvent, setBroadcastEvent] = useState<BroadcastEvent | null>(null);
  const [danmuList, setDanmuList] = useState<Danmu[]>([]);
  
  // Network Status
  const [isHostOnline, setIsHostOnline] = useState(false);
  const [isMqttConnected, setIsMqttConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(0);

  // MQTT Client Ref
  const mqttClientRef = useRef<any>(null);

  // Track Index at start of Afternoon for betting resolution
  const afternoonStartIndexRef = useRef<number>(INITIAL_INDEX);

  // Refs for loop access
  const stocksRef = useRef(stocks);
  useEffect(() => { stocksRef.current = stocks; }, [stocks]);
  
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const marketIndexRef = useRef(marketIndex);
  marketIndexRef.current = marketIndex;
  const playersRef = useRef(players);
  playersRef.current = players;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const currentDayRef = useRef(currentDay);
  currentDayRef.current = currentDay;
  const tradingSessionRef = useRef(tradingSession);
  useEffect(() => { tradingSessionRef.current = tradingSession; }, [tradingSession]);
  const timeLeftRef = useRef(timeLeft);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  const newsRef = useRef(news);
  useEffect(() => { newsRef.current = news; }, [news]);
  const notificationsRef = useRef(notifications);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);
  const broadcastEventRef = useRef(broadcastEvent);
  useEffect(() => { broadcastEventRef.current = broadcastEvent; }, [broadcastEvent]);
  const midDayReportRef = useRef(midDayReport);
  useEffect(() => { midDayReportRef.current = midDayReport; }, [midDayReport]);
  const dailyReportRef = useRef(dailyReport);
  useEffect(() => { dailyReportRef.current = dailyReport; }, [dailyReport]);
  const currentRoomCodeRef = useRef(roomCode);
  useEffect(() => { currentRoomCodeRef.current = roomCode; }, [roomCode]);

  const marketCycleRef = useRef({ phaseDuration: 0, currentTrend: 0 });
  const isGeneratingNewsRef = useRef(false);

  // --- MQTT LOGIC ---
  useEffect(() => {
      if (mqttClientRef.current) return; 
      if (typeof mqtt === 'undefined') return;

      const clientId = `stock_${isHost ? 'host' : 'client'}_${Date.now().toString(36)}`;
      const client = mqtt.connect(MQTT_BROKER_URL, {
          clientId, keepalive: 60, clean: true, reconnectPeriod: 2000, connectTimeout: 10 * 1000
      });
      mqttClientRef.current = client;

      client.on('connect', () => {
          setIsMqttConnected(true);
          const code = currentRoomCodeRef.current;
          if (isHost) {
              const actionTopic = `${TOPIC_PREFIX}/${code}/action`;
              const joinTopic = `${TOPIC_PREFIX}/${code}/join`;
              client.subscribe([actionTopic, joinTopic]);
              setIsHostOnline(true);
          } else {
              if (code && activePlayerId) {
                  // Re-subscribe if reloading page
                  const syncTopic = `${TOPIC_PREFIX}/${code}/sync`; // Ticks
                  const broadcastTopic = `${TOPIC_PREFIX}/${code}/broadcast`; // Game Start
                  const privateTopic = `${TOPIC_PREFIX}/${code}/p/${activePlayerId}`; // Private Setup
                  const lobbyBroadcastTopic = `${TOPIC_PREFIX}/${code}/broadcast_setup`; // Global Setup Updates
                  client.subscribe([syncTopic, broadcastTopic, privateTopic, lobbyBroadcastTopic]);
              }
          }
      });

      client.on('message', (topic: string, message: any) => {
          try {
              const msg = JSON.parse(message.toString()) as NetworkMessage;
              handleMqttMessage(topic, msg);
          } catch (e) { }
      });

      client.on('offline', () => { setIsMqttConnected(false); setIsHostOnline(false); });
      client.on('reconnect', () => { setIsMqttConnected(false); });
      
      return () => { };
  }, []); 

  // --- 2. HOST SUBSCRIPTIONS ---
  useEffect(() => {
      if (!mqttClientRef.current || !isMqttConnected || !isHost) return; 
      const client = mqttClientRef.current;
      setIsHostOnline(true);
      const actionTopic = `${TOPIC_PREFIX}/${roomCode}/action`;
      const joinTopic = `${TOPIC_PREFIX}/${roomCode}/join`;
      client.unsubscribe(`${TOPIC_PREFIX}/+/action`); 
      client.unsubscribe(`${TOPIC_PREFIX}/+/join`);
      client.subscribe([actionTopic, joinTopic]);
  }, [roomCode, isHost, isMqttConnected]);

  // --- 3. CLIENT SUBSCRIPTION MAINTENANCE ---
  useEffect(() => {
      if (!mqttClientRef.current || !isMqttConnected || isHost) return; 
      if (!roomCode || !activePlayerId) return; 
      const client = mqttClientRef.current;
      const syncTopic = `${TOPIC_PREFIX}/${roomCode}/sync`; 
      const broadcastTopic = `${TOPIC_PREFIX}/${roomCode}/broadcast`;
      const privateTopic = `${TOPIC_PREFIX}/${roomCode}/p/${activePlayerId}`;
      const lobbyBroadcastTopic = `${TOPIC_PREFIX}/${roomCode}/broadcast_setup`; 
      client.subscribe([syncTopic, broadcastTopic, privateTopic, lobbyBroadcastTopic]);
  }, [isMqttConnected, roomCode, activePlayerId, isHost]);

  // --- MQTT MESSAGE HANDLER ---
  const handleMqttMessage = (topic: string, msg: NetworkMessage) => {
      if (isHost) {
          if (msg.type === 'JOIN') {
              handleHostPlayerJoin(msg.payload.prefix, msg.payload.name, msg.payload.id);
          } 
          else if (msg.type === 'ACTION') {
              const action = msg.payload as NetworkAction;
              if (action.actionType === 'PLACE_ORDER') handleHostPlaceOrder(action.playerId, action.data.stockId, action.data.price, action.data.amount, action.data.isBuy);
              else if (action.actionType === 'CANCEL_ORDER') handleHostCancelOrder(action.playerId, action.data.orderId);
              else if (action.actionType === 'PLACE_BET') handleHostPlaceBet(action.playerId, action.data.prediction);
              else if (action.actionType === 'BORROW') handleHostBorrow(action.playerId, action.data.amount, action.data.providerName, action.data.rate);
              else if (action.actionType === 'REPAY') handleHostRepay(action.playerId, action.data.amount);
              else if (action.actionType === 'DANMU') handleHostDanmu(action.playerId, action.data.content, action.data.type);
          }
      } else {
          // --- CLIENT LOGIC ---
          if (msg.type === 'SYNC_SETUP') {
              const data = msg.payload;
              setStocks(data.stocks); 
              localStorage.setItem('local_stock_cache', JSON.stringify(data.stocks));
              setSettingsState(prev => ({ ...prev, ...data.settings }));
              setIsDataSynced(true); 
              setPhase(data.phase); 
              setIsHostOnline(true);
              if (activePlayerId && data.players && data.players.length > 0) {
                  const me = data.players.find((p: Player) => p.id === activePlayerId);
                  if (me) setPlayers([me]);
              } else if (activePlayerId && data.settings && players.length > 0) {
                  const currentMe = players[0];
                  if (currentMe && currentMe.cash === 0 && data.settings.initialCash) {
                      setPlayers([{ ...currentMe, cash: data.settings.initialCash, initialCapital: data.settings.initialCash }]);
                  }
              }
          }
          else if (msg.type === 'GAME_START') {
              setPhase(GamePhase.OPENING);
              setTimeLeft(settingsRef.current.openingDuration);
          }
          else if (msg.type === 'SYNC_TICK') {
              if (!isDataSynced && stocksRef.current.length === 0) return; 
              const data = msg.payload;
              setPhase(data.ph);
              setTradingSession(data.ts);
              setTimeLeft(data.tl);
              setMarketIndex(data.idx);
              // CRITICAL FIX: Sync current day to client
              if (data.cd) setCurrentDay(data.cd);
              
              if (data.ply && data.ply.length > 0) {
                  const myData = data.ply.find((p: Player) => p.id === activePlayerId);
                  if (myData) {
                      setPlayers(prev => {
                          const currentMe = prev.find(p => p.id === activePlayerId);
                          if (!currentMe) return [myData];
                          return [{
                              ...currentMe,
                              ...myData,
                              tradeHistory: myData.tradeHistory || currentMe.tradeHistory || [],
                              totalValueHistory: myData.totalValueHistory || currentMe.totalValueHistory || [],
                              pendingOrders: myData.pendingOrders || currentMe.pendingOrders || [],
                              stats: myData.stats || currentMe.stats || { tradeCount: 0, peakValue: 0, worstValue: 0 }
                          }];
                      }); 
                  }
              }

              if (data.tks && data.tks.length > 0) {
                 setStocks(prevStocks => {
                     const stockMap = new Map<string, Stock>();
                     prevStocks.forEach(s => stockMap.set(s.id, s));
                     data.tks.forEach((tick: StockTick) => {
                         const s = stockMap.get(tick.i);
                         if (s) {
                             const newHistoryPoint = { time: Date.now(), price: tick.p, volume: tick.v };
                             const newHistory = [...s.history, newHistoryPoint].slice(-30);
                             // Update stock with price, vol, AND Order Book if present
                             stockMap.set(tick.i, { 
                                 ...s, 
                                 price: tick.p, 
                                 totalVolume: tick.tv, 
                                 history: newHistory,
                                 buyBook: tick.b,
                                 sellBook: tick.a
                             });
                         }
                     });
                     return Array.from(stockMap.values());
                 });
              }
              if (data.ntf) {
                 const newToDisplay: Notification[] = [];
                 data.ntf.forEach((n: Notification) => {
                     if (!processedNotificationIdsRef.current.has(n.id)) {
                         processedNotificationIdsRef.current.add(n.id);
                         newToDisplay.push(n);
                         setTimeout(() => setNotifications(prev => prev.filter(item => item.id !== n.id)), 4000);
                     }
                 });
                 if (newToDisplay.length > 0) setNotifications(prev => [...prev, ...newToDisplay]);
              }
              setIsHostOnline(true);
              setLastSyncTime(Date.now());
          }
      }
  };

  const broadcastState = () => {
      if (!isHost || !mqttClientRef.current || !mqttClientRef.current.connected) return;
      
      const stockTicks: StockTick[] = stocksRef.current.map(s => {
          const lastHist = s.history[s.history.length - 1];
          // GENERATE REAL-TIME ORDER BOOK SNAPSHOT
          // We generate a deterministic order book based on the current price
          // to ensure all clients see the exact same book.
          const spread = s.price * 0.002; // 0.2% spread
          const volatility = s.volatility;
          
          const asks: OrderBookItem[] = [];
          const bids: OrderBookItem[] = [];
          
          for (let i = 1; i <= 5; i++) {
              // Asks: Sell 1 -> Sell 5 (Higher Prices)
              const askPrice = s.price + (spread * i) + (Math.random() * spread * 0.5);
              const askVol = Math.floor(10 + (1000 * volatility * Math.random()) + (1000/i));
              asks.push({ p: Number(askPrice.toFixed(2)), v: Math.floor(askVol) });

              // Bids: Buy 1 -> Buy 5 (Lower Prices)
              const bidPrice = s.price - (spread * i) - (Math.random() * spread * 0.5);
              const bidVol = Math.floor(10 + (1000 * volatility * Math.random()) + (1000/i));
              bids.push({ p: Number(bidPrice.toFixed(2)), v: Math.floor(bidVol) });
          }
          
          return { 
              i: s.id, 
              p: Number(s.price.toFixed(2)), 
              v: lastHist ? lastHist.volume : 0, 
              tv: s.totalVolume,
              a: asks, // [Sell 1, Sell 2, ... Sell 5]
              b: bids  // [Buy 1, Buy 2, ... Buy 5]
          };
      });
      
      const lightweightPlayers = playersRef.current
          .filter(p => !p.isBot)
          .map(p => ({
              id: p.id,
              cash: p.cash,
              debt: p.debt,
              portfolio: p.portfolio,
              costBasis: p.costBasis,
              pendingOrders: p.pendingOrders.map(o => ({ id: o.id, stockId: o.stockId, type: o.type, price: o.price, amount: o.amount, timestamp: o.timestamp })),
              stats: p.stats 
          }));
      
      const syncData: NetworkMessage = {
          type: 'SYNC_TICK',
          payload: {
              ph: phaseRef.current, ts: tradingSessionRef.current, tl: timeLeftRef.current, idx: Number(marketIndexRef.current.toFixed(2)),
              cd: currentDayRef.current, // CRITICAL FIX: Send current day
              tks: stockTicks, ply: lightweightPlayers, ntf: notificationsRef.current.slice(-2)
          }
      };
      const topic = `${TOPIC_PREFIX}/${currentRoomCodeRef.current}/sync`;
      mqttClientRef.current.publish(topic, JSON.stringify(syncData));
  };

  const broadcastGlobalSetup = () => {
      if (!isHost || !mqttClientRef.current || phaseRef.current !== GamePhase.LOBBY) return;
      const optimizedStocks = stocksRef.current.map(s => ({
          ...s,
          history: s.history.slice(-100), 
          transactions: s.transactions.slice(0, 30) 
      }));
      const setupMsg: NetworkMessage = {
          type: 'SYNC_SETUP',
          payload: { phase: phaseRef.current, settings: settingsRef.current, stocks: optimizedStocks, players: [] }
      };
      const topic = `${TOPIC_PREFIX}/${currentRoomCodeRef.current}/broadcast_setup`;
      mqttClientRef.current.publish(topic, JSON.stringify(setupMsg));
  };
  
  const pushPlayerUpdate = (player: Player) => {
      if (isHost && mqttClientRef.current) {
         const syncData: NetworkMessage = {
            type: 'SYNC_TICK',
            payload: {
                ph: phaseRef.current,
                ts: tradingSessionRef.current,
                tl: timeLeftRef.current,
                idx: Number(marketIndexRef.current.toFixed(2)),
                cd: currentDayRef.current, // Sync Day
                ply: [player],
                ntf: []
            }
        };
        mqttClientRef.current.publish(`${TOPIC_PREFIX}/${currentRoomCodeRef.current}/p/${player.id}`, JSON.stringify(syncData));
      }
  };

  useEffect(() => { if (isClient) return; const interval = setInterval(broadcastState, 1000); return () => clearInterval(interval); }, [isClient]); 

  const handleHostPlayerJoin = (prefix: string, name: string, id: string) => {
      let playerUpdated = false;
      const newPlayers = playersRef.current.map(p => { if (p.name === name && p.prefix === prefix && !p.isBot) { playerUpdated = true; return { ...p, id }; } return p; });
      if (!playerUpdated) {
           const newPlayer: Player = {
              id: id, prefix: '', name, displayName: name, cash: settingsRef.current.initialCash, debt: 0, 
              portfolio: {}, costBasis: {}, pendingOrders: [], tradeHistory: [], initialCapital: settingsRef.current.initialCash, isBot: false, 
              totalValueHistory: [], stats: { tradeCount: 0, peakValue: settingsRef.current.initialCash, worstValue: settingsRef.current.initialCash }, lastBuyTimestamp: 0,
          };
          newPlayers.push(newPlayer);
          addNotification(`${newPlayer.displayName} 加入`, 'info');
      } else { addNotification(`${name} 重连`, 'success'); }
      setPlayers(newPlayers); playersRef.current = newPlayers;
      if (mqttClientRef.current) {
          const optimizedStocks = stocksRef.current.map(s => ({
              ...s,
              history: s.history.slice(-100), 
              transactions: s.transactions.slice(0, 30) 
          }));
          const me = newPlayers.find(p => p.id === id);
          const setupMsg: NetworkMessage = { 
              type: 'SYNC_SETUP', 
              payload: { 
                  phase: phaseRef.current, 
                  settings: settingsRef.current, 
                  stocks: optimizedStocks, 
                  players: me ? [me] : [] 
              } 
          };
          mqttClientRef.current.publish(`${TOPIC_PREFIX}/${currentRoomCodeRef.current}/p/${id}`, JSON.stringify(setupMsg));
      }
  };

  const startGame = () => {
    setPhase(GamePhase.OPENING); setCurrentDay(1); setTimeLeft(settings.openingDuration); 
    setMarketIndex(INITIAL_INDEX); setMarketIndexHistory([]); setMidDayReport(null); setDailyReport(null);
    if (isHost && mqttClientRef.current) {
        broadcastGlobalSetup();
        setTimeout(() => { const startMsg: NetworkMessage = { type: 'GAME_START', payload: {} }; mqttClientRef.current.publish(`${TOPIC_PREFIX}/${roomCode}/broadcast`, JSON.stringify(startMsg)); }, 500);
    }
  };

  const requestDataSync = () => {
      if (isClient && mqttClientRef.current && activePlayerId) {
          const player = players.find(p => p.id === activePlayerId);
          if (player) { const joinMsg: NetworkMessage = { type: 'JOIN', payload: { prefix: '', name: player.name, id: activePlayerId } }; mqttClientRef.current.publish(`${TOPIC_PREFIX}/${roomCode}/join`, JSON.stringify(joinMsg)); }
      }
  };

  const updateSettings = (newSettings: Partial<GameSettings>) => {
      setSettingsState(prev => {
          const updated = { ...prev, ...newSettings };
          if (isHost && phase === GamePhase.LOBBY) {
              settingsRef.current = updated;
              if (newSettings.initialCash !== undefined) {
                  const updatedPlayers = playersRef.current.map(p => { if (!p.isBot) { return { ...p, cash: newSettings.initialCash!, initialCapital: newSettings.initialCash!, stats: { ...p.stats, peakValue: newSettings.initialCash!, worstValue: newSettings.initialCash! } }; } return p; });
                  setPlayers(updatedPlayers); playersRef.current = updatedPlayers;
              }
              setTimeout(broadcastGlobalSetup, 100);
          }
          return updated;
      });
  };

  const regenerateStocks = (allowedSectors?: Sector[]) => { if (phase === GamePhase.LOBBY) { const newStocks = generateStocks(settings.stockCount, allowedSectors); setStocks(newStocks); stocksRef.current = newStocks; if (isHost) setTimeout(broadcastGlobalSetup, 100); } };
  const updateStockName = (id: string, name: string) => { setStocks(prev => { const next = prev.map(s => s.id === id ? { ...s, name } : s); stocksRef.current = next; if (isHost && phase === GamePhase.LOBBY) setTimeout(broadcastGlobalSetup, 500); return next; }); };
  const kickPlayer = (playerId: string) => { setPlayers(prev => prev.filter(p => p.id !== playerId)); if (activePlayerId === playerId) setActivePlayerId(null); };
  const stopGame = () => setPhase(GamePhase.ENDED);
  const resetGame = () => {
    setPhase(GamePhase.LOBBY); setCurrentDay(1); setTradingSession(TradingSession.MORNING);
    const newStocks = generateStocks(settings.stockCount); setStocks(newStocks); stocksRef.current = newStocks; 
    setNews([]); setTimeLeft(settings.morningDuration); setRoomCode(generateRoomCode()); 
    setMarketIndex(INITIAL_INDEX); setMarketIndexHistory([]); setBroadcastEvent(null); setNotifications([]);
    processedNotificationIdsRef.current.clear(); setDanmuList([]); setMarketSentiment('neutral'); setMidDayReport(null); setDailyReport(null);
    setPlayers(prev => prev.filter(p => !p.isBot).map(p => ({ ...p, cash: settings.initialCash, debt: 0, initialCapital: settings.initialCash, portfolio: {}, costBasis: {}, pendingOrders: [], tradeHistory: [], totalValueHistory: [], stats: { tradeCount: 0, peakValue: settings.initialCash, worstValue: settings.initialCash }, lastBuyTimestamp: 0, activeBet: null })));
  };

  // --- HOST ACTIONS ---
  const handleHostPlaceOrder = (playerId: string, stockId: string, price: number, amount: number, isBuy: boolean) => {
      if (phaseRef.current === GamePhase.OPENING || tradingSessionRef.current === TradingSession.BREAK || tradingSessionRef.current === TradingSession.DAY_END) return; 
      const stock = stocksRef.current.find(s => s.id === stockId); 
      if (!stock) return;
      setPlayers(prev => {
          const playerIndex = prev.findIndex(p => p.id === playerId);
          if (playerIndex === -1) return prev;
          const player = prev[playerIndex];
          const rawCost = price * amount; 
          const fee = rawCost * TRANSACTION_FEE_RATE; 
          const totalCost = rawCost + fee;
          if (isBuy && player.cash < totalCost) return prev; 
          if (!isBuy && (player.portfolio[stockId] || 0) < amount) return prev; 
          const canExecute = isBuy ? (stock.price <= price) : (stock.price >= price);
          let updatedPlayer = { ...player };
          if (canExecute) {
              if (isBuy) {
                  const execCost = price * amount * (1 + TRANSACTION_FEE_RATE);
                  updatedPlayer.cash -= execCost;
                  const currentQty = updatedPlayer.portfolio[stockId] || 0;
                  const currentAvgCost = updatedPlayer.costBasis[stockId] || 0;
                  const totalVal = (currentQty * currentAvgCost) + (amount * price);
                  updatedPlayer.costBasis[stockId] = totalVal / (currentQty + amount);
                  updatedPlayer.portfolio[stockId] = currentQty + amount;
                  updatedPlayer.lastBuyTimestamp = Date.now();
              } else {
                  const execGain = price * amount * (1 - TRANSACTION_FEE_RATE);
                  updatedPlayer.cash += execGain;
                  updatedPlayer.portfolio[stockId] = (updatedPlayer.portfolio[stockId] || 0) - amount;
                  if (updatedPlayer.portfolio[stockId] <= 0) { delete updatedPlayer.costBasis[stockId]; }
              }
              const tx: StockTransaction = { id: `tx_ply_${Date.now()}_${Math.random()}`, time: Date.now(), price: price, volume: amount, type: isBuy ? 'buy' : 'sell', playerName: stock.name };
              updatedPlayer.tradeHistory = [tx, ...updatedPlayer.tradeHistory];
              updatedPlayer.stats = { ...updatedPlayer.stats, tradeCount: updatedPlayer.stats.tradeCount + 1 };
          } else {
              const newOrder: PendingOrder = { id: `ord_${Date.now()}_${Math.random()}`, stockId, stockName: stock.name, type: isBuy ? 'buy' : 'sell', price, amount, timestamp: Date.now() };
              if (isBuy) { updatedPlayer.cash -= totalCost; updatedPlayer.lastBuyTimestamp = Date.now(); } 
              else { updatedPlayer.portfolio[stockId] = (updatedPlayer.portfolio[stockId] || 0) - amount; }
              updatedPlayer.pendingOrders = [...updatedPlayer.pendingOrders, newOrder];
          }
          const newPlayers = [...prev];
          newPlayers[playerIndex] = updatedPlayer;
          setTimeout(() => pushPlayerUpdate(updatedPlayer), 0);
          return newPlayers;
      });
  };
  const handleHostCancelOrder = (playerId: string, orderId: string) => { setPlayers(prev => { const playerIndex = prev.findIndex(p => p.id === playerId); if (playerIndex === -1) return prev; const player = prev[playerIndex]; const order = player.pendingOrders.find(o => o.id === orderId); if (!order) return prev; let updatedPlayer = { ...player }; if (order.type === 'buy') { updatedPlayer.cash += (order.price * order.amount * (1 + TRANSACTION_FEE_RATE)); } else { updatedPlayer.portfolio[order.stockId] = (updatedPlayer.portfolio[order.stockId] || 0) + order.amount; } updatedPlayer.pendingOrders = updatedPlayer.pendingOrders.filter(o => o.id !== orderId); const newPlayers = [...prev]; newPlayers[playerIndex] = updatedPlayer; setTimeout(() => pushPlayerUpdate(updatedPlayer), 0); return newPlayers; }); };
  const handleHostPlaceBet = (playerId: string, prediction: 'BULL' | 'BEAR') => { setPlayers(prev => prev.map(p => { if (p.id === playerId) { const betAmt = Math.floor(p.cash * 0.10); if (betAmt < 1000) return p; return { ...p, cash: p.cash - betAmt, activeBet: prediction, betAmount: betAmt }; } return p; })); };
  const handleHostBorrow = (playerId: string, amount: number, providerName: string, rate: number) => { setPlayers(prev => prev.map(p => { if (p.id === playerId) { const debtIncrease = Math.floor(amount * (1 + rate)); return { ...p, cash: p.cash + amount, debt: p.debt + debtIncrease }; } return p; })); };
  const handleHostRepay = (playerId: string, amount: number) => { setPlayers(prev => prev.map(p => { if (p.id === playerId) { if (p.cash < amount) return p; return { ...p, cash: p.cash - amount, debt: Math.max(0, p.debt - amount) }; } return p; })); };
  const handleHostDanmu = (playerId: string, content: string, type: 'text' | 'emoji' | 'rich') => { let cost = type === 'text' ? DANMU_COST_TEXT : (type === 'emoji' ? DANMU_COST_EMOJI : DANMU_COST_RICH); const player = playersRef.current.find(p => p.id === playerId); if (!player || player.cash < cost) return; setPlayers(prev => prev.map(p => { if (p.id === playerId) return { ...p, cash: p.cash - cost }; return p; })); const newDanmu: Danmu = { id: `dm_${Date.now()}_${Math.random()}`, text: content, playerName: player.displayName, type, timestamp: Date.now() }; setDanmuList(prev => [...prev, newDanmu]); setTimeout(() => { setDanmuList(prev => prev.filter(d => d.id !== newDanmu.id)); }, 8000); };

  // --- CLIENT ACTION WRAPPERS ---
  const joinGame = async (name: string, code: string): Promise<{ success: boolean; message?: string }> => {
    if (code !== roomCode && !isClient) return { success: false, message: "Room not found locally" };
    if (isClient) { setRoomCode(code); }
    if (isClient && mqttClientRef.current) {
         const pid = activePlayerId || `ply_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
         setActivePlayerId(pid);
         localStorage.setItem('player_id', pid);
         localStorage.setItem('room_code', code);
         const joinMsg: NetworkMessage = { type: 'JOIN', payload: { prefix: '', name, id: pid } };
         mqttClientRef.current.publish(`${TOPIC_PREFIX}/${code}/join`, JSON.stringify(joinMsg));
         return { success: true };
    }
    return { success: false, message: "网络连接未就绪，请稍后重试" };
  };

  const placeOrder = (stockId: string, price: number, amount: number, isBuy: boolean) => {
      if (!activePlayerId) return;
      if (isHost) { handleHostPlaceOrder(activePlayerId, stockId, price, amount, isBuy); } 
      else if (mqttClientRef.current) {
          const action: NetworkAction = { actionType: 'PLACE_ORDER', playerId: activePlayerId, data: { stockId, price, amount, isBuy } };
          const msg: NetworkMessage = { type: 'ACTION', payload: action };
          mqttClientRef.current.publish(`${TOPIC_PREFIX}/${roomCode}/action`, JSON.stringify(msg));
      }
  };

  const cancelOrder = (orderId: string) => {
      if (!activePlayerId) return;
      if (isHost) { handleHostCancelOrder(activePlayerId, orderId); } 
      else if (mqttClientRef.current) {
          const action: NetworkAction = { actionType: 'CANCEL_ORDER', playerId: activePlayerId, data: { orderId } };
          const msg: NetworkMessage = { type: 'ACTION', payload: action };
          mqttClientRef.current.publish(`${TOPIC_PREFIX}/${roomCode}/action`, JSON.stringify(msg));
      }
  };

  const placeBet = (prediction: 'BULL' | 'BEAR') => {
      if (!activePlayerId) return;
      if (isHost) { handleHostPlaceBet(activePlayerId, prediction); } 
      else if (mqttClientRef.current) {
          const action: NetworkAction = { actionType: 'PLACE_BET', playerId: activePlayerId, data: { prediction } };
          const msg: NetworkMessage = { type: 'ACTION', payload: action };
          mqttClientRef.current.publish(`${TOPIC_PREFIX}/${roomCode}/action`, JSON.stringify(msg));
      }
  };

  const borrowMoney = (amount: number, providerName: string, rate: number) => {
      if (!activePlayerId) return;
      if (isHost) { handleHostBorrow(activePlayerId, amount, providerName, rate); } 
      else if (mqttClientRef.current) {
          const action: NetworkAction = { actionType: 'BORROW', playerId: activePlayerId, data: { amount, providerName, rate } };
          const msg: NetworkMessage = { type: 'ACTION', payload: action };
          mqttClientRef.current.publish(`${TOPIC_PREFIX}/${roomCode}/action`, JSON.stringify(msg));
      }
  };

  const repayDebt = (amount: number) => {
      if (!activePlayerId) return;
      if (isHost) { handleHostRepay(activePlayerId, amount); } 
      else if (mqttClientRef.current) {
          const action: NetworkAction = { actionType: 'REPAY', playerId: activePlayerId, data: { amount } };
          const msg: NetworkMessage = { type: 'ACTION', payload: action };
          mqttClientRef.current.publish(`${TOPIC_PREFIX}/${roomCode}/action`, JSON.stringify(msg));
      }
  };

  const sendDanmu = (content: string, type: 'text' | 'emoji' | 'rich') => {
      if (!activePlayerId) return;
      if (isHost) { handleHostDanmu(activePlayerId, content, type); } 
      else if (mqttClientRef.current) {
          const action: NetworkAction = { actionType: 'DANMU', playerId: activePlayerId, data: { content, type } };
          const msg: NetworkMessage = { type: 'ACTION', payload: action };
          mqttClientRef.current.publish(`${TOPIC_PREFIX}/${roomCode}/action`, JSON.stringify(msg));
      }
  };

  const createBots = (count: number, initialCash: number, currentStocks: Stock[]): Player[] => { const bots: Player[] = []; const retailCount = Math.floor(count * 0.70); const proCount = Math.floor(count * 0.20); const hotMoneyCount = Math.floor(count * 0.05); const whaleCount = Math.max(1, count - retailCount - proCount - hotMoneyCount); const createBot = (id: string, prefix: string, name: string, cash: number, level: BotLevel) => { const portfolio: { [id: string]: number } = {}; const costBasis: { [id: string]: number } = {}; const numberOfStocksHeld = Math.floor(Math.random() * 6) + 2; for (let k = 0; k < numberOfStocksHeld; k++) { const randomStock = currentStocks[Math.floor(Math.random() * currentStocks.length)]; const maxAffordable = Math.floor((cash * 0.5) / randomStock.price); let qty = Math.floor(Math.random() * maxAffordable * 0.5); qty = Math.floor(qty / 100) * 100; if (qty > 0) { const oldQty = portfolio[randomStock.id] || 0; const currentCost = costBasis[randomStock.id] || randomStock.price; const totalVal = (oldQty * currentCost) + (qty * randomStock.price); const newTotal = oldQty + qty; costBasis[randomStock.id] = totalVal / newTotal; portfolio[randomStock.id] = newTotal; } } return { id, prefix, name, displayName: `[${prefix}] ${name}`, cash, debt: 0, portfolio, costBasis, pendingOrders: [], tradeHistory: [], initialCapital: cash, isBot: true, botLevel: level, totalValueHistory: [], stats: { tradeCount: 0, peakValue: cash, worstValue: cash }, lastBuyTimestamp: 0 }; }; for (let i = 0; i < retailCount; i++) bots.push(createBot(`bot_retail_${i}`, '个人', BOT_NAMES.NEWBIE[i % BOT_NAMES.NEWBIE.length] + (i>10?i:''), initialCash, BotLevel.NEWBIE)); for (let i = 0; i < proCount; i++) bots.push(createBot(`bot_pro_${i}`, '大户', BOT_NAMES.PRO[i % BOT_NAMES.PRO.length] + (i>5?i:''), initialCash * 5, BotLevel.PRO)); for (let i = 0; i < hotMoneyCount; i++) bots.push(createBot(`bot_hot_${i}`, '游资', BOT_NAMES.HOT_MONEY[i % BOT_NAMES.HOT_MONEY.length], initialCash * 20, BotLevel.HOT_MONEY)); for (let i = 0; i < whaleCount; i++) bots.push(createBot(`bot_whale_${i}`, '机构', BOT_NAMES.WHALE[i % BOT_NAMES.WHALE.length], initialCash * 50, BotLevel.WHALE)); return bots; };
  useEffect(() => { if (phase === GamePhase.LOBBY && isHost) { setPlayers(prev => { const realPlayers = prev.filter(p => !p.isBot); const bots = createBots(settings.botCount, settings.initialCash, stocksRef.current); return [...realPlayers, ...bots]; }); } }, [settings.botCount, settings.initialCash, phase, isHost]);
  const addNotification = (message: string, type: Notification['type'] = 'info') => { const id = Date.now().toString() + Math.random(); setNotifications(prev => [...prev, { id, message, type }]); setTimeout(() => { setNotifications(prev => prev.filter(n => n.id !== id)); }, 4000); };
  const dismissNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));
  const distributeDividends = (stockId: string, amountPerShare: number) => { const stock = stocksRef.current.find(s => s.id === stockId); if (!stock) return; setPlayers(prev => prev.map(p => { const qty = p.portfolio[stockId] || 0; if (qty > 0) return { ...p, cash: p.cash + qty * amountPerShare }; return p; })); const event: BroadcastEvent = { id: `div_${Date.now()}`, playerId: 'system', playerName: 'SYSTEM', type: 'dividend', stockName: stock.name, amount: amountPerShare, totalValue: 0, timestamp: Date.now() }; setBroadcastEvent(event); setTimeout(() => setBroadcastEvent(null), 8000); addNotification(`上市公司 [${stock.name}] 实施分红`, 'info'); };
  const resolveBets = (afternoonEndIndex: number) => { const startIndex = afternoonStartIndexRef.current; const isBull = afternoonEndIndex >= startIndex; setPlayers(prev => prev.map(p => { if (!p.activeBet || !p.betAmount) return p; const won = (p.activeBet === 'BULL' && isBull) || (p.activeBet === 'BEAR' && !isBull); let newCash = p.cash; if (won) newCash += (p.betAmount * 2); return { ...p, cash: newCash, activeBet: null, betAmount: 0 }; })); };
  
  // Market Loops (Host Only)
  useEffect(() => { if (isClient) return; if (phase !== GamePhase.TRADING && phase !== GamePhase.OPENING) return; const timerInterval = setInterval(() => { setTimeLeft(prev => { if (prev <= 1) { 
      // PHASE: OPENING -> TRADING
      if (phase === GamePhase.OPENING) { setPhase(GamePhase.TRADING); setTradingSession(TradingSession.MORNING); return settings.morningDuration; } 
      
      if (phase === GamePhase.TRADING) { 
          // SESSION: MORNING -> BREAK
          if (tradingSession === TradingSession.MORNING) { 
              setTradingSession(TradingSession.BREAK); 
              generateMidDayReport(stocksRef.current, marketIndexRef.current, INITIAL_INDEX).then(report => setMidDayReport(report)); 
              return settings.breakDuration; 
          } 
          // SESSION: BREAK -> AFTERNOON
          else if (tradingSession === TradingSession.BREAK) { 
              setTradingSession(TradingSession.AFTERNOON); 
              afternoonStartIndexRef.current = marketIndexRef.current; 
              return settings.afternoonDuration; 
          } 
          // SESSION: AFTERNOON -> DAY_END (REPORT)
          else if (tradingSession === TradingSession.AFTERNOON) {
              setTradingSession(TradingSession.DAY_END);
              resolveBets(marketIndexRef.current);
              generateMidDayReport(stocksRef.current, marketIndexRef.current, INITIAL_INDEX).then(report => { setDailyReport({...report, title: `第 ${currentDayRef.current} 交易日收盘总结`}); });
              return settings.breakDuration; 
          }
          // SESSION: DAY_END -> NEXT DAY or ENDED
          else if (tradingSession === TradingSession.DAY_END) {
              if (currentDayRef.current < settings.totalDays) { 
                  setCurrentDay(d => d + 1); 
                  setPhase(GamePhase.OPENING); // CORRECT LOGIC: Go to Opening of Next Day first
                  // Reset stocks for new day
                  setStocks(currentStocks => currentStocks.map(s => { 
                      const gapPercent = (Math.random() - 0.5) * 0.08; 
                      const newPrice = s.price * (1 + gapPercent); 
                      return { 
                          ...s, 
                          price: newPrice, 
                          openPrice: newPrice, 
                          totalVolume: 0, // Reset daily volume
                          momentum: 0,    // Reset momentum
                          history: [...s.history, { time: Date.now(), price: newPrice, volume: 0 }]
                      }; 
                  })); 
                  addNotification(`第 ${currentDayRef.current + 1} 个交易日集合竞价开始`, 'info'); 
                  return settings.openingDuration; // Use opening duration
              } else { 
                  setPhase(GamePhase.ENDED); 
                  return 0; 
              }
          }
      } 
      return 0; 
  } return prev - 1; }); }, 1000); return () => clearInterval(timerInterval); }, [phase, tradingSession, settings, isClient]); 
  
  // MARKET SIMULATION (PHYSICS ENGINE)
  useEffect(() => {
    if (isClient) return;
    if (phase !== GamePhase.TRADING) return;
    if (tradingSession === TradingSession.BREAK || tradingSession === TradingSession.DAY_END) return;

    const marketInterval = setInterval(async () => {
        // 1. Global Market Cycle (Bear/Bull trend)
        if (marketCycleRef.current.phaseDuration <= 0) {
            const isBear = Math.random() > 0.6;
            marketCycleRef.current.currentTrend = isBear ? -0.05 : 0.05;
            marketCycleRef.current.phaseDuration = Math.floor(Math.random() * 30) + 20;
            setMarketSentiment(isBear ? 'bear' : 'bull');
        } else {
            marketCycleRef.current.phaseDuration--;
        }

        const globalTrend = marketCycleRef.current.currentTrend;
        const executedOrderIds = new Set<string>();
        
        // 2. Process each stock
        const updatedStocks = stocksRef.current.map(stock => {
            const limitUp = stock.openPrice * (1 + MAX_FLUCTUATION);
            const limitDown = stock.openPrice * (1 - MAX_FLUCTUATION);
            const transactions: StockTransaction[] = [];
            
            // --- A. Base Noise Volume (Background HFT) ---
            // Ensure there is ALWAYS volume, even without big trades
            const baseVolume = Math.floor(Math.random() * 50 + 10); 
            let impactNetBuyVolume = 0;
            let realTickVolume = baseVolume;

            // --- B. Bot Trading (Probability based) ---
            const activityChance = 0.35 + (stock.volatility * 5.0);
            if (Math.random() < activityChance) {
                let tradeChance = 0.1 + (stock.volatility * 2.0) + Math.abs(stock.trend);
                if (tradeChance > 0.8) tradeChance = 0.8;
                
                if (Math.random() <= tradeChance) {
                    const numTrades = Math.floor(Math.random() * 3) + 1;
                    for (let i = 0; i < numTrades; i++) {
                        const rand = Math.random();
                        let traderType: 'NEWBIE' | 'PRO' | 'HOT_MONEY' | 'WHALE' = 'NEWBIE';
                        // Weighted probability for trader types
                        if (rand > 0.95) traderType = 'WHALE';
                        else if (rand > 0.90) traderType = 'HOT_MONEY';
                        else if (rand > 0.70) traderType = 'PRO';

                        const trendBias = stock.trend + (globalTrend * stock.beta);
                        const jitter = (Math.random() - 0.5) * 0.05;
                        let score = 0.5 + (trendBias > 0 ? 0.2 : -0.2) + jitter;
                        const priceRatio = stock.price / stock.openPrice;
                        if (traderType === 'NEWBIE' && priceRatio > 1.05) score += 0.3; // FOMO

                        const isBuy = Math.random() < Math.max(0.1, Math.min(0.9, score));
                        if (stock.price >= limitUp && isBuy) continue;
                        if (stock.price <= limitDown && !isBuy) continue;

                        // Volume logic (REDUCED TO PREVENT SPIKES)
                        let baseVol = 100;
                        if (traderType === 'WHALE') baseVol = 2000; // Reduced from 5000
                        else if (traderType === 'HOT_MONEY') baseVol = 1000; // Reduced from 2000
                        else if (traderType === 'PRO') baseVol = 400;

                        let rawVol = baseVol * (0.5 + Math.random() * 4.5);
                        const volume = Math.max(100, Math.floor(rawVol / 100) * 100);

                        transactions.push({
                            id: `tx_bot_${stock.id}_${Date.now()}_${i}`,
                            time: Date.now(),
                            price: stock.price,
                            volume,
                            type: isBuy ? 'buy' : 'sell',
                            playerName: BOT_NAMES[traderType][Math.floor(Math.random() * BOT_NAMES[traderType].length)]
                        });

                        realTickVolume += volume;
                        if (isBuy) impactNetBuyVolume += (volume * stock.price);
                        else impactNetBuyVolume -= (volume * stock.price);
                    }
                }
            }

            // --- C. Player Order Matching ---
            playersRef.current.forEach(p => {
                if (p.isBot) return;
                p.pendingOrders.forEach(order => {
                    if (order.stockId === stock.id && !executedOrderIds.has(order.id)) {
                        const canExecute = order.type === 'buy' ? (stock.price <= order.price) : (stock.price >= order.price);
                        if (canExecute) {
                            executedOrderIds.add(order.id);
                            const tx: StockTransaction = { id: `tx_ply_${order.id}`, time: Date.now(), price: order.price, volume: order.amount, type: order.type, playerName: p.displayName };
                            transactions.push(tx);
                            
                            const weight = settingsRef.current.playerImpactMultiplier || 1;
                            const tradeVal = order.amount * order.price * weight;
                            realTickVolume += order.amount;
                            if (order.type === 'buy') impactNetBuyVolume += tradeVal;
                            else impactNetBuyVolume -= tradeVal;
                        }
                    }
                });
            });

            // --- D. Physics-based Price Calculation ---
            // 1. Momentum Decay (Inertia)
            const momentumDamping = 0.90; // Retain 90% of previous velocity
            let currentMomentum = (stock.momentum || 0) * momentumDamping;

            // 2. Market Impact from Net Volume
            const marketDepth = stock.price * settingsRef.current.marketDepth; 
            let volumeImpact = impactNetBuyVolume / marketDepth; 
            
            // --- NEW: CLAMP VOLUME IMPACT (SOFT CAP) ---
            // Prevents massive V-shapes. Max 3% swing per tick from volume alone.
            volumeImpact = Math.max(-0.03, Math.min(0.03, volumeImpact));
            
            // 3. Natural Drift / Micro-Structure Noise
            // Even with 0 volume, price drifts slightly due to spread/MM algo
            const drift = (Math.random() - 0.5) * stock.volatility * 0.05; 

            // 4. Update Momentum
            // New momentum = Old Momentum + New Force (Volume)
            currentMomentum += (volumeImpact * 0.5); 

            // 5. Apply Momentum to Price
            // Price Change = Momentum + Drift + Macro Trend
            let totalChangePercent = currentMomentum + drift + (globalTrend * stock.beta * 0.005);
            
            // Cap max change per tick to prevent teleporting
            if (totalChangePercent > 0.03) totalChangePercent = 0.03;
            if (totalChangePercent < -0.03) totalChangePercent = -0.03;

            let newPrice = stock.price * (1 + totalChangePercent);
            
            // Ensure price never stays *exactly* identical to float precision to help charts
            if (Math.abs(newPrice - stock.price) < 0.001) {
                newPrice += (Math.random() > 0.5 ? 0.01 : -0.01);
            }

            // Limit Check
            newPrice = Math.max(0.01, newPrice);
            if (newPrice >= limitUp) { newPrice = limitUp; currentMomentum = 0; } // Hit wall, stop
            else if (newPrice <= limitDown) { newPrice = limitDown; currentMomentum = 0; }
            
            const newTotalVolume = (stock.totalVolume || 0) + realTickVolume;
            
            return {
                ...stock,
                price: newPrice,
                lastPrice: stock.price,
                trend: stock.trend * 0.99 + (totalChangePercent * 0.1), // Trend slowly follows price action
                momentum: currentMomentum, // Store for next tick
                totalVolume: newTotalVolume,
                history: [...stock.history, { time: Date.now(), price: newPrice, volume: realTickVolume }].slice(-500),
                transactions: [...transactions, ...stock.transactions].slice(0, 50)
            };
        });

        setStocks(updatedStocks);
        const initialMarketCap = stocksRef.current.reduce((acc, s) => acc + s.openPrice, 0);
        const currentMarketCap = updatedStocks.reduce((acc, s) => acc + s.price, 0);
        const newIndex = INITIAL_INDEX * (currentMarketCap / initialMarketCap);
        setMarketIndex(newIndex);
        setMarketIndexHistory(prev => [...prev, { time: Date.now(), value: newIndex }]);

        setPlayers(prevPlayers => prevPlayers.map(p => {
            let newCash = p.cash;
            let newPortfolio = { ...p.portfolio };
            let newCostBasis = { ...(p.costBasis || {}) };
            let newTradeHistory = [...p.tradeHistory];
            let hasExecuted = false;

            const remainingOrders = p.pendingOrders.filter(o => {
                if (executedOrderIds.has(o.id)) {
                    hasExecuted = true;
                    newTradeHistory.unshift({ id: `tx_ply_${o.id}`, time: Date.now(), price: o.price, volume: o.amount, type: o.type, playerName: o.stockName });
                    if (o.type === 'buy') {
                        const currentQty = newPortfolio[o.stockId] || 0;
                        const currentAvgCost = newCostBasis[o.stockId] || 0;
                        const totalVal = (currentQty * currentAvgCost) + (o.amount * o.price);
                        newCostBasis[o.stockId] = totalVal / (currentQty + o.amount);
                        newPortfolio[o.stockId] = currentQty + o.amount;
                    } else {
                        newCash += (o.price * o.amount * (1 - TRANSACTION_FEE_RATE));
                        if ((newPortfolio[o.stockId] || 0) <= 0) delete newCostBasis[o.stockId];
                    }
                    return false;
                }
                return true;
            });

            let value = newCash;
            let frozenCash = 0;
            remainingOrders.forEach(o => { if (o.type === 'buy') frozenCash += (o.price * o.amount * (1 + TRANSACTION_FEE_RATE)); });
            for (const [stockId, qty] of Object.entries(newPortfolio)) { const s = updatedStocks.find(st => st.id === stockId); if (s) value += s.price * (qty as number); }
            value += frozenCash;
            value -= p.debt;
            return {
                ...p,
                cash: newCash,
                portfolio: newPortfolio,
                costBasis: newCostBasis,
                pendingOrders: remainingOrders,
                tradeHistory: newTradeHistory,
                totalValueHistory: [...p.totalValueHistory, { time: Date.now(), value }],
                stats: { ...p.stats, tradeCount: p.stats.tradeCount + (hasExecuted ? 1 : 0), peakValue: Math.max(p.stats.peakValue, value), worstValue: Math.min(p.stats.worstValue, value) }
            };
        }));
    }, settings.marketRefreshRate);
    return () => clearInterval(marketInterval);
  }, [phase, tradingSession, settings.marketRefreshRate, isClient]);

  // News Generation Loop
  useEffect(() => { 
    if (isClient) return; 
    if (phase !== GamePhase.TRADING || (tradingSession === TradingSession.BREAK || tradingSession === TradingSession.DAY_END)) return; 
    
    const newsTimer = setInterval(async () => { 
        if (isGeneratingNewsRef.current) return; 
        const freqMap = { [NewsFrequency.LOW]: 0.05, [NewsFrequency.MEDIUM]: 0.20, [NewsFrequency.HIGH]: 0.50, [NewsFrequency.CRAZY]: 0.90 }; 
        if (Math.random() < freqMap[settingsRef.current.newsFrequency]) { 
            isGeneratingNewsRef.current = true; 
            try { 
                const newsItemsData = await generateMarketNews(phase, stocksRef.current); 
                if (newsItemsData && newsItemsData.length > 0) { 
                    const newNewsList: MarketNews[] = newsItemsData.map(item => ({ id: Date.now().toString() + Math.random(), timestamp: Date.now(), type: item.type || NewsType.NEWS, title: item.title || "News", content: item.content || "", impact: (item.impact as any) || 'neutral', severity: item.severity || 0.5, affectedSectors: (item.affectedSectors as any) || [], source: item.source })); 
                    setNews(prev => [...newNewsList, ...prev]); 
                } 
            } catch(e) { 
                console.error(e); 
            } finally { 
                isGeneratingNewsRef.current = false; 
            } 
        } 
    }, 5000); 
    return () => clearInterval(newsTimer); 
  }, [phase, tradingSession, settings.newsFrequency, isClient]);

  return (
    <GameContext.Provider value={{ phase, currentDay, tradingSession, stocks, marketIndex, marketIndexHistory, players, activePlayerId, news, timeLeft, settings, roomCode, notifications, broadcastEvent, marketSentiment, midDayReport, dailyReport, danmuList, isHostOnline, isMqttConnected, lastSyncTime, isDataSynced, updateSettings, regenerateStocks, updateStockName, joinGame, startGame, stopGame, resetGame, placeOrder, cancelOrder, kickPlayer, dismissNotification, placeBet, borrowMoney, repayDebt, sendDanmu, distributeDividends, requestDataSync }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => { const context = useContext(GameContext); if (!context) throw new Error("useGame must be used within GameProvider"); return context; };
