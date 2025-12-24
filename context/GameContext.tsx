
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { GamePhase, Stock, Player, MarketNews, GameSettings, NewsFrequency, Sector, Notification, BroadcastEvent, BotLevel, PendingOrder, StockTransaction, TradingSession, MidDayReport, LoanProvider, Danmu, NetworkMessage, NetworkAction, StockTick, NewsType, OrderBookItem, OrderType } from '../types';
import { StartupCompany, BusinessDecision, DecisionResult, Milestone, CompanyAchievement, GrowthProgress, InvestmentRequest, InvestmentCompetition, InvestmentCooperation, InvestmentAlliance, InvestmentEvent, InvestmentLeaderboard, PlayerInvestmentProfile, InvestmentMarketplace, CompetitionType, CooperationType } from '../types/startup';
import { generateMarketNews, generateMidDayReport } from '../services/geminiService';
import { generateStocks } from '../services/stockGenerator';
import { EnhancedPriceCalculationService } from '../services/enhancedPriceCalculationService';
import { MacroEventService } from '../services/macroEventService';
import { CompanyOperationService } from '../services/companyOperationService';
import { StartupGenerator } from '../services/startupGenerator';
import { InvestmentService } from '../services/investmentService';

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
  dailyReport: MidDayReport | null;
  danmuList: Danmu[];
  startupCompanies: StartupCompany[];
  selectedCompany: StartupCompany | null;
  availableDecisions: BusinessDecision[];
  decisionResults: DecisionResult[];
  companyGrowthProgress: GrowthProgress | null;
  newlyAchievedMilestones: Milestone[];
  newlyUnlockedAchievements: CompanyAchievement[];
  
  // Investment Competition & Cooperation State
  investmentMarketplace: InvestmentMarketplace;
  selectedPlayerProfile: PlayerInvestmentProfile | null;
  investmentEvents: InvestmentEvent[];
  
  // Network State
  isHostOnline: boolean;
  isMqttConnected: boolean; 
  lastSyncTime: number; 
  isDataSynced: boolean;
  mqttConnectionError: string | null; 
  
  // Actions
  updateSettings: (newSettings: Partial<GameSettings>) => void;
  regenerateStocks: (allowedSectors?: Sector[]) => void;
  updateStockName: (id: string, name: string) => void; 
  joinGame: (name: string, code: string) => Promise<{ success: boolean; message?: string }>; 
  startGame: () => void;
  stopGame: () => void;
  resetGame: () => void;
  placeOrder: (stockId: string, price: number, amount: number, isBuy: boolean, orderType?: OrderType, stopPrice?: number, trailingPercent?: number, icebergSize?: number) => void;
  cancelOrder: (orderId: string) => void;
  kickPlayer: (playerId: string) => void;
  dismissNotification: (id: string) => void; 
  placeBet: (prediction: 'BULL' | 'BEAR') => void; 
  borrowMoney: (amount: number, providerName: string, rate: number) => void; 
  repayDebt: (amount: number) => void;
  sendDanmu: (content: string, type: 'text' | 'emoji' | 'rich') => void;
  distributeDividends: (stockId: string, amountPerShare: number) => void; 
  requestDataSync: () => void;
  selectCompany: (company: StartupCompany | null) => void;
  executeCompanyDecision: (decisionId: string) => void;
  generateStartupCompanies: () => void;
  updateCompanyDailyProgress: (companyId: string) => void;
  checkCompanyMilestones: (companyId: string) => void;
  calculateCompanyGrowthProgress: (companyId: string) => void;
  clearNewAchievements: () => void;
  
  // Investment Competition & Cooperation Actions
  createInvestmentRequest: (companyId: string, investmentAmount: number, equityRequested: number) => InvestmentRequest;
  approveInvestmentRequest: (requestId: string) => { success: boolean; message: string };
  createInvestmentCompetition: (companyId: string, type: CompetitionType, targetAmount: number, duration: number) => InvestmentCompetition;
  joinCompetition: (competitionId: string, investmentAmount: number) => { success: boolean; message: string; competition?: InvestmentCompetition };
  resolveCompetition: (competitionId: string) => { winner?: { playerId: string; playerName: string; investmentAmount: number; equityShare: number }; message: string };
  createInvestmentCooperation: (name: string, companyId: string, type: CooperationType, targetAmount: number, minParticipants: number, maxParticipants: number, duration: number) => InvestmentCooperation;
  joinCooperation: (cooperationId: string, investmentAmount: number, contribution: string) => { success: boolean; message: string; cooperation?: InvestmentCooperation };
  finalizeCooperation: (cooperationId: string) => { success: boolean; message: string; participants?: Array<{ playerId: string; playerName: string; investmentAmount: number; equityShare: number }> };
  createAlliance: (name: string, targetCompanies: string[], allianceGoals: string[]) => InvestmentAlliance;
  joinAlliance: (allianceId: string) => { success: boolean; message: string; alliance?: InvestmentAlliance };
  contributeToAlliance: (allianceId: string, contributionType: 'capital' | 'influence' | 'knowledge' | 'network', amount: number) => { success: boolean; message: string; alliance?: InvestmentAlliance };
  getPlayerInvestmentProfile: (playerId: string) => PlayerInvestmentProfile;
  selectPlayerProfile: (profile: PlayerInvestmentProfile | null) => void;
  updateInvestmentLeaderboard: () => void;
  refreshInvestmentMarketplace: () => void;
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
  transactionFeeRate: 0.0015, // 交易手续费率 0.15%
  stampTaxRate: 0.001, // 印花税率 0.1%（卖出时收取）
  maxDailyFluctuation: 0.30, // 单日最大涨跌幅 30%
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
  
  const [startupCompanies, setStartupCompanies] = useState<StartupCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<StartupCompany | null>(null);
  const [availableDecisions, setAvailableDecisions] = useState<BusinessDecision[]>([]);
  const [decisionResults, setDecisionResults] = useState<DecisionResult[]>([]);
  const [companyGrowthProgress, setCompanyGrowthProgress] = useState<GrowthProgress | null>(null);
  const [newlyAchievedMilestones, setNewlyAchievedMilestones] = useState<Milestone[]>([]);
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<CompanyAchievement[]>([]);
  
  // Investment Competition & Cooperation State
  const [investmentMarketplace, setInvestmentMarketplace] = useState<InvestmentMarketplace>({
    availableOpportunities: [],
    activeCompetitions: [],
    activeCooperations: [],
    activeAlliances: [],
    leaderboard: {
      period: 'all_time',
      rankings: [],
      lastUpdated: Date.now()
    },
    marketTrends: []
  });
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<PlayerInvestmentProfile | null>(null);
  const [investmentEvents, setInvestmentEvents] = useState<InvestmentEvent[]>([]);
  
  // Network Status
  const [isHostOnline, setIsHostOnline] = useState(false);
  const [isMqttConnected, setIsMqttConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [mqttConnectionError, setMqttConnectionError] = useState<string | null>(null);
  const [mqttRetryCount, setMqttRetryCount] = useState(0);

  // MQTT Client Ref
  const mqttClientRef = useRef<any>(null);
  const mqttRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const enhancedPriceCalculationServiceRef = useRef<EnhancedPriceCalculationService | null>(null);
  const macroEventServiceRef = useRef<MacroEventService | null>(null);
  const companyOperationServiceRef = useRef<CompanyOperationService | null>(null);
  const startupGeneratorRef = useRef<StartupGenerator | null>(null);
  const investmentServiceRef = useRef<InvestmentService | null>(null);
  useEffect(() => {
    if (isHost) {
      enhancedPriceCalculationServiceRef.current = new EnhancedPriceCalculationService();
      macroEventServiceRef.current = new MacroEventService();
      companyOperationServiceRef.current = new CompanyOperationService();
      startupGeneratorRef.current = new StartupGenerator();
      investmentServiceRef.current = new InvestmentService();
    }
  }, [isHost]);

  // --- MQTT LOGIC ---
  const MAX_RETRY_ATTEMPTS = 5;
  const RETRY_DELAY_BASE = 2000;
  const RETRY_DELAY_MULTIPLIER = 2;

  const attemptMqttReconnect = useCallback(() => {
    if (mqttRetryCount >= MAX_RETRY_ATTEMPTS) {
      setMqttConnectionError('连接失败，请检查网络后刷新页面重试');
      return;
    }

    const delay = RETRY_DELAY_BASE * Math.pow(RETRY_DELAY_MULTIPLIER, mqttRetryCount);
    setMqttConnectionError(`连接断开，正在尝试重连... (${mqttRetryCount + 1}/${MAX_RETRY_ATTEMPTS})`);

    mqttRetryTimeoutRef.current = setTimeout(() => {
      setMqttRetryCount(prev => prev + 1);
      if (mqttClientRef.current && !mqttClientRef.current.connected) {
        mqttClientRef.current.reconnect();
      }
    }, delay);
  }, [mqttRetryCount]);

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
          setMqttConnectionError(null);
          setMqttRetryCount(0);
          if (mqttRetryTimeoutRef.current) {
            clearTimeout(mqttRetryTimeoutRef.current);
            mqttRetryTimeoutRef.current = null;
          }
          const code = currentRoomCodeRef.current;
          if (isHost) {
              const actionTopic = `${TOPIC_PREFIX}/${code}/action`;
              const joinTopic = `${TOPIC_PREFIX}/${code}/join`;
              client.subscribe([actionTopic, joinTopic]);
              setIsHostOnline(true);
          } else {
              if (code && activePlayerId) {
                  const syncTopic = `${TOPIC_PREFIX}/${code}/sync`;
                  const broadcastTopic = `${TOPIC_PREFIX}/${code}/broadcast`;
                  const privateTopic = `${TOPIC_PREFIX}/${code}/p/${activePlayerId}`;
                  const lobbyBroadcastTopic = `${TOPIC_PREFIX}/${code}/broadcast_setup`;
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

      client.on('offline', () => { 
          setIsMqttConnected(false); 
          setIsHostOnline(false);
          attemptMqttReconnect();
      });
      
      client.on('error', (err: any) => {
          console.error('MQTT Error:', err);
          setMqttConnectionError(`连接错误: ${err.message || '未知错误'}`);
          setIsMqttConnected(false);
          setIsHostOnline(false);
      });

      client.on('reconnect', () => { 
          setIsMqttConnected(false); 
          setMqttConnectionError('正在重新连接...');
      });
      
      return () => { 
          if (mqttRetryTimeoutRef.current) {
            clearTimeout(mqttRetryTimeoutRef.current);
          }
      };
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
              if (action.actionType === 'PLACE_ORDER') handleHostPlaceOrder(action.playerId, action.data.stockId, action.data.price, action.data.amount, action.data.isBuy, action.data.orderType, action.data.stopPrice, action.data.trailingPercent, action.data.icebergSize);
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
                     const updatedStockIds: string[] = [];
                     data.tks.forEach((tick: StockTick) => {
                         const s = stockMap.get(tick.i);
                         if (s) {
                             const newHistoryPoint = { time: Date.now(), price: tick.p, volume: tick.v };
                             const newHistory = [...s.history, newHistoryPoint].slice(-30);
                             stockMap.set(tick.i, { 
                                 ...s, 
                                 price: tick.p, 
                                 totalVolume: tick.tv, 
                                 history: newHistory,
                                 buyBook: tick.b,
                                 sellBook: tick.a
                             });
                             updatedStockIds.push(tick.i);
                         }
                     });
                     if (isHost && updatedStockIds.length > 0) {
                         setTimeout(() => {
                             updatedStockIds.forEach(stockId => {
                                 const stock = stocksRef.current.find(s => s.id === stockId);
                                 if (stock) {
                                     checkPendingOrders(stockId, stock.price);
                                 }
                             });
                         }, 0);
                     }
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
    
    if (isHost) {
        generateStartupCompanies();
        refreshInvestmentMarketplace();
    }
    
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
  const handleHostPlaceOrder = (playerId: string, stockId: string, price: number, amount: number, isBuy: boolean, orderType?: OrderType, stopPrice?: number, trailingPercent?: number, icebergSize?: number) => {
      if (phaseRef.current === GamePhase.OPENING || tradingSessionRef.current === TradingSession.BREAK || tradingSessionRef.current === TradingSession.DAY_END) return; 
      const stock = stocksRef.current.find(s => s.id === stockId); 
      if (!stock) return;

      const validateOrder = (p: Player, shouldCheckCash: boolean, shouldCheckPortfolio: boolean) => {
          const rawCost = price * amount; 
          const fee = rawCost * TRANSACTION_FEE_RATE; 
          const totalCost = rawCost + fee;
          if (shouldCheckCash && p.cash < totalCost) return { valid: false, reason: 'insufficient_cash' };
          if (shouldCheckPortfolio && (p.portfolio[stockId] || 0) < amount) return { valid: false, reason: 'insufficient_shares' };
          return { valid: true, totalCost };
      };

      const executeTrade = (p: Player, execPrice: number, execAmount: number, execIsBuy: boolean) => {
          let updatedPlayer = { ...p };
          if (execIsBuy) {
              const execCost = execPrice * execAmount * (1 + TRANSACTION_FEE_RATE);
              updatedPlayer.cash -= execCost;
              const currentQty = updatedPlayer.portfolio[stockId] || 0;
              const currentAvgCost = updatedPlayer.costBasis[stockId] || 0;
              const totalVal = (currentQty * currentAvgCost) + (execAmount * execPrice);
              updatedPlayer.costBasis[stockId] = totalVal / (currentQty + execAmount);
              updatedPlayer.portfolio[stockId] = currentQty + execAmount;
              updatedPlayer.lastBuyTimestamp = Date.now();
          } else {
              const execGain = execPrice * execAmount * (1 - TRANSACTION_FEE_RATE);
              updatedPlayer.cash += execGain;
              updatedPlayer.portfolio[stockId] = (updatedPlayer.portfolio[stockId] || 0) - execAmount;
              if (updatedPlayer.portfolio[stockId] <= 0) { delete updatedPlayer.costBasis[stockId]; }
          }
          const tx: StockTransaction = { id: `tx_ply_${Date.now()}_${Math.random()}`, time: Date.now(), price: execPrice, volume: execAmount, type: execIsBuy ? 'buy' : 'sell', playerName: stock.name };
          updatedPlayer.tradeHistory = [tx, ...updatedPlayer.tradeHistory];
          updatedPlayer.stats = { ...updatedPlayer.stats, tradeCount: updatedPlayer.stats.tradeCount + 1 };
          return updatedPlayer;
      };

      const shouldCheckCash = isBuy && orderType !== OrderType.MARKET;
      const shouldCheckPortfolio = !isBuy && orderType !== OrderType.MARKET;

      setPlayers(prev => {
          const playerIndex = prev.findIndex(p => p.id === playerId);
          if (playerIndex === -1) return prev;
          const player = prev[playerIndex];

          if (orderType === OrderType.MARKET) {
              const currentMarketPrice = stock.price;
              const validation = validateOrder(player, true, true);
              if (!validation.valid) return prev;
              const updatedPlayer = executeTrade(player, currentMarketPrice, amount, isBuy);
              const newPlayers = [...prev];
              newPlayers[playerIndex] = updatedPlayer;
              setTimeout(() => pushPlayerUpdate(updatedPlayer), 0);
              return newPlayers;
          }

          const validation = validateOrder(player, shouldCheckCash, shouldCheckPortfolio);
          if (!validation.valid) return prev;
          const { totalCost } = validation;

          let canExecute = false;
          let executionPrice = price;

          switch (orderType) {
              case OrderType.LIMIT:
                  canExecute = isBuy ? (stock.price <= price) : (stock.price >= price);
                  executionPrice = price;
                  break;
              case OrderType.STOP_LOSS:
                  if (!isBuy && stopPrice !== undefined) {
                      canExecute = stock.price <= stopPrice;
                      executionPrice = Math.min(stock.price, stopPrice);
                  }
                  break;
              case OrderType.STOP_PROFIT:
                  if (!isBuy && stopPrice !== undefined) {
                      canExecute = stock.price >= stopPrice;
                      executionPrice = Math.max(stock.price, stopPrice);
                  }
                  break;
              case OrderType.TRAILING_STOP:
                  if (!isBuy && trailingPercent !== undefined && stopPrice !== undefined) {
                      const triggerPrice = stopPrice * (1 - trailingPercent / 100);
                      canExecute = stock.price <= triggerPrice;
                      executionPrice = Math.min(stock.price, triggerPrice);
                  }
                  break;
              default:
                  canExecute = isBuy ? (stock.price <= price) : (stock.price >= price);
                  executionPrice = price;
          }

          let updatedPlayer = { ...player };
          if (canExecute) {
              if (icebergSize && icebergSize > 0 && icebergSize < amount) {
                  const firstChunk = icebergSize;
                  const remaining = amount - firstChunk;
                  updatedPlayer = executeTrade(updatedPlayer, executionPrice, firstChunk, isBuy);
                  if (remaining > 0) {
                      const newOrder: PendingOrder = {
                          id: `ord_${Date.now()}_${Math.random()}`,
                          stockId,
                          stockName: stock.name,
                          type: isBuy ? 'buy' : 'sell',
                          price,
                          amount: remaining,
                          timestamp: Date.now(),
                          orderType,
                          stopPrice,
                          trailingPercent,
                          originalAmount: amount
                      };
                      updatedPlayer.pendingOrders = [...updatedPlayer.pendingOrders, newOrder];
                  }
              } else {
                  updatedPlayer = executeTrade(updatedPlayer, executionPrice, amount, isBuy);
              }
          } else {
              const newOrder: PendingOrder = {
                  id: `ord_${Date.now()}_${Math.random()}`,
                  stockId,
                  stockName: stock.name,
                  type: isBuy ? 'buy' : 'sell',
                  price,
                  amount,
                  timestamp: Date.now(),
                  orderType,
                  stopPrice,
                  trailingPercent,
                  icebergSize
              };
              if (isBuy) { updatedPlayer.cash -= totalCost; updatedPlayer.lastBuyTimestamp = Date.now(); } 
              else { updatedPlayer.portfolio[stockId] = (updatedPlayer.portfolio[stockId] || 0) - amount; }
              updatedPlayer.pendingOrders = [...updatedPlayer.pendingOrders, newOrder];
              
              setTimeout(() => {
                  const orderTypeName = orderType || OrderType.LIMIT;
                  const notification: Notification = {
                      id: `ord_created_${Date.now()}`,
                      message: `挂单已提交: ${stock.name} ${amount}股 @¥${price.toFixed(2)} (${orderTypeName})`,
                      type: 'info'
                  };
                  setNotifications(prev => [...prev, notification]);
                  setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== notification.id)), 4000);
              }, 100);
          }
          const newPlayers = [...prev];
          newPlayers[playerIndex] = updatedPlayer;
          setTimeout(() => pushPlayerUpdate(updatedPlayer), 0);
          return newPlayers;
      });
  };

  const checkPendingOrders = (stockId: string, currentPrice: number) => {
      setPlayers(prev => {
          let hasUpdates = false;
          const updatedPlayers = prev.map(player => {
              const executableOrders: PendingOrder[] = [];
              const remainingOrders: PendingOrder[] = [];

              player.pendingOrders.forEach(order => {
                  if (order.stockId !== stockId) {
                      remainingOrders.push(order);
                      return;
                  }

                  let shouldExecute = false;
                  let execPrice = order.price;

                  switch (order.orderType) {
                      case OrderType.LIMIT:
                          shouldExecute = order.type === 'buy' 
                              ? currentPrice <= order.price 
                              : currentPrice >= order.price;
                          execPrice = order.price;
                          break;
                      case OrderType.STOP_LOSS:
                          if (order.type === 'sell' && order.stopPrice !== undefined) {
                              shouldExecute = currentPrice <= order.stopPrice;
                              execPrice = Math.min(currentPrice, order.stopPrice);
                          }
                          break;
                      case OrderType.STOP_PROFIT:
                          if (order.type === 'sell' && order.stopPrice !== undefined) {
                              shouldExecute = currentPrice >= order.stopPrice;
                              execPrice = Math.max(currentPrice, order.stopPrice);
                          }
                          break;
                      case OrderType.TRAILING_STOP:
                          if (order.type === 'sell' && order.stopPrice !== undefined && order.trailingPercent !== undefined) {
                              const triggerPrice = order.stopPrice * (1 - order.trailingPercent / 100);
                              shouldExecute = currentPrice <= triggerPrice;
                              execPrice = Math.min(currentPrice, triggerPrice);
                          }
                          break;
                      default:
                          shouldExecute = order.type === 'buy' 
                              ? currentPrice <= order.price 
                              : currentPrice >= order.price;
                          execPrice = order.price;
                  }

                  if (shouldExecute) {
                      executableOrders.push(order);
                      hasUpdates = true;
                  } else {
                      remainingOrders.push(order);
                  }
              });

              if (executableOrders.length === 0) {
                  return player;
              }

              let updatedPlayer = { ...player, pendingOrders: remainingOrders };

              executableOrders.forEach(order => {
                  const totalCost = order.price * order.amount * (1 + TRANSACTION_FEE_RATE);
                  const totalGain = order.price * order.amount * (1 - TRANSACTION_FEE_RATE);
                  
                  let execPrice = currentPrice;
                  switch (order.orderType) {
                      case OrderType.STOP_LOSS:
                      case OrderType.STOP_PROFIT:
                      case OrderType.TRAILING_STOP:
                          if (order.type === 'sell' && order.stopPrice !== undefined) {
                              execPrice = order.stopPrice;
                          }
                          break;
                  }

                  if (order.type === 'buy') {
                      updatedPlayer.cash -= totalCost;
                      const currentQty = updatedPlayer.portfolio[order.stockId] || 0;
                      const currentAvgCost = updatedPlayer.costBasis[order.stockId] || 0;
                      const totalVal = (currentQty * currentAvgCost) + (order.amount * execPrice);
                      updatedPlayer.costBasis[order.stockId] = totalVal / (currentQty + order.amount);
                      updatedPlayer.portfolio[order.stockId] = currentQty + order.amount;
                      updatedPlayer.lastBuyTimestamp = Date.now();
                  } else {
                      updatedPlayer.cash += totalGain;
                      updatedPlayer.portfolio[order.stockId] = (updatedPlayer.portfolio[order.stockId] || 0) - order.amount;
                      if (updatedPlayer.portfolio[order.stockId] <= 0) {
                          delete updatedPlayer.costBasis[order.stockId];
                      }
                  }

                  const stock = stocksRef.current.find(s => s.id === order.stockId);
                  const tx: StockTransaction = { 
                      id: `tx_ply_${Date.now()}_${Math.random()}`, 
                      time: Date.now(), 
                      price: execPrice, 
                      volume: order.amount, 
                      type: 'buy', 
                      playerName: order.stockName 
                  };
                  updatedPlayer.tradeHistory = [tx, ...updatedPlayer.tradeHistory];
                  updatedPlayer.stats = { ...updatedPlayer.stats, tradeCount: updatedPlayer.stats.tradeCount + 1 };
              });

              return updatedPlayer;
          });

          if (hasUpdates) {
              setTimeout(() => {
                  updatedPlayers.forEach(p => {
                      if (p.pendingOrders.length < prev.find(prevP => prevP.id === p.id)?.pendingOrders?.length) {
                          pushPlayerUpdate(p);
                      }
                  });
              }, 0);
              
              const executedCount = prev.reduce((count, player) => {
                  const currentPlayer = updatedPlayers.find(p => p.id === player.id);
                  if (currentPlayer) {
                      return count + (player.pendingOrders.length - currentPlayer.pendingOrders.length);
                  }
                  return count;
              }, 0);
              
              if (executedCount > 0) {
                  setTimeout(() => {
                      const stock = stocksRef.current.find(s => s.id === stockId);
                      const stockName = stock?.name || '股票';
                      const notification: Notification = {
                          id: `ord_exec_${Date.now()}`,
                          message: `订单已成交: ${stockName} ${executedCount}笔挂单已执行`,
                          type: 'success'
                      };
                      setNotifications(prev => [...prev, notification]);
                      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== notification.id)), 4000);
                  }, 100);
              }
          }
          return updatedPlayers;
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

  const placeOrder = (stockId: string, price: number, amount: number, isBuy: boolean, orderType?: OrderType, stopPrice?: number, trailingPercent?: number, icebergSize?: number) => {
      if (!activePlayerId) return;
      if (isHost) { handleHostPlaceOrder(activePlayerId, stockId, price, amount, isBuy, orderType, stopPrice, trailingPercent, icebergSize); } 
      else if (mqttClientRef.current) {
          const action: NetworkAction = { actionType: 'PLACE_ORDER', playerId: activePlayerId, data: { stockId, price, amount, isBuy, orderType, stopPrice, trailingPercent, icebergSize } };
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

  const selectCompany = (company: StartupCompany | null) => {
      setSelectedCompany(company);
      if (company && startupGeneratorRef.current) {
          const decisions = startupGeneratorRef.current.getAvailableDecisions(company.stage, company);
          setAvailableDecisions(decisions);
          const progress = startupGeneratorRef.current.calculateGrowthProgress(company);
          setCompanyGrowthProgress(progress);
      } else {
          setAvailableDecisions([]);
          setCompanyGrowthProgress(null);
      }
  };

  const executeCompanyDecision = (decisionId: string) => {
      if (!selectedCompany || !companyOperationServiceRef.current) return;
      const decision = availableDecisions.find(d => d.id === decisionId);
      if (!decision) return;
      const { updatedCompany, result } = companyOperationServiceRef.current.executeDecision(selectedCompany, decision);
      setStartupCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
      setSelectedCompany(updatedCompany);
      setDecisionResults(prev => [result, ...prev].slice(0, 20));
      addNotification(result.description, result.success ? 'success' : 'error');
      if (startupGeneratorRef.current) {
          const { updatedCompany: companyAfterMilestones, newlyAchieved } = startupGeneratorRef.current.checkMilestones(updatedCompany);
          setStartupCompanies(prev => prev.map(c => c.id === companyAfterMilestones.id ? companyAfterMilestones : c));
          setSelectedCompany(companyAfterMilestones);
          if (newlyAchieved.length > 0) {
              setNewlyAchievedMilestones(newlyAchieved);
              newlyAchieved.forEach(milestone => {
                  addNotification(`🎉 里程碑达成: ${milestone.title}`, 'success');
              });
          }
          const { updatedCompany: companyAfterAchievements, newlyUnlocked } = startupGeneratorRef.current.checkAchievements(companyAfterMilestones);
          setStartupCompanies(prev => prev.map(c => c.id === companyAfterAchievements.id ? companyAfterAchievements : c));
          setSelectedCompany(companyAfterAchievements);
          if (newlyUnlocked.length > 0) {
              setNewlyUnlockedAchievements(newlyUnlocked);
              newlyUnlocked.forEach(achievement => {
                  addNotification(`🏆 成就解锁: ${achievement.title}`, 'success');
              });
          }
          const progress = startupGeneratorRef.current.calculateGrowthProgress(companyAfterAchievements);
          setCompanyGrowthProgress(progress);
      }
  };

  const generateStartupCompanies = () => {
      if (!startupGeneratorRef.current) return;
      const sectors = Object.values(Sector);
      const companies: StartupCompany[] = [];
      for (const sector of sectors) {
          const company = startupGeneratorRef.current.generateStartup(sector);
          companies.push(company);
      }
      setStartupCompanies(companies);
  };

  const updateCompanyDailyProgress = (companyId: string) => {
      if (!startupGeneratorRef.current) return;
      const company = startupCompanies.find(c => c.id === companyId);
      if (!company) return;
      const updatedCompany = startupGeneratorRef.current.updateDailyProgress(company);
      setStartupCompanies(prev => prev.map(c => c.id === companyId ? updatedCompany : c));
      if (selectedCompany && selectedCompany.id === companyId) {
          setSelectedCompany(updatedCompany);
      }
  };

  const checkCompanyMilestones = (companyId: string) => {
      if (!startupGeneratorRef.current) return;
      const company = startupCompanies.find(c => c.id === companyId);
      if (!company) return;
      const { updatedCompany, newlyAchieved } = startupGeneratorRef.current.checkMilestones(company);
      setStartupCompanies(prev => prev.map(c => c.id === companyId ? updatedCompany : c));
      if (selectedCompany && selectedCompany.id === companyId) {
          setSelectedCompany(updatedCompany);
      }
      if (newlyAchieved.length > 0) {
          setNewlyAchievedMilestones(newlyAchieved);
          newlyAchieved.forEach(milestone => {
              addNotification(`🎉 里程碑达成: ${milestone.title}`, 'success');
          });
      }
      const { updatedCompany: companyAfterAchievements, newlyUnlocked } = startupGeneratorRef.current.checkAchievements(updatedCompany);
      setStartupCompanies(prev => prev.map(c => c.id === companyId ? companyAfterAchievements : c));
      if (selectedCompany && selectedCompany.id === companyId) {
          setSelectedCompany(companyAfterAchievements);
      }
      if (newlyUnlocked.length > 0) {
          setNewlyUnlockedAchievements(newlyUnlocked);
          newlyUnlocked.forEach(achievement => {
              addNotification(`🏆 成就解锁: ${achievement.title}`, 'success');
          });
      }
  };

  const calculateCompanyGrowthProgress = (companyId: string) => {
      if (!startupGeneratorRef.current) return;
      const company = startupCompanies.find(c => c.id === companyId);
      if (!company) return;
      const progress = startupGeneratorRef.current.calculateGrowthProgress(company);
      setCompanyGrowthProgress(progress);
  };

  const clearNewAchievements = () => {
      setNewlyAchievedMilestones([]);
      setNewlyUnlockedAchievements([]);
  };

  const createInvestmentRequest = useCallback((companyId: string, investmentAmount: number, equityRequested: number) => {
      if (!investmentServiceRef.current || !activePlayerId) {
          throw new Error("投资服务未初始化或玩家未登录");
      }
      
      const player = players.find(p => p.id === activePlayerId);
      if (!player) {
          throw new Error("找不到当前玩家信息");
      }
      
      const company = startupCompanies.find(c => c.id === companyId);
      if (!company) {
          throw new Error("找不到指定公司");
      }
      
      const request = investmentServiceRef.current.createInvestmentRequest(
          player.id,
          player.name,
          company,
          investmentAmount,
          equityRequested
      );
      
      addNotification(`已提交对 ${company.name} 的投资请求，金额 ${investmentAmount} 万元`, 'info');
      return request;
  }, [activePlayerId, players, startupCompanies]);

  const approveInvestmentRequest = useCallback((requestId: string) => {
      if (!investmentServiceRef.current) {
          return { success: false, message: "投资服务未初始化" };
      }
      
      const request = investmentServiceRef.current.getRequest(requestId);
      if (!request) {
          return { success: false, message: "投资请求不存在" };
      }
      
      const company = startupCompanies.find(c => c.id === request.companyId);
      if (!company) {
          return { success: false, message: "找不到对应公司" };
      }
      
      const result = investmentServiceRef.current.approveInvestmentRequest(requestId, company);
      if (result.success) {
          addNotification(result.message, 'success');
          
          setStartupCompanies(prev => prev.map(company => {
              if (company.id === request.companyId) {
                  return {
                      ...company,
                      valuation: company.valuation + request.investmentAmount,
                      funding: company.funding + request.investmentAmount
                  };
              }
              return company;
          }));
      } else {
          addNotification(result.message, 'error');
      }
      
      return result;
  }, [startupCompanies]);

  const createInvestmentCompetition = useCallback((companyId: string, type: CompetitionType, targetAmount: number, duration: number) => {
      if (!investmentServiceRef.current) {
          throw new Error("投资服务未初始化");
      }
      
      const company = startupCompanies.find(c => c.id === companyId);
      if (!company) {
          throw new Error("找不到指定公司");
      }
      
      const competition = investmentServiceRef.current.createInvestmentCompetition(
          company,
          type,
          targetAmount,
          duration
      );
      
      setInvestmentMarketplace(prev => ({
          ...prev,
          activeCompetitions: [...prev.activeCompetitions, competition]
      }));
      
      addNotification(`已创建 ${company.name} 的投资竞赛`, 'info');
      return competition;
  }, [startupCompanies]);

  const joinCompetition = useCallback((competitionId: string, investmentAmount: number) => {
      if (!investmentServiceRef.current || !activePlayerId) {
          return { success: false, message: "投资服务未初始化或玩家未登录" };
      }
      
      const player = players.find(p => p.id === activePlayerId);
      if (!player) {
          return { success: false, message: "找不到当前玩家信息" };
      }
      
      const result = investmentServiceRef.current.joinCompetition(competitionId, player.id, player.name, investmentAmount);
      
      if (result.success) {
          addNotification(`成功加入投资竞赛，投资金额 ${investmentAmount} 万元`, 'success');
          
          setInvestmentMarketplace(prev => ({
              ...prev,
              activeCompetitions: prev.activeCompetitions.map(comp => 
                  comp.id === competitionId ? result.competition! : comp
              )
          }));
      } else {
          addNotification(result.message, 'error');
      }
      
      return result;
  }, [activePlayerId, players]);

  const resolveCompetition = useCallback((competitionId: string) => {
      if (!investmentServiceRef.current) {
          return { message: "投资服务未初始化" };
      }
      
      const competition = investmentServiceRef.current.getCompetition(competitionId);
      if (!competition) {
          return { message: "竞赛不存在" };
      }
      
      const company = startupCompanies.find(c => c.id === competition.companyId);
      if (!company) {
          return { message: "找不到对应公司" };
      }
      
      const result = investmentServiceRef.current.resolveCompetition(competitionId, company);
      
      if (result.winner) {
          addNotification(`投资竞赛结束，获胜者: ${result.winner.playerName}，获得 ${result.winner.equityShare.toFixed(2)}% 股权`, 'success');
          
          setStartupCompanies(prev => prev.map(company => {
              if (company.id === competition.companyId) {
                  return {
                      ...company,
                      valuation: company.valuation + competition.currentTotal,
                      funding: company.funding + competition.currentTotal
                  };
              }
              return company;
          }));
      }
      
      setInvestmentMarketplace(prev => ({
          ...prev,
          activeCompetitions: prev.activeCompetitions.filter(comp => comp.id !== competitionId)
      }));
      
      return result;
  }, [startupCompanies]);

  const createInvestmentCooperation = useCallback((name: string, companyId: string, type: CooperationType, targetAmount: number, minParticipants: number, maxParticipants: number, duration: number) => {
      if (!investmentServiceRef.current) {
          throw new Error("投资服务未初始化");
      }
      
      const company = startupCompanies.find(c => c.id === companyId);
      if (!company) {
          throw new Error("找不到指定公司");
      }
      
      const cooperation = investmentServiceRef.current.createInvestmentCooperation(
          name,
          company,
          type,
          targetAmount,
          minParticipants,
          maxParticipants,
          duration
      );
      
      setInvestmentMarketplace(prev => ({
          ...prev,
          activeCooperations: [...prev.activeCooperations, cooperation]
      }));
      
      addNotification(`已创建投资合作项目: ${name}`, 'info');
      return cooperation;
  }, [startupCompanies]);

  const joinCooperation = useCallback((cooperationId: string, investmentAmount: number, contribution: string) => {
      if (!investmentServiceRef.current || !activePlayerId) {
          return { success: false, message: "投资服务未初始化或玩家未登录" };
      }
      
      const player = players.find(p => p.id === activePlayerId);
      if (!player) {
          return { success: false, message: "找不到当前玩家信息" };
      }
      
      const result = investmentServiceRef.current.joinCooperation(cooperationId, player.id, player.name, investmentAmount, contribution);
      
      if (result.success) {
          addNotification(`成功加入投资合作项目，投资金额 ${investmentAmount} 万元`, 'success');
          
          setInvestmentMarketplace(prev => ({
              ...prev,
              activeCooperations: prev.activeCooperations.map(coop => 
                  coop.id === cooperationId ? result.cooperation! : coop
              )
          }));
      } else {
          addNotification(result.message, 'error');
      }
      
      return result;
  }, [activePlayerId, players]);

  const finalizeCooperation = useCallback((cooperationId: string) => {
      if (!investmentServiceRef.current) {
          return { success: false, message: "投资服务未初始化" };
      }
      
      const cooperation = investmentServiceRef.current.getCooperation(cooperationId);
      if (!cooperation) {
          return { success: false, message: "合作项目不存在" };
      }
      
      const company = startupCompanies.find(c => c.id === cooperation.companyId);
      if (!company) {
          return { success: false, message: "找不到对应公司" };
      }
      
      const result = investmentServiceRef.current.finalizeCooperation(cooperationId, company);
      
      if (result.success) {
          addNotification(`投资合作项目已完成，${result.participants?.length} 位参与者获得相应股权`, 'success');
          
          setStartupCompanies(prev => prev.map(company => {
              if (company.id === cooperation.companyId) {
                  return {
                      ...company,
                      valuation: company.valuation + cooperation.currentTotal,
                      funding: company.funding + cooperation.currentTotal
                  };
              }
              return company;
          }));
      } else {
          addNotification(result.message, 'error');
      }
      
      setInvestmentMarketplace(prev => ({
          ...prev,
          activeCooperations: prev.activeCooperations.filter(coop => coop.id !== cooperationId)
      }));
      
      return result;
  }, [startupCompanies]);

  const createAlliance = useCallback((name: string, targetCompanies: string[], allianceGoals: string[]) => {
      if (!investmentServiceRef.current || !activePlayerId) {
          throw new Error("投资服务未初始化或玩家未登录");
      }
      
      const player = players.find(p => p.id === activePlayerId);
      if (!player) {
          throw new Error("找不到当前玩家信息");
      }
      
      const alliance = investmentServiceRef.current.createAlliance(name, player.id, player.name, targetCompanies, allianceGoals);
      
      setInvestmentMarketplace(prev => ({
          ...prev,
          activeAlliances: [...prev.activeAlliances, alliance]
      }));
      
      addNotification(`已创建投资联盟: ${name}`, 'info');
      return alliance;
  }, [activePlayerId, players]);

  const joinAlliance = useCallback((allianceId: string) => {
      if (!investmentServiceRef.current || !activePlayerId) {
          return { success: false, message: "投资服务未初始化或玩家未登录" };
      }
      
      const player = players.find(p => p.id === activePlayerId);
      if (!player) {
          return { success: false, message: "找不到当前玩家信息" };
      }
      
      const result = investmentServiceRef.current.joinAlliance(allianceId, player.id, player.name);
      
      if (result.success) {
          addNotification(`成功加入投资联盟: ${result.alliance?.name}`, 'success');
          
          setInvestmentMarketplace(prev => ({
              ...prev,
              activeAlliances: prev.activeAlliances.map(alliance => 
                  alliance.id === allianceId ? result.alliance! : alliance
              )
          }));
      } else {
          addNotification(result.message, 'error');
      }
      
      return result;
  }, [activePlayerId, players]);

  const contributeToAlliance = useCallback((allianceId: string, contributionType: 'capital' | 'influence' | 'knowledge' | 'network', amount: number) => {
      if (!investmentServiceRef.current || !activePlayerId) {
          return { success: false, message: "投资服务未初始化或玩家未登录" };
      }
      
      const result = investmentServiceRef.current.contributeToAlliance(allianceId, activePlayerId, contributionType, amount);
      
      if (result.success) {
          addNotification(`成功向联盟贡献 ${contributionType}: ${amount}`, 'success');
          
          setInvestmentMarketplace(prev => ({
              ...prev,
              activeAlliances: prev.activeAlliances.map(alliance => 
                  alliance.id === allianceId ? result.alliance! : alliance
              )
          }));
      } else {
          addNotification(result.message, 'error');
      }
      
      return result;
  }, [activePlayerId]);

  const getPlayerInvestmentProfile = useCallback((playerId: string) => {
      if (!investmentServiceRef.current) {
          throw new Error("投资服务未初始化");
      }
      
      const player = players.find(p => p.id === playerId);
      if (!player) {
          throw new Error("找不到玩家信息");
      }
      
      return investmentServiceRef.current.getPlayerInvestmentProfile(playerId, player.name);
  }, [players]);

  const selectPlayerProfile = useCallback((profile: PlayerInvestmentProfile | null) => {
      setSelectedPlayerProfile(profile);
  }, []);

  const updateInvestmentLeaderboard = useCallback(() => {
      if (!investmentServiceRef.current) {
          return;
      }
      
      const leaderboard = investmentServiceRef.current.getLeaderboard();
      
      setInvestmentMarketplace(prev => ({
          ...prev,
          leaderboard
      }));
  }, []);

  const refreshInvestmentMarketplace = useCallback(() => {
      if (!investmentServiceRef.current) {
          return;
      }
      
      const marketplace = investmentServiceRef.current.getMarketplace();
      const events = investmentServiceRef.current.getInvestmentEvents();
      
      setInvestmentMarketplace(marketplace);
      setInvestmentEvents(events);
  }, []);

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
                  // Update startup companies daily progress
                  if (startupGeneratorRef.current) {
                      setStartupCompanies(prevCompanies => {
                          return prevCompanies.map(company => {
                              const updatedCompany = startupGeneratorRef.current!.updateDailyProgress(company);
                              const { updatedCompany: companyAfterMilestones, newlyAchieved } = startupGeneratorRef.current!.checkMilestones(updatedCompany);
                              const { updatedCompany: companyAfterAchievements, newlyUnlocked } = startupGeneratorRef.current!.checkAchievements(companyAfterMilestones);
                              
                              newlyAchieved.forEach(milestone => {
                                  addNotification(`🎉 [${company.name}] 里程碑达成: ${milestone.title}`, 'success');
                              });
                              
                              newlyUnlocked.forEach(achievement => {
                                  addNotification(`🏆 [${company.name}] 成就解锁: ${achievement.title}`, 'success');
                              });
                              
                              return companyAfterAchievements;
                          });
                      });
                  }
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
        // 0. Macro Event Generation and Application
        if (macroEventServiceRef.current) {
            const newEvent = macroEventServiceRef.current.generateRandomEvent();
            if (newEvent) {
                macroEventServiceRef.current.applyEvent(newEvent);
                const newsItem: MarketNews = {
                    id: `macro_${newEvent.id}`,
                    type: NewsType.NEWS,
                    title: newEvent.title,
                    content: newEvent.description,
                    impact: newEvent.severity === 'high' || newEvent.severity === 'extreme' ? 'negative' : 'neutral',
                    severity: newEvent.severity === 'extreme' ? 5 : newEvent.severity === 'high' ? 4 : newEvent.severity === 'medium' ? 3 : 2,
                    affectedSectors: newEvent.affectedSectors.map(s => {
                        const sectorMap: Record<string, Sector> = {
                            '互联网/科技': Sector.TECH,
                            '新能源/造车': Sector.ENERGY,
                            '大消费/食品': Sector.CONSUMER,
                            '金融/银行': Sector.FINANCE,
                            '房地产/基建': Sector.REAL_ESTATE,
                            '高端制造': Sector.MANUFACTURING,
                            '农业/养殖': Sector.AGRICULTURE,
                            '物流/运输': Sector.LOGISTICS
                        };
                        return sectorMap[s] || Sector.TECH;
                    }),
                    timestamp: Date.now(),
                    source: '宏观经济分析'
                };
                setNews(prev => [newsItem, ...prev].slice(0, 50));
            }
            macroEventServiceRef.current.update();
        }

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

            // --- D. Enhanced Price Calculation with Macro Events and Company Decisions ---
            const priceFactors = enhancedPriceCalculationServiceRef.current?.calculatePriceChange(
                stock,
                impactNetBuyVolume,
                stock.price * settingsRef.current.marketDepth,
                globalTrend,
                settingsRef.current
            ) || {
                volumeImpact: 0,
                momentum: 0,
                drift: 0,
                macroImpact: 0,
                sectorImpact: 0,
                companyDecisionImpact: 0,
                totalChangePercent: 0
            };

            let newPrice = stock.price * (1 + priceFactors.totalChangePercent);
            
            if (Math.abs(newPrice - stock.price) < 0.001) {
                newPrice += (Math.random() > 0.5 ? 0.01 : -0.01);
            }

            newPrice = Math.max(0.01, newPrice);
            if (newPrice >= limitUp) { newPrice = limitUp; }
            else if (newPrice <= limitDown) { newPrice = limitDown; }
            
            const newTotalVolume = (stock.totalVolume || 0) + realTickVolume;
            
            return {
                ...stock,
                price: newPrice,
                lastPrice: stock.price,
                trend: stock.trend * 0.99 + (priceFactors.totalChangePercent * 0.1),
                momentum: priceFactors.momentum,
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
    <GameContext.Provider value={{ phase, currentDay, tradingSession, stocks, marketIndex, marketIndexHistory, players, activePlayerId, news, timeLeft, settings, roomCode, notifications, broadcastEvent, marketSentiment, midDayReport, dailyReport, danmuList, startupCompanies, selectedCompany, availableDecisions, decisionResults, companyGrowthProgress, newlyAchievedMilestones, newlyUnlockedAchievements, investmentMarketplace, selectedPlayerProfile, investmentEvents, isHostOnline, isMqttConnected, lastSyncTime, isDataSynced, mqttConnectionError, updateSettings, regenerateStocks, updateStockName, joinGame, startGame, stopGame, resetGame, placeOrder, cancelOrder, kickPlayer, dismissNotification, placeBet, borrowMoney, repayDebt, sendDanmu, distributeDividends, requestDataSync, selectCompany, executeCompanyDecision, generateStartupCompanies, updateCompanyDailyProgress, checkCompanyMilestones, calculateCompanyGrowthProgress, clearNewAchievements, createInvestmentRequest, approveInvestmentRequest, createInvestmentCompetition, joinCompetition, resolveCompetition, createInvestmentCooperation, joinCooperation, finalizeCooperation, createAlliance, joinAlliance, contributeToAlliance, getPlayerInvestmentProfile, selectPlayerProfile, updateInvestmentLeaderboard, refreshInvestmentMarketplace }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => { const context = useContext(GameContext); if (!context) throw new Error("useGame must be used within GameProvider"); return context; };
