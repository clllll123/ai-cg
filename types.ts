
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
  orderType?: OrderType;
  stopPrice?: number;
  trailingPercent?: number;
  icebergSize?: number;
  originalAmount?: number;
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
  
  // 交易设置
  transactionFeeRate: number; // 交易手续费率
  stampTaxRate: number; // 印花税率（卖出时收取）
  maxDailyFluctuation: number; // 单日最大涨跌幅
}

// ==================== 扩展订单类型 ====================

export enum OrderType {
  LIMIT = '限价单', // 指定价格成交
  MARKET = '市价单', // 以最优价格立即成交
  STOP_LOSS = '止损单', // 跌破止损价自动卖出
  STOP_PROFIT = '止盈单', // 达到目标价自动卖出
  TRAILING_STOP = '追踪止损' // 价格下跌N%后触发止损
}

export enum OrderStatus {
  PENDING = '待成交',
  PARTIAL = '部分成交',
  FILLED = '完全成交',
  CANCELLED = '已取消',
  TRIGGERED = '已触发',
  EXPIRED = '已过期'
}

export interface OrderPrice {
  type: 'limit' | 'market';
  limitPrice?: number; // 限价单指定价格
  marketPrice?: number; // 市价单可指定价格上限/下限
}

export interface StopCondition {
  triggerPrice: number; // 触发价格
  triggerType: 'gte' | 'lte'; // >= 或 <=
  orderType: OrderType; // 触发后生成订单类型
  orderPrice: OrderPrice; // 触发后订单价格
}

export interface ExtendedOrder {
  id: string;
  playerId: string;
  stockId: string;
  type: OrderType;
  side: 'buy' | 'sell';
  status: OrderStatus;
  price: OrderPrice;
  amount: number;
  filledAmount: number;
  stopCondition?: StopCondition; // 止损/止盈条件
  timestamp: number;
  expiresAt?: number; // 过期时间
  icebergSize?: number; // 冰山订单大小
  icebergFilled: number; // 冰山订单已成交
  
  // 高级订单
  trailingPercent?: number; // 追踪止损百分比
  trailingDistance?: number; // 追踪止损距离
  parentOrderId?: string; // 关联父订单（如止损单的源订单）
}

// ==================== 股息分红系统 ====================

export interface StockFundamentals {
  // 估值指标
  peRatio: number; // 市盈率
  pbRatio: number; // 市净率
  marketCap: number; // 市值（万元）
  
  // 盈利能力
  eps: number; // 每股收益
  roe: number; // 净资产收益率 (%)
  netProfitMargin: number; // 净利润率 (%)
  revenueGrowth: number; // 营收增长率 (%)
  netProfitGrowth: number; // 净利润增长率 (%)
  
  // 分红相关
  dividendPerShare: number; // 每股分红
  dividendYield: number; // 股息率 (%)
  exDividendDate: number; // 除息日
  dividendPaymentDate: number; // 派息日
  recordDate: number; // 股权登记日
  
  // 风险指标
  debtToEquity: number; // 资产负债率 (%)
  volatility: number; // 历史波动率
  
  // 行业属性
  industryHeat: number; // 行业热度 (0-100)
  sectorCorrelation: number; // 与行业指数相关性
}

export interface DividendEvent {
  id: string;
  stockId: string;
  exDividendDate: number; // 除息日
  dividendPerShare: number; // 每股分红金额
  dividendYield: number; // 实际股息率
  announcementDate: number; // 公告发布日
  recordDate: number; // 股权登记日
  paymentDate: number; // 派息日
  
  // 除权处理
  exRightsPrice: number; // 除权参考价
  bonusSharesRatio: number; // 送股比例 (如0.5表示每10股送5股)
  rightsIssueRatio: number; // 配股比例
  rightsIssuePrice: number; // 配股价
}

export interface DividendRecord {
  playerId: string;
  stockId: string;
  shares: number; // 持有股数
  dividendPerShare: number; // 每股分红
  totalDividend: number; // 总分红金额
  recordDate: number; // 登记日持仓
  paymentDate: number; // 派息日
  isReceived: boolean; // 是否已到账
}

// ==================== 做空机制 ====================

export interface ShortPosition {
  id: string;
  playerId: string;
  stockId: string;
  stockName: string;
  borrowedAmount: number; // 借入股数
  borrowedPrice: number; // 借入价格（开仓价）
  currentPrice: number; // 当前股价
  marginRequired: number; // 需缴纳保证金
  marginRatio: number; // 保证金比例
  marginCallPrice: number; // 爆仓价
  borrowFee: number; // 借股费用/日
  openTimestamp: number; // 开仓时间
  dueDate: number; // 强制平仓日期
  status: 'open' | 'partial' | 'closed';
  profit: number; // 当前盈亏
  profitRate: number; // 收益率
}

export interface ShortSellConfig {
  allowShorting: boolean; // 是否允许做空
  minMarginRequirement: number; // 最低保证金比例
  marginCallThreshold: number; // 爆仓触发线（保证金率低于此值）
  dailyBorrowFee: number; // 每日借股费率
  maxShortRatio: number; // 最大做空比例（流通盘）
  maxShortDays: number; // 最长做空天数
}

export interface MarginAccount {
  playerId: string;
  leverage: number; // 当前杠杆倍数
  usedMargin: number; // 已用保证金
  availableMargin: number; // 可用保证金
  marginRatio: number; // 保证金率
  marginCallPrice: number; // 爆仓价（整体）
  liquidationTriggered: boolean; // 是否触发强平
  
  // 融资融券
  marginBalance: number; // 融资余额
  securitiesBalance: number; // 融券余额（做空市值）
  interestRate: number; // 融资利率
  borrowFeeRate: number; // 融券费率
}

// ==================== 技术指标 ====================

export interface TechnicalIndicators {
  // 移动平均线
  ma5: number; // 5日均线
  ma10: number; // 10日均线
  ma20: number; // 20日均线
  ma60: number; // 60日均线
  
  // MACD
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  
  // RSI
  rsi6: number; // 6日RSI
  rsi12: number; // 12日RSI
  
  // 布林带
  bollUpper: number;
  bollMiddle: number;
  bollLower: number;
  
  // 量能指标
  volume: number; // 成交量
  volumeMA5: number; // 5日均量
  volumeRatio: number; // 量比
  
  // 其他
  atr: number; // 真实波幅
  changePercent: number; // 涨跌幅
  turnoverRate: number; // 换手率
}

export interface PriceTrend {
  direction: 'up' | 'down' | 'sideways';
  strength: number; // 趋势强度 0-1
  support: number; // 支撑位
  resistance: number; // 阻力位
  nextSupport?: number;
  nextResistance?: number;
}

// ==================== 停牌与退市 ====================

export enum HaltReason {
  IPO_LOCKUP = 'IPO锁定期',
  UNUSUAL_VOLUME = '异常波动核查',
  PENDING_NEWS = '重大事项待公布',
  SUSPICIOUS_TRADING = '涉嫌内幕交易',
  DELISTING = '退市整理',
  SYSTEM_HALT = '系统暂停'
}

export interface TradingHalt {
  stockId: string;
  reason: HaltReason;
  startTime: number;
  expectedEndTime: number;
  haltPrice: number;
  actualEndTime?: number;
}

export interface DelistingEvent {
  stockId: string;
  reason: string;
  delistingDate: number;
  finalPrice: number;
  cashSettlementPrice: number; // 退市结算价
  refundPerShare: number; // 每股退还金额
}

// ==================== 市场事件系统 ====================

export enum MarketEventType {
  MARKET_RALLY = '市场大涨',
  MARKET_CRASH = '市场大跌',
  SECTOR_ROTATION = '板块轮动',
  BLACK_SWAN = '黑天鹅',
  RUMOR_SPREAD = '谣言四起',
  REGULATION = '监管收紧',
  POLICY_BOOST = '政策利好',
  EARNINGS_SEASON = '财报季'
}

export interface MarketEvent {
  id: string;
  type: MarketEventType;
  name: string;
  description: string;
  probability: number;
  duration: number; // 持续tick数
  effects: MarketEventEffect[];
  icon: string;
  newsTitle?: string;
  newsContent?: string;
}

export interface MarketEventEffect {
  target: 'all' | Sector | string; // all=全市场, Sector=行业, string=特定股票
  effectType: 'sentiment' | 'volatility' | 'trend' | 'volume' | 'freeze';
  value: number;
}

// ==================== 扩展 BroadcastEvent ====================

export interface ExtendedBroadcastEvent {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  type: 'buy' | 'sell' | 'dividend' | 'short' | 'cover' | 'margin_call' | 'level_up';
  stockName: string;
  amount: number;
  totalValue: number;
  timestamp: number;
  extra?: {
    profit?: number;
    profitRate?: number;
    level?: number;
    title?: string;
  };
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

// --- 任务系统类型定义 ---
export enum TaskCategory {
  NEWBIE = '新手引导',
  DAILY = '每日任务',
  ACHIEVEMENT = '成就任务',
  CHALLENGE = '挑战任务'
}

export enum TaskStatus {
  PENDING = '未开始',
  IN_PROGRESS = '进行中',
  COMPLETED = '已完成',
  EXPIRED = '已过期',
  FAILED = '已失败'
}

export enum TaskPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

export interface TaskCondition {
  type: 'TRADE_COUNT' | 'PROFIT_RATE' | 'HOLD_DAYS' | 'PORTFOLIO_VALUE' | 
        'SECTOR_DIVERSIFY' | 'FIRST_BUY' | 'FIRST_SELL' | 'USE_TOOL' |
        'READ_NEWS' | 'SEND_DANMU' | 'JOIN_GAME' | 'WIN_GAME' |
        'BORROW_MONEY' | 'REPAY_DEBT' | 'ATTENDANCE' | 'LEVEL_REACH';
  targetValue: number;
  description: string;
}

export interface TaskReward {
  experience: number;
  coins: number;
  items?: string[];
  title?: string;
}

export interface GameTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  conditions: TaskCondition[];
  reward: TaskReward;
  progress: number;
  maxProgress: number;
  createdAt: number;
  expiresAt?: number;
  isNew: boolean;
  isClaimed: boolean;
}

export interface TaskProgressUpdate {
  taskId: string;
  conditionType: TaskCondition['type'];
  currentValue: number;
  targetValue: number;
}

export interface GuideStep {
  id: string;
  targetElement: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  actionRequired: boolean;
  actionType?: 'CLICK' | 'INPUT' | 'SCROLL' | 'WAIT';
  nextStep?: string;
  skipable: boolean;
}

export interface GuideTour {
  id: string;
  name: string;
  steps: GuideStep[];
  isCompleted: boolean;
  currentStep: number;
}
