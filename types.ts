
export enum GamePhase {
  LOBBY = '等待大厅', // Players joining & Downloading Data
  OPENING = '集合竞价', // Pre-market / Ready
  TRADING = '交易进行中', // Main loop
  ENDED = '已休市'
}

export enum TradingSession {
  MORNING = '早盘',
  BREAK = '午间休市',
  AFTERNOON = '尾盘',
  DAY_END = '日结休市' // NEW: End of day report session
}

export enum Sector {
  TECH = '互联网/科技',
  ENERGY = '新能源/造车',
  CONSUMER = '大消费/食品',
  REAL_ESTATE = '房地产/基建',
  MEDICAL = '生物医药',
  GAME = '电子游戏', 
  TOY = '潮玩/手办', 
  FINANCE = '金融/银行',
  MANUFACTURING = '高端制造',
  LOGISTICS = '物流/运输',
  AGRICULTURE = '农业/养殖'
}

export enum NewsFrequency {
  LOW = '风平浪静',
  MEDIUM = '正常波动',
  HIGH = '消息频发',
  CRAZY = '黑天鹅不断'
}

export enum BotLevel {
  NEWBIE = '散户',      
  PRO = '大户',        
  HOT_MONEY = '游资',  
  WHALE = '机构'       
}

export enum NewsType {
  NEWS = 'NEWS',         // 普通新闻
  EXPERT = 'EXPERT',     // 专家解读
  RUMOR = 'RUMOR',       // 谣言/内幕
  SENTIMENT = 'SENTIMENT' // 市场情绪/散户喊话
}

export interface StockTransaction {
  id: string;
  time: number;
  price: number;
  volume: number;
  type: 'buy' | 'sell';
  playerName: string;
}

export interface OrderBookItem {
    p: number; // Price
    v: number; // Volume
}

export interface Stock {
  id: string;
  name: string;
  symbol: string;
  sector: Sector;
  description: string;
  price: number;
  openPrice: number; 
  lastPrice: number; 
  history: { time: number; price: number; volume: number }[];
  volatility: number;
  trend: number;
  beta: number;
  transactions: StockTransaction[];
  // NEW: For Turnover Rate
  totalVolume: number; // Cumulative volume for the day
  totalShares: number; // Total circulating shares
  eps: number; // Earnings Per Share (for P/E Ratio)
  
  // NEW: Physics & Simulation Props
  momentum: number; // Price velocity (inertia)
  
  // Real-time Synced Order Book
  buyBook?: OrderBookItem[];
  sellBook?: OrderBookItem[];
}

// 轻量级股票快照，用于每秒广播
export interface StockTick {
  i: string; // id
  p: number; // price
  v: number; // current tick volume (not total)
  tv: number; // total volume
  b?: OrderBookItem[]; // Bids (Buy 1-5)
  a?: OrderBookItem[]; // Asks (Sell 1-5)
}

export interface PlayerStats {
  tradeCount: number;
  peakValue: number;
  worstValue: number;
}

export interface PendingOrder {
  id: string;
  stockId: string;
  stockName: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  timestamp: number;
}

export interface Player {
  id: string;
  prefix: string;
  name: string;
  displayName: string;
  avatar?: string;
  cash: number;
  debt: number; // NEW: Amount borrowed (Principal + Interest)
  portfolio: { [stockId: string]: number };
  costBasis: { [stockId: string]: number };
  pendingOrders: PendingOrder[];
  tradeHistory: StockTransaction[];
  initialCapital: number;
  isBot: boolean;
  botLevel?: BotLevel;
  totalValueHistory: { time: number; value: number }[];
  stats: PlayerStats;
  
  // NEW: Cooldown Logic
  lastBuyTimestamp: number; 

  // NEW: Betting Logic
  activeBet?: 'BULL' | 'BEAR' | null; // Prediction for Afternoon
  betAmount?: number;
}

export interface MarketNews {
  id: string;
  type: NewsType; // NEW: Type of message
  title: string;
  content: string;
  impact: 'positive' | 'negative' | 'neutral';
  severity: number;
  affectedSectors: Sector[];
  timestamp: number;
  source?: string; // e.g., "Analyst Zhang", "Reddit", "Insider"
}

export interface MidDayReport {
  title: string;
  summary: string;
  starStock: string;
  trashStock: string;
  marketOutlook: string;
}

// NEW: Loan Provider Configuration
export interface LoanProvider {
  id: string;
  name: string;
  rate: number; // 0.15 for 15%
  leverage: number; // 2 for 1:2
  color: string; // Tailwind color class for UI distinction
  desc: string;
}

// NEW: Danmu (Interaction) Interface
export interface Danmu {
    id: string;
    text: string;
    playerName: string;
    type: 'text' | 'emoji' | 'rich'; // 'rich' is gold text
    color?: string; // Optional custom color
    timestamp: number;
}

export interface GameSettings {
  gameTitle: string;
  totalDays: number;
  dayDurationMinutes: number; 
  openingDuration: number; 
  morningDuration: number; 
  breakDuration: number; 
  afternoonDuration: number; 
  initialCash: number;
  maxPlayers: number;
  botCount: number;
  stockCount: number;
  newsFrequency: NewsFrequency;
  marketRefreshRate: number;
  loanProviders: LoanProvider[]; // NEW: Configurable providers
  marketDepth: number; // Controls price sensitivity. Lower = More Volatile
  playerImpactMultiplier: number; // NEW: Controls "Protagonist Aura". 1 = Fair, 5 = Powerful, 10 = God Mode
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

export interface BroadcastEvent {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  type: 'buy' | 'sell' | 'dividend';
  stockName: string;
  amount: number; // For dividend, this is Amount Per Share
  totalValue: number;
  timestamp: number;
}

// --- NETWORK MESSAGE TYPES ---
export interface NetworkMessage {
  // SYNC_SETUP: Static data (Stocks names, IDs) - One time heavy download
  // SYNC_TICK: Dynamic data (Prices) - Lightweight frequent
  // GAME_START: Signal to switch view
  type: 'JOIN' | 'SYNC_SETUP' | 'SYNC_TICK' | 'GAME_START' | 'ACTION' | 'ERROR';
  payload: any;
}

export interface NetworkAction {
  actionType: 'PLACE_ORDER' | 'CANCEL_ORDER' | 'PLACE_BET' | 'BORROW' | 'REPAY' | 'DANMU';
  playerId: string;
  data: any;
}

// --- DAILY EVENT SYSTEM ---
export interface EventEffect {
  type: 'MARKET_SENTIMENT' | 'SECTOR_BOOST' | 'SECTOR_CRASH' | 'VOLATILITY_CHANGE';
  target?: Sector; 
  value: number; 
  description: string;
}

export interface DailyEvent {
  id: string;
  title: string;
  description: string;
  effects: EventEffect[];
  newsFlash: string; 
  triggerCondition?: 'MORNING' | 'AFTERNOON' | 'RANDOM';
}
