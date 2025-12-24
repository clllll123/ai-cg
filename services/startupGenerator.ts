import { StartupCompany, CompanyStage, CompanyMetrics, InvestmentOpportunity, BusinessDecision, BusinessDecisionType, DecisionImpact, CompanyGrowthPath, Milestone, CompanyAchievement, GrowthProgress, CompanyStoryEvent } from '../types/startup';
import { Sector } from '../types';

const STARTUP_NAMES = {
  [Sector.TECH]: ['量子计算', '元宇宙', '区块链', '人工智能', '云计算', '大数据', '物联网', '5G通信', '芯片设计', '网络安全'],
  [Sector.FINANCE]: ['数字银行', '智能投顾', '支付科技', '供应链金融', '保险科技', '信用评估', '财富管理', '跨境支付', '普惠金融', '量化交易'],
  [Sector.CONSUMER]: ['新零售', '社交电商', '内容电商', '直播带货', '私域流量', '社区团购', '跨境电商', '品牌孵化', '供应链优化', '会员经济'],
  [Sector.ENERGY]: ['新能源', '储能技术', '氢能源', '光伏发电', '风电技术', '智能电网', '碳交易', '节能减排', '绿色建筑', '循环经济'],
  [Sector.MEDICAL]: ['互联网医疗', '基因检测', '精准医疗', '远程医疗', '健康管理', '医疗器械', '生物制药', '数字疗法', '医疗AI', '慢病管理'],
  [Sector.MANUFACTURING]: ['智能制造', '工业互联网', '机器人', '3D打印', '数字孪生', '工业软件', '自动化设备', '供应链协同', '质量检测', '设备维护']
};

const SECTOR_PREFIXES = {
  [Sector.TECH]: ['智', '云', '数', '链', '元', '量', '芯', '网'],
  [Sector.FINANCE]: ['金', '融', '财', '信', '汇', '宝', '钱', '投'],
  [Sector.CONSUMER]: ['优', '好', '乐', '购', '享', '聚', '淘', '选'],
  [Sector.ENERGY]: ['绿', '清', '新', '能', '源', '光', '风', '氢'],
  [Sector.MEDICAL]: ['康', '医', '药', '健', '生', '疗', '护', '养'],
  [Sector.MANUFACTURING]: ['工', '制', '造', '智', '能', '技', '科', '创']
};

const SECTOR_SUFFIXES = ['科技', '网络', '集团', '控股', '股份', '有限公司', '智能', '数据', '平台', '系统'];

const BUSINESS_DECISIONS: Record<CompanyStage, BusinessDecision[]> = {
  [CompanyStage.SEED]: [
    {
      id: 'seed_product_mvp',
      type: BusinessDecisionType.PRODUCT_LAUNCH,
      title: '开发MVP产品',
      description: '开发最小可行产品(MVP)以验证市场需求',
      cost: 50000,
      impacts: [
        { type: DecisionImpact.INNOVATION, value: 20, duration: 90 },
        { type: DecisionImpact.RISK, value: 15, duration: 60 }
      ],
      executionTime: 60,
      successRate: 0.7,
      riskLevel: 'high'
    },
    {
      id: 'seed_market_research',
      type: BusinessDecisionType.MARKETING_CAMPAIGN,
      title: '市场调研',
      description: '深入了解目标市场和用户需求',
      cost: 20000,
      impacts: [
        { type: DecisionImpact.GROWTH, value: 10, duration: 120 },
        { type: DecisionImpact.RISK, value: -5, duration: 90 }
      ],
      executionTime: 30,
      successRate: 0.9,
      riskLevel: 'low'
    }
  ],
  [CompanyStage.ANGEL]: [
    {
      id: 'angel_team_expansion',
      type: BusinessDecisionType.TALENT_ACQUISITION,
      title: '核心团队扩张',
      description: '招聘关键岗位人才，组建核心团队',
      cost: 200000,
      impacts: [
        { type: DecisionImpact.INNOVATION, value: 15, duration: 180 },
        { type: DecisionImpact.GROWTH, value: 10, duration: 180 }
      ],
      executionTime: 90,
      successRate: 0.8,
      riskLevel: 'medium'
    },
    {
      id: 'angel_product_iteration',
      type: BusinessDecisionType.PRODUCT_LAUNCH,
      title: '产品迭代升级',
      description: '基于用户反馈优化产品功能',
      cost: 150000,
      impacts: [
        { type: DecisionImpact.BRAND, value: 15, duration: 120 },
        { type: DecisionImpact.GROWTH, value: 12, duration: 120 }
      ],
      executionTime: 60,
      successRate: 0.85,
      riskLevel: 'medium'
    }
  ],
  [CompanyStage.SERIES_A]: [
    {
      id: 'series_a_market_expansion',
      type: BusinessDecisionType.EXPANSION,
      title: '市场扩张',
      description: '扩大市场覆盖范围，进入新区域',
      cost: 1000000,
      impacts: [
        { type: DecisionImpact.REVENUE, value: 25, duration: 365 },
        { type: DecisionImpact.MARKET_SHARE, value: 20, duration: 365 }
      ],
      executionTime: 180,
      successRate: 0.75,
      riskLevel: 'high'
    },
    {
      id: 'series_a_r_d_investment',
      type: BusinessDecisionType.RD_INVESTMENT,
      title: '加大研发投入',
      description: '增加研发预算，提升技术竞争力',
      cost: 800000,
      impacts: [
        { type: DecisionImpact.INNOVATION, value: 30, duration: 365 },
        { type: DecisionImpact.RISK, value: 10, duration: 180 }
      ],
      executionTime: 365,
      successRate: 0.7,
      riskLevel: 'medium'
    }
  ],
  [CompanyStage.SERIES_B]: [
    {
      id: 'series_b_strategic_partnership',
      type: BusinessDecisionType.PARTNERSHIP,
      title: '战略合作',
      description: '与行业龙头企业建立战略合作关系',
      cost: 500000,
      impacts: [
        { type: DecisionImpact.BRAND, value: 25, duration: 365 },
        { type: DecisionImpact.MARKET_SHARE, value: 15, duration: 365 }
      ],
      executionTime: 120,
      successRate: 0.8,
      riskLevel: 'medium'
    },
    {
      id: 'series_b_tech_upgrade',
      type: BusinessDecisionType.TECHNOLOGY_UPGRADE,
      title: '技术升级',
      description: '升级核心技术架构，提升系统性能',
      cost: 1200000,
      impacts: [
        { type: DecisionImpact.INNOVATION, value: 35, duration: 365 },
        { type: DecisionImpact.RISK, value: 15, duration: 90 }
      ],
      executionTime: 180,
      successRate: 0.75,
      riskLevel: 'high'
    }
  ],
  [CompanyStage.SERIES_C]: [
    {
      id: 'series_c_international',
      type: BusinessDecisionType.INTERNATIONAL_EXPANSION,
      title: '国际化扩张',
      description: '拓展海外市场，建立国际业务',
      cost: 5000000,
      impacts: [
        { type: DecisionImpact.REVENUE, value: 40, duration: 730 },
        { type: DecisionImpact.BRAND, value: 30, duration: 730 }
      ],
      executionTime: 365,
      successRate: 0.6,
      riskLevel: 'high'
    },
    {
      id: 'series_c_ecosystem',
      type: BusinessDecisionType.EXPANSION,
      title: '生态建设',
      description: '构建产业生态系统，拓展业务边界',
      cost: 3000000,
      impacts: [
        { type: DecisionImpact.MARKET_SHARE, value: 25, duration: 730 },
        { type: DecisionImpact.GROWTH, value: 20, duration: 730 }
      ],
      executionTime: 365,
      successRate: 0.7,
      riskLevel: 'high'
    }
  ],
  [CompanyStage.PRE_IPO]: [
    {
      id: 'pre_ipo_brand_building',
      type: BusinessDecisionType.BRAND_BUILDING,
      title: '品牌建设',
      description: '加强品牌宣传，提升市场认知度',
      cost: 2000000,
      impacts: [
        { type: DecisionImpact.BRAND, value: 40, duration: 365 },
        { type: DecisionImpact.MARKET_SHARE, value: 15, duration: 365 }
      ],
      executionTime: 180,
      successRate: 0.85,
      riskLevel: 'low'
    },
    {
      id: 'pre_ipo_cost_optimization',
      type: BusinessDecisionType.COST_CUTTING,
      title: '成本优化',
      description: '优化运营成本，提升盈利能力',
      cost: 500000,
      impacts: [
        { type: DecisionImpact.PROFIT, value: 20, duration: 365 },
        { type: DecisionImpact.RISK, value: -10, duration: 180 }
      ],
      executionTime: 90,
      successRate: 0.9,
      riskLevel: 'low'
    }
  ],
  [CompanyStage.IPO]: [
    {
      id: 'ipo_innovation',
      type: BusinessDecisionType.RD_INVESTMENT,
      title: '持续创新',
      description: '保持技术领先，持续产品创新',
      cost: 10000000,
      impacts: [
        { type: DecisionImpact.INNOVATION, value: 50, duration: 365 },
        { type: DecisionImpact.GROWTH, value: 25, duration: 365 }
      ],
      executionTime: 365,
      successRate: 0.7,
      riskLevel: 'medium'
    }
  ]
};

const GROWTH_PATHS: Record<CompanyStage, CompanyGrowthPath> = {
  [CompanyStage.SEED]: {
    stage: CompanyStage.SEED,
    requiredMetrics: [
      { type: 'innovationScore', value: 30 },
      { type: 'marketShare', value: 0.1 }
    ],
    fundingNeeded: 500000,
    timeToNextStage: 180,
    risks: ['产品失败', '市场需求不足', '资金链断裂'],
    opportunities: ['获得天使投资', '验证商业模式', '建立初始用户群']
  },
  [CompanyStage.ANGEL]: {
    stage: CompanyStage.ANGEL,
    requiredMetrics: [
      { type: 'revenue', value: 1000000 },
      { type: 'customerSatisfaction', value: 70 }
    ],
    fundingNeeded: 2000000,
    timeToNextStage: 365,
    risks: ['竞争加剧', '团队不稳定', '产品迭代缓慢'],
    opportunities: ['获得A轮融资', '扩大市场份额', '建立品牌认知']
  },
  [CompanyStage.SERIES_A]: {
    stage: CompanyStage.SERIES_A,
    requiredMetrics: [
      { type: 'revenue', value: 10000000 },
      { type: 'growthRate', value: 50 }
    ],
    fundingNeeded: 10000000,
    timeToNextStage: 365,
    risks: ['市场扩张失败', '资金消耗过快', '管理能力不足'],
    opportunities: ['获得B轮融资', '建立行业地位', '拓展产品线']
  },
  [CompanyStage.SERIES_B]: {
    stage: CompanyStage.SERIES_B,
    requiredMetrics: [
      { type: 'revenue', value: 50000000 },
      { type: 'marketShare', value: 5 }
    ],
    fundingNeeded: 50000000,
    timeToNextStage: 365,
    risks: ['竞争激烈', '技术迭代', '监管变化'],
    opportunities: ['获得C轮融资', '战略合作', '生态建设']
  },
  [CompanyStage.SERIES_C]: {
    stage: CompanyStage.SERIES_C,
    requiredMetrics: [
      { type: 'revenue', value: 200000000 },
      { type: 'profit', value: 20000000 }
    ],
    fundingNeeded: 100000000,
    timeToNextStage: 365,
    risks: ['市场饱和', '增长放缓', '国际化风险'],
    opportunities: ['Pre-IPO融资', '国际化扩张', '行业整合']
  },
  [CompanyStage.PRE_IPO]: {
    stage: CompanyStage.PRE_IPO,
    requiredMetrics: [
      { type: 'revenue', value: 500000000 },
      { type: 'profit', value: 50000000 },
      { type: 'brandValue', value: 80 }
    ],
    fundingNeeded: 200000000,
    timeToNextStage: 180,
    risks: ['IPO失败', '估值下调', '市场环境变化'],
    opportunities: ['成功IPO', '股东退出', '品牌价值提升']
  },
  [CompanyStage.IPO]: {
    stage: CompanyStage.IPO,
    requiredMetrics: [
      { type: 'revenue', value: 1000000000 },
      { type: 'marketShare', value: 10 }
    ],
    fundingNeeded: 0,
    timeToNextStage: 0,
    risks: ['股价波动', '业绩压力', '监管审查'],
    opportunities: ['持续增长', '并购整合', '行业领导地位']
  }
};

export class StartupGenerator {
  private usedNames = new Set<string>();

  generateStartup(sector: Sector): StartupCompany {
    const name = this.generateCompanyName(sector);
    const stage = CompanyStage.SEED;
    const valuation = this.generateInitialValuation(sector);
    const sharesIssued = 1000000;
    const metrics = this.generateInitialMetrics(sector);

    return {
      id: this.generateId(),
      name,
      sector,
      stage,
      valuation,
      sharesIssued,
      investors: [],
      metrics,
      activeDecisions: [],
      history: [{
        timestamp: Date.now(),
        valuation,
        revenue: metrics.revenue,
        profit: metrics.profit
      }],
      marketEvents: [],
      milestones: this.generateInitialMilestones(stage),
      achievements: [],
      storyEvents: [],
      stageStartTime: Date.now(),
      totalDays: 0
    };
  }

  generateInvestmentOpportunity(company: StartupCompany, stage: CompanyStage): InvestmentOpportunity {
    const growthPath = GROWTH_PATHS[stage];
    const equityOffered = Math.min(30, Math.max(5, (growthPath.fundingNeeded / company.valuation) * 100));
    const minInvestment = growthPath.fundingNeeded * 0.01;
    const maxInvestment = growthPath.fundingNeeded * 0.5;

    return {
      id: this.generateId(),
      companyId: company.id,
      stage,
      targetAmount: growthPath.fundingNeeded,
      minInvestment,
      maxInvestment,
      valuation: company.valuation,
      equityOffered,
      description: `${company.name}正在进行${stage}融资，目标金额${this.formatCurrency(growthPath.fundingNeeded)}`,
      deadline: Date.now() + growthPath.timeToNextStage * 24 * 60 * 60 * 1000,
      requiredMetrics: growthPath.requiredMetrics
    };
  }

  getAvailableDecisions(stage: CompanyStage, company: StartupCompany): BusinessDecision[] {
    const decisions = BUSINESS_DECISIONS[stage] || [];
    return decisions.filter(decision => {
      if (decision.prerequisites) {
        return decision.prerequisites.every(prereq => {
          const completed = company.history.some(h => h.valuation > 0);
          return completed;
        });
      }
      return true;
    });
  }

  getGrowthPath(stage: CompanyStage): CompanyGrowthPath {
    return GROWTH_PATHS[stage];
  }

  canAdvanceToNextStage(company: StartupCompany): boolean {
    const currentPath = GROWTH_PATHS[company.stage];
    if (!currentPath || company.stage === CompanyStage.IPO) {
      return false;
    }

    return currentPath.requiredMetrics.every(req => {
      const metricValue = company.metrics[req.type as keyof CompanyMetrics] as number;
      return metricValue >= req.value;
    });
  }

  advanceToNextStage(company: StartupCompany): StartupCompany {
    if (!this.canAdvanceToNextStage(company)) {
      return company;
    }

    const stages = Object.values(CompanyStage);
    const currentIndex = stages.indexOf(company.stage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      const valuationMultiplier = 2 + Math.random();
      
      return {
        ...company,
        stage: nextStage,
        valuation: Math.floor(company.valuation * valuationMultiplier),
        history: [
          ...company.history,
          {
            timestamp: Date.now(),
            valuation: Math.floor(company.valuation * valuationMultiplier),
            revenue: company.metrics.revenue,
            profit: company.metrics.profit
          }
        ]
      };
    }

    return company;
  }

  private generateCompanyName(sector: Sector): string {
    const prefixes = SECTOR_PREFIXES[sector];
    const suffixes = SECTOR_SUFFIXES;
    const concepts = STARTUP_NAMES[sector];

    let name: string;
    let attempts = 0;

    do {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const concept = concepts[Math.floor(Math.random() * concepts.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      
      const patterns = [
        `${prefix}${concept}${suffix}`,
        `${concept}${prefix}${suffix}`,
        `${prefix}${concept}`,
        `${concept}${suffix}`
      ];
      
      name = patterns[Math.floor(Math.random() * patterns.length)];
      attempts++;
    } while (this.usedNames.has(name) && attempts < 50);

    this.usedNames.add(name);
    return name;
  }

  private generateInitialValuation(sector: Sector): number {
    const baseValuations = {
      [Sector.TECH]: [500000, 5000000],
      [Sector.FINANCE]: [300000, 3000000],
      [Sector.CONSUMER]: [200000, 2000000],
      [Sector.ENERGY]: [1000000, 10000000],
      [Sector.MEDICAL]: [800000, 8000000],
      [Sector.MANUFACTURING]: [600000, 6000000]
    };

    const [min, max] = baseValuations[sector];
    return Math.floor(min + Math.random() * (max - min));
  }

  private generateInitialMetrics(sector: Sector): CompanyMetrics {
    const baseMetrics = {
      [Sector.TECH]: { revenue: 100000, profit: -50000, growthRate: 100 },
      [Sector.FINANCE]: { revenue: 80000, profit: -30000, growthRate: 80 },
      [Sector.CONSUMER]: { revenue: 50000, profit: -20000, growthRate: 60 },
      [Sector.ENERGY]: { revenue: 200000, profit: -100000, growthRate: 40 },
      [Sector.MEDICAL]: { revenue: 150000, profit: -80000, growthRate: 70 },
      [Sector.MANUFACTURING]: { revenue: 120000, profit: -60000, growthRate: 50 }
    };

    const base = baseMetrics[sector];
    const variance = 0.2;

    return {
      revenue: Math.floor(base.revenue * (1 + (Math.random() - 0.5) * variance)),
      profit: Math.floor(base.profit * (1 + (Math.random() - 0.5) * variance)),
      marketShare: Math.random() * 0.5,
      brandValue: 20 + Math.random() * 30,
      innovationScore: 40 + Math.random() * 40,
      customerSatisfaction: 60 + Math.random() * 30,
      employeeCount: 5 + Math.floor(Math.random() * 20),
      cashFlow: -base.profit * 0.5,
      debtRatio: Math.random() * 0.3,
      growthRate: base.growthRate * (0.8 + Math.random() * 0.4)
    };
  }

  private generateId(): string {
    return `startup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatCurrency(value: number): string {
    if (value >= 100000000) {
      return `${(value / 100000000).toFixed(2)}亿`;
    } else if (value >= 10000) {
      return `${(value / 10000).toFixed(2)}万`;
    }
    return value.toString();
  }

  private generateInitialMilestones(stage: CompanyStage): Milestone[] {
    const milestoneDefinitions = this.getMilestoneDefinitions(stage);
    return milestoneDefinitions.map(def => ({
      ...def,
      achieved: false
    }));
  }

  private getMilestoneDefinitions(stage: CompanyStage): Milestone[] {
    const milestones: Record<CompanyStage, Milestone[]> = {
      [CompanyStage.SEED]: [
        {
          id: 'seed_first_revenue',
          title: '第一笔收入',
          description: '实现公司第一笔收入，验证商业模式',
          category: 'financial',
          requiredMetrics: [
            { type: 'revenue', value: 10000 }
          ],
          reward: { type: 'valuation_boost', value: 10 },
          achieved: false
        },
        {
          id: 'seed_first_customer',
          title: '首个付费用户',
          description: '获得第一个付费用户',
          category: 'market',
          requiredMetrics: [
            { type: 'customerSatisfaction', value: 60 }
          ],
          reward: { type: 'brand_boost', value: 5 },
          achieved: false
        },
        {
          id: 'seed_mvp_complete',
          title: 'MVP完成',
          description: '完成最小可行产品开发',
          category: 'innovation',
          requiredMetrics: [
            { type: 'innovationScore', value: 40 }
          ],
          reward: { type: 'innovation_boost', value: 10 },
          achieved: false
        }
      ],
      [CompanyStage.ANGEL]: [
        {
          id: 'angel_revenue_milestone',
          title: '营收突破',
          description: '年度营收达到100万',
          category: 'financial',
          requiredMetrics: [
            { type: 'revenue', value: 1000000 }
          ],
          reward: { type: 'revenue_boost', value: 20 },
          achieved: false
        },
        {
          id: 'angel_team_milestone',
          title: '团队扩张',
          description: '团队规模达到20人',
          category: 'social',
          requiredMetrics: [
            { type: 'employeeCount', value: 20 }
          ],
          reward: { type: 'innovation_boost', value: 15 },
          achieved: false
        },
        {
          id: 'angel_brand_milestone',
          title: '品牌建立',
          description: '品牌价值达到50',
          category: 'market',
          requiredMetrics: [
            { type: 'brandValue', value: 50 }
          ],
          reward: { type: 'brand_boost', value: 10 },
          achieved: false
        }
      ],
      [CompanyStage.SERIES_A]: [
        {
          id: 'series_a_revenue_milestone',
          title: '千万营收',
          description: '年度营收达到1000万',
          category: 'financial',
          requiredMetrics: [
            { type: 'revenue', value: 10000000 }
          ],
          reward: { type: 'revenue_boost', value: 30 },
          achieved: false
        },
        {
          id: 'series_a_profit_milestone',
          title: '首次盈利',
          description: '实现首次月度盈利',
          category: 'financial',
          requiredMetrics: [
            { type: 'profit', value: 0 }
          ],
          reward: { type: 'valuation_boost', value: 25 },
          achieved: false
        },
        {
          id: 'series_a_market_milestone',
          title: '市场份额',
          description: '市场份额达到2%',
          category: 'market',
          requiredMetrics: [
            { type: 'marketShare', value: 2 }
          ],
          reward: { type: 'market_share_boost', value: 15 },
          achieved: false
        }
      ],
      [CompanyStage.SERIES_B]: [
        {
          id: 'series_b_revenue_milestone',
          title: '五千万营收',
          description: '年度营收达到5000万',
          category: 'financial',
          requiredMetrics: [
            { type: 'revenue', value: 50000000 }
          ],
          reward: { type: 'revenue_boost', value: 40 },
          achieved: false
        },
        {
          id: 'series_b_profit_milestone',
          title: '千万利润',
          description: '年度利润达到1000万',
          category: 'financial',
          requiredMetrics: [
            { type: 'profit', value: 10000000 }
          ],
          reward: { type: 'valuation_boost', value: 35 },
          achieved: false
        },
        {
          id: 'series_b_team_milestone',
          title: '百人团队',
          description: '团队规模达到100人',
          category: 'social',
          requiredMetrics: [
            { type: 'employeeCount', value: 100 }
          ],
          reward: { type: 'innovation_boost', value: 20 },
          achieved: false
        }
      ],
      [CompanyStage.SERIES_C]: [
        {
          id: 'series_c_revenue_milestone',
          title: '两亿营收',
          description: '年度营收达到2亿',
          category: 'financial',
          requiredMetrics: [
            { type: 'revenue', value: 200000000 }
          ],
          reward: { type: 'revenue_boost', value: 50 },
          achieved: false
        },
        {
          id: 'series_c_market_milestone',
          title: '市场领导者',
          description: '市场份额达到5%',
          category: 'market',
          requiredMetrics: [
            { type: 'marketShare', value: 5 }
          ],
          reward: { type: 'market_share_boost', value: 25 },
          achieved: false
        },
        {
          id: 'series_c_brand_milestone',
          title: '知名品牌',
          description: '品牌价值达到80',
          category: 'market',
          requiredMetrics: [
            { type: 'brandValue', value: 80 }
          ],
          reward: { type: 'brand_boost', value: 20 },
          achieved: false
        }
      ],
      [CompanyStage.PRE_IPO]: [
        {
          id: 'pre_ipo_revenue_milestone',
          title: '五亿营收',
          description: '年度营收达到5亿',
          category: 'financial',
          requiredMetrics: [
            { type: 'revenue', value: 500000000 }
          ],
          reward: { type: 'revenue_boost', value: 60 },
          achieved: false
        },
        {
          id: 'pre_ipo_profit_milestone',
          title: '五千万利润',
          description: '年度利润达到5000万',
          category: 'financial',
          requiredMetrics: [
            { type: 'profit', value: 50000000 }
          ],
          reward: { type: 'valuation_boost', value: 45 },
          achieved: false
        },
        {
          id: 'pre_ipo_innovation_milestone',
          title: '行业标杆',
          description: '创新能力达到90',
          category: 'innovation',
          requiredMetrics: [
            { type: 'innovationScore', value: 90 }
          ],
          reward: { type: 'innovation_boost', value: 30 },
          achieved: false
        }
      ],
      [CompanyStage.IPO]: [
        {
          id: 'ipo_revenue_milestone',
          title: '十亿营收',
          description: '年度营收达到10亿',
          category: 'financial',
          requiredMetrics: [
            { type: 'revenue', value: 1000000000 }
          ],
          reward: { type: 'revenue_boost', value: 100 },
          achieved: false
        },
        {
          id: 'ipo_market_milestone',
          title: '行业龙头',
          description: '市场份额达到10%',
          category: 'market',
          requiredMetrics: [
            { type: 'marketShare', value: 10 }
          ],
          reward: { type: 'market_share_boost', value: 50 },
          achieved: false
        }
      ]
    };

    return milestones[stage] || [];
  }

  checkMilestones(company: StartupCompany): {
    updatedCompany: StartupCompany;
    newlyAchieved: Milestone[];
  } {
    const newlyAchieved: Milestone[] = [];
    const updatedMilestones = company.milestones.map(milestone => {
      if (milestone.achieved) return milestone;

      const allRequirementsMet = milestone.requiredMetrics.every(req => {
        const metricValue = company.metrics[req.type as keyof CompanyMetrics] as number;
        return metricValue >= req.value;
      });

      if (allRequirementsMet) {
        const achievedMilestone = {
          ...milestone,
          achieved: true,
          achievedAt: Date.now()
        };
        newlyAchieved.push(achievedMilestone);
        return achievedMilestone;
      }

      return milestone;
    });

    if (newlyAchieved.length > 0) {
      const updatedMetrics = { ...company.metrics };
      
      for (const milestone of newlyAchieved) {
        this.applyMilestoneReward(updatedMetrics, milestone.reward);
      }

      const newStoryEvents: CompanyStoryEvent[] = newlyAchieved.map(milestone => ({
        id: this.generateId(),
        timestamp: Date.now(),
        type: 'milestone',
        title: milestone.title,
        description: milestone.description,
        impact: {
          type: milestone.reward.type,
          value: milestone.reward.value
        }
      }));

      return {
        updatedCompany: {
          ...company,
          metrics: updatedMetrics,
          milestones: updatedMilestones,
          storyEvents: [...company.storyEvents, ...newStoryEvents]
        },
        newlyAchieved
      };
    }

    return {
      updatedCompany: company,
      newlyAchieved: []
    };
  }

  private applyMilestoneReward(metrics: CompanyMetrics, reward: Milestone['reward']): void {
    switch (reward.type) {
      case 'valuation_boost':
        break;
      case 'brand_boost':
        metrics.brandValue = Math.min(100, metrics.brandValue + reward.value);
        break;
      case 'innovation_boost':
        metrics.innovationScore = Math.min(100, metrics.innovationScore + reward.value);
        break;
      case 'market_share_boost':
        metrics.marketShare = Math.min(100, metrics.marketShare * (1 + reward.value / 100));
        break;
      case 'revenue_boost':
        metrics.revenue = Math.floor(metrics.revenue * (1 + reward.value / 100));
        break;
    }
  }

  checkAchievements(company: StartupCompany): {
    updatedCompany: StartupCompany;
    newlyUnlocked: CompanyAchievement[];
  } {
    const allAchievements = this.getAllAchievements();
    const newlyUnlocked: CompanyAchievement[] = [];

    for (const achievement of allAchievements) {
      if (company.achievements.some(a => a.id === achievement.id)) {
        continue;
      }

      if (this.isAchievementUnlocked(company, achievement)) {
        const unlockedAchievement = {
          ...achievement,
          achieved: true,
          achievedAt: Date.now()
        };
        newlyUnlocked.push(unlockedAchievement);
      }
    }

    if (newlyUnlocked.length > 0) {
      const newStoryEvents: CompanyStoryEvent[] = newlyUnlocked.map(achievement => ({
        id: this.generateId(),
        timestamp: Date.now(),
        type: 'achievement',
        title: achievement.title,
        description: achievement.description
      }));

      return {
        updatedCompany: {
          ...company,
          achievements: [...company.achievements, ...newlyUnlocked],
          storyEvents: [...company.storyEvents, ...newStoryEvents]
        },
        newlyUnlocked
      };
    }

    return {
      updatedCompany: company,
      newlyUnlocked: []
    };
  }

  private getAllAchievements(): Omit<CompanyAchievement, 'achieved' | 'achievedAt'>[] {
    return [
      {
        id: 'first_milestone',
        title: '初露锋芒',
        description: '达成第一个里程碑',
        icon: '🎯',
        rarity: 'common'
      },
      {
        id: 'growth_champion',
        title: '增长冠军',
        description: '增长率连续30天超过50%',
        icon: '🚀',
        rarity: 'rare'
      },
      {
        id: 'market_leader',
        title: '市场领导者',
        description: '市场份额达到10%',
        icon: '👑',
        rarity: 'epic'
      },
      {
        id: 'unicorn',
        title: '独角兽',
        description: '估值达到10亿美元',
        icon: '🦄',
        rarity: 'legendary'
      },
      {
        id: 'innovation_pioneer',
        title: '创新先锋',
        description: '创新能力达到95',
        icon: '💡',
        rarity: 'epic'
      },
      {
        id: 'profit_master',
        title: '盈利大师',
        description: '连续12个月实现盈利',
        icon: '💰',
        rarity: 'rare'
      },
      {
        id: 'brand_icon',
        title: '品牌标杆',
        description: '品牌价值达到95',
        icon: '⭐',
        rarity: 'epic'
      },
      {
        id: 'decacorn',
        title: '十角兽',
        description: '估值达到100亿美元',
        icon: '🌟',
        rarity: 'legendary'
      }
    ];
  }

  private isAchievementUnlocked(company: StartupCompany, achievement: Omit<CompanyAchievement, 'achieved' | 'achievedAt'>): boolean {
    switch (achievement.id) {
      case 'first_milestone':
        return company.milestones.some(m => m.achieved);
      case 'growth_champion':
        return company.metrics.growthRate >= 50 && company.totalDays >= 30;
      case 'market_leader':
        return company.metrics.marketShare >= 10;
      case 'unicorn':
        return company.valuation >= 1000000000;
      case 'innovation_pioneer':
        return company.metrics.innovationScore >= 95;
      case 'profit_master':
        return company.metrics.profit > 0 && company.totalDays >= 360;
      case 'brand_icon':
        return company.metrics.brandValue >= 95;
      case 'decacorn':
        return company.valuation >= 10000000000;
      default:
        return false;
    }
  }

  calculateGrowthProgress(company: StartupCompany): GrowthProgress {
    const currentPath = GROWTH_PATHS[company.stage];
    const achievedMilestones = company.milestones.filter(m => m.achieved).length;
    const totalMilestones = company.milestones.length;
    const unlockedAchievements = company.achievements.length;
    const totalAchievements = this.getAllAchievements().length;

    let stageProgress = 0;
    if (currentPath && currentPath.requiredMetrics.length > 0) {
      const metRequirements = currentPath.requiredMetrics.filter(req => {
        const metricValue = company.metrics[req.type as keyof CompanyMetrics] as number;
        return metricValue >= req.value;
      }).length;
      stageProgress = (metRequirements / currentPath.requiredMetrics.length) * 100;
    }

    const daysInCurrentStage = Math.floor((Date.now() - company.stageStartTime) / (24 * 60 * 60 * 1000));
    const estimatedDaysToNextStage = currentPath ? Math.max(0, currentPath.timeToNextStage - daysInCurrentStage) : 0;

    return {
      currentStage: company.stage,
      stageProgress,
      nextStageProgress: stageProgress,
      milestonesAchieved: achievedMilestones,
      totalMilestones,
      achievementsUnlocked: unlockedAchievements,
      totalAchievements,
      daysInCurrentStage,
      estimatedDaysToNextStage
    };
  }

  addStoryEvent(company: StartupCompany, event: Omit<CompanyStoryEvent, 'id' | 'timestamp'>): StartupCompany {
    const newEvent: CompanyStoryEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...event
    };

    return {
      ...company,
      storyEvents: [newEvent, ...company.storyEvents].slice(0, 50)
    };
  }

  updateDailyProgress(company: StartupCompany): StartupCompany {
    const updatedCompany = { ...company, totalDays: company.totalDays + 1 };
    
    const { updatedCompany: companyAfterMilestones, newlyAchieved } = this.checkMilestones(updatedCompany);
    const { updatedCompany: companyAfterAchievements, newlyUnlocked } = this.checkAchievements(companyAfterMilestones);

    return companyAfterAchievements;
  }
}

export const startupGenerator = new StartupGenerator();
