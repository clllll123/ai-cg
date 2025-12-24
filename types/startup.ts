export enum CompanyStage {
  SEED = '种子期',
  ANGEL = '天使轮',
  SERIES_A = 'A轮',
  SERIES_B = 'B轮',
  SERIES_C = 'C轮',
  PRE_IPO = 'Pre-IPO',
  IPO = '已上市'
}

export enum BusinessDecisionType {
  PRODUCT_LAUNCH = '产品发布',
  MARKETING_CAMPAIGN = '营销活动',
  RD_INVESTMENT = '研发投入',
  EXPANSION = '业务扩张',
  PARTNERSHIP = '战略合作',
  COST_CUTTING = '成本控制',
  TALENT_ACQUISITION = '人才引进',
  TECHNOLOGY_UPGRADE = '技术升级',
  BRAND_BUILDING = '品牌建设',
  INTERNATIONAL_EXPANSION = '国际化扩张'
}

export enum DecisionImpact {
  REVENUE = 'revenue',
  PROFIT = 'profit',
  GROWTH = 'growth',
  RISK = 'risk',
  BRAND = 'brand',
  INNOVATION = 'innovation',
  MARKET_SHARE = 'marketShare'
}

export interface BusinessDecision {
  id: string;
  type: BusinessDecisionType;
  title: string;
  description: string;
  cost: number;
  impacts: {
    type: DecisionImpact;
    value: number;
    duration: number;
  }[];
  executionTime: number;
  successRate: number;
  riskLevel: 'low' | 'medium' | 'high';
  prerequisites?: string[];
}

export interface CompanyMetrics {
  revenue: number;
  profit: number;
  marketShare: number;
  brandValue: number;
  innovationScore: number;
  customerSatisfaction: number;
  employeeCount: number;
  cashFlow: number;
  debtRatio: number;
  growthRate: number;
}

export interface StartupCompany {
  id: string;
  name: string;
  sector: string;
  stage: CompanyStage;
  valuation: number;
  funding: number;
  sharesIssued: number;
  investors: {
    playerId: string;
    shares: number;
    investmentAmount: number;
    entryValuation: number;
  }[];
  metrics: CompanyMetrics;
  activeDecisions: {
    decisionId: string;
    startTime: number;
    progress: number;
  }[];
  history: {
    timestamp: number;
    valuation: number;
    revenue: number;
    profit: number;
  }[];
  marketEvents: string[];
  milestones: Milestone[];
  achievements: CompanyAchievement[];
  storyEvents: CompanyStoryEvent[];
  stageStartTime: number;
  totalDays: number;
}

export interface InvestmentOpportunity {
  id: string;
  companyId: string;
  companyName: string;
  sector: string;
  stage: CompanyStage;
  targetAmount: number;
  minInvestment: number;
  maxInvestment: number;
  valuation: number;
  equityOffered: number;
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  deadline: number;
  requiredMetrics?: {
    type: string;
    value: number;
  }[];
}

export interface MacroEvent {
  id: string;
  title: string;
  description: string;
  type: 'economic' | 'policy' | 'international' | 'technology' | 'social';
  severity: 'low' | 'medium' | 'high' | 'extreme';
  startTime: number;
  duration: number;
  affectedSectors: string[];
  impacts: {
    type: 'market_sentiment' | 'sector_performance' | 'interest_rate' | 'inflation' | 'currency' | 'gdpGrowth' | 'volatility';
    target?: string;
    value: number;
  }[];
  newsFlash: string;
  relatedStocks?: string[];
}

export interface MarketCondition {
  overallSentiment: number;
  volatilityIndex: number;
  interestRate: number;
  inflationRate: number;
  gdpGrowth: number;
  sectorPerformance: Record<string, number>;
  activeEvents: string[];
}

export interface PlayerStartupProfile {
  playerId: string;
  ownedCompanies: string[];
  portfolio: {
    companyId: string;
    shares: number;
    averageCost: number;
    currentValue: number;
  }[];
  totalInvested: number;
  totalReturns: number;
  successfulExits: number;
  failedInvestments: number;
  reputation: number;
  achievements: string[];
}

export interface DecisionResult {
  decisionId: string;
  success: boolean;
  actualImpacts: {
    type: DecisionImpact;
    value: number;
  }[];
  timestamp: number;
  description: string;
}

export interface CompanyGrowthPath {
  stage: CompanyStage;
  requiredMetrics: {
    type: string;
    value: number;
  }[];
  fundingNeeded: number;
  timeToNextStage: number;
  risks: string[];
  opportunities: string[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  category: 'financial' | 'growth' | 'market' | 'innovation' | 'social';
  requiredMetrics: {
    type: string;
    value: number;
  }[];
  reward: {
    type: 'valuation_boost' | 'brand_boost' | 'innovation_boost' | 'market_share_boost' | 'revenue_boost';
    value: number;
  };
  achieved: boolean;
  achievedAt?: number;
}

export interface CompanyAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  achieved: boolean;
  achievedAt?: number;
}

export interface GrowthProgress {
  currentStage: CompanyStage;
  stageProgress: number;
  nextStageProgress: number;
  milestonesAchieved: number;
  totalMilestones: number;
  achievementsUnlocked: number;
  totalAchievements: number;
  daysInCurrentStage: number;
  estimatedDaysToNextStage: number;
}

export interface CompanyStoryEvent {
  id: string;
  timestamp: number;
  type: 'milestone' | 'achievement' | 'stage_advance' | 'major_decision' | 'market_event';
  title: string;
  description: string;
  impact?: {
    type: string;
    value: number;
  };
}

export enum InvestmentActionType {
  INVEST = 'invest',
  EXIT = 'exit',
  FOLLOW = 'follow',
  COMPETE = 'compete',
  COOPERATE = 'cooperate',
  ALLIANCE = 'alliance',
  MERGE = 'merge',
  ACQUIRE = 'acquire'
}

export enum InvestmentStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export enum CompetitionType {
  BIDDING = 'bidding',
  RACING = 'racing',
  DOMINANCE = 'dominance'
}

export enum CooperationType {
  SYNDICATE = 'syndicate',
  JOINT_VENTURE = 'joint_venture',
  RESOURCE_SHARING = 'resource_sharing',
  KNOWLEDGE_SHARING = 'knowledge_sharing'
}

export interface InvestmentRequest {
  id: string;
  playerId: string;
  playerName: string;
  companyId: string;
  companyName: string;
  investmentAmount: number;
  equityRequested: number;
  valuation: number;
  timestamp: number;
  status: InvestmentStatus;
  conditions?: string[];
}

export interface InvestmentCompetition {
  id: string;
  companyId: string;
  companyName: string;
  stage: CompanyStage;
  type: CompetitionType;
  targetAmount: number;
  currentTotal: number;
  startTime: number;
  endTime: number;
  participants: {
    playerId: string;
    playerName: string;
    investmentAmount: number;
    equityShare: number;
    isLeading: boolean;
  }[];
  winner?: {
    playerId: string;
    playerName: string;
    investmentAmount: number;
    equityShare: number;
  };
  status: InvestmentStatus;
  rewards: {
    type: 'equity' | 'influence' | 'reputation';
    value: number;
  }[];
}

export interface InvestmentCooperation {
  id: string;
  name: string;
  type: CooperationType;
  companyId: string;
  companyName: string;
  targetAmount: number;
  currentTotal: number;
  minParticipants: number;
  maxParticipants: number;
  participants: {
    playerId: string;
    playerName: string;
    investmentAmount: number;
    equityShare: number;
    contribution: string;
    joinedAt: number;
  }[];
  benefits: {
    type: 'cost_reduction' | 'risk_sharing' | 'resource_access' | 'influence_boost';
    value: number;
    description: string;
  }[];
  startTime: number;
  endTime: number;
  status: InvestmentStatus;
  agreementTerms?: string[];
}

export interface InvestmentAlliance {
  id: string;
  name: string;
  leaderId: string;
  leaderName: string;
  members: {
    playerId: string;
    playerName: string;
    reputation: number;
    contribution: number;
    joinedAt: number;
  }[];
  targetCompanies: string[];
  allianceGoals: string[];
  resources: {
    capital: number;
    influence: number;
    knowledge: number;
    network: number;
  };
  createdAt: number;
  isActive: boolean;
  allianceLevel: number;
}

export interface InvestmentEvent {
  id: string;
  type: 'investment' | 'competition' | 'cooperation' | 'alliance' | 'exit' | 'merger';
  companyId: string;
  companyName: string;
  participants: {
    playerId: string;
    playerName: string;
    role: string;
  }[];
  amount: number;
  timestamp: number;
  description: string;
  impact?: {
    type: string;
    value: number;
  };
}

export interface InvestmentLeaderboard {
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  rankings: {
    rank: number;
    playerId: string;
    playerName: string;
    totalInvested: number;
    totalReturns: number;
    returnRate: number;
    successfulInvestments: number;
    reputation: number;
    allianceName?: string;
  }[];
  lastUpdated: number;
}

export interface PlayerInvestmentProfile {
  playerId: string;
  playerName: string;
  reputation: number;
  influence: number;
  investmentHistory: InvestmentEvent[];
  activeInvestments: {
    companyId: string;
    companyName: string;
    investmentAmount: number;
    equityShare: number;
    entryValuation: number;
    currentValuation: number;
    returns: number;
    returnRate: number;
    entryDate: number;
  }[];
  competitions: {
    participated: number;
    won: number;
    lost: number;
    totalInvested: number;
    totalWon: number;
  };
  cooperations: {
    participated: number;
    active: number;
    completed: number;
    totalContribution: number;
    totalBenefits: number;
  };
  alliances: {
    memberOf: string[];
    leaderOf: string[];
    totalContribution: number;
    totalBenefits: number;
  };
  investmentStyle: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    preferredSectors: string[];
    preferredStages: CompanyStage[];
    averageHoldTime: number;
  };
  achievements: string[];
  badges: {
    id: string;
    name: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    earnedAt: number;
  }[];
}

export interface InvestmentMarketplace {
  availableOpportunities: InvestmentOpportunity[];
  activeCompetitions: InvestmentCompetition[];
  activeCooperations: InvestmentCooperation[];
  activeAlliances: InvestmentAlliance[];
  leaderboard: InvestmentLeaderboard;
  marketTrends: {
    sector: string;
    investmentVolume: number;
    averageReturn: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}
