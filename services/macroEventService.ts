import { MacroEvent, MarketCondition } from '../types/startup';
import { Sector } from '../types';

const MACRO_EVENT_TEMPLATES = {
  economic: [
    {
      title: '央行降息',
      description: '央行宣布下调基准利率，市场流动性增加',
      impacts: [
        { type: 'interest_rate', value: -0.25 },
        { type: 'market_sentiment', value: 0.15 }
      ],
      affectedSectors: ['金融/银行', '房地产/基建', '高端制造'],
      severity: 'medium' as const
    },
    {
      title: 'GDP增长超预期',
      description: '最新经济数据显示GDP增长超过预期，经济复苏强劲',
      impacts: [
        { type: 'gdpGrowth', value: 0.5 },
        { type: 'market_sentiment', value: 0.2 }
      ],
      affectedSectors: ['大消费/食品', '高端制造', '物流/运输'],
      severity: 'medium' as const
    },
    {
      title: '通胀压力上升',
      description: '通胀数据超出预期，市场担忧货币政策收紧',
      impacts: [
        { type: 'inflation', value: 0.3 },
        { type: 'market_sentiment', value: -0.1 }
      ],
      affectedSectors: ['大消费/食品', '农业/养殖'],
      severity: 'medium' as const
    },
    {
      title: '经济衰退担忧',
      description: '多项经济指标显示经济增速放缓，市场避险情绪升温',
      impacts: [
        { type: 'gdpGrowth', value: -0.3 },
        { type: 'market_sentiment', value: -0.25 }
      ],
      affectedSectors: ['互联网/科技', '新能源/造车', '高端制造'],
      severity: 'high' as const
    }
  ],
  policy: [
    {
      title: '产业扶持政策出台',
      description: '政府发布新的产业扶持政策，相关行业迎来发展机遇',
      impacts: [
        { type: 'sector_performance', target: '互联网/科技', value: 0.2 },
        { type: 'market_sentiment', value: 0.1 }
      ],
      affectedSectors: ['互联网/科技', '高端制造'],
      severity: 'medium' as const
    },
    {
      title: '反垄断调查启动',
      description: '监管部门启动反垄断调查，大型平台企业面临监管压力',
      impacts: [
        { type: 'sector_performance', target: '互联网/科技', value: -0.15 },
        { type: 'volatility', value: 0.3 }
      ],
      affectedSectors: ['互联网/科技'],
      severity: 'high' as const
    },
    {
      title: '碳中和政策加码',
      description: '政府加大碳中和政策力度，新能源行业迎来重大利好',
      impacts: [
        { type: 'sector_performance', target: '新能源/造车', value: 0.25 },
        { type: 'sector_performance', target: '农业/养殖', value: 0.1 }
      ],
      affectedSectors: ['新能源/造车', '农业/养殖'],
      severity: 'medium' as const
    },
    {
      title: '房地产调控收紧',
      description: '房地产调控政策进一步收紧，房地产行业面临压力',
      impacts: [
        { type: 'sector_performance', target: '房地产/基建', value: -0.2 },
        { type: 'sector_performance', target: '金融/银行', value: -0.1 }
      ],
      affectedSectors: ['房地产/基建', '金融/银行'],
      severity: 'high' as const
    }
  ],
  international: [
    {
      title: '国际贸易摩擦升级',
      description: '国际贸易摩擦加剧，出口企业面临不确定性',
      impacts: [
        { type: 'currency', value: -0.05 },
        { type: 'market_sentiment', value: -0.15 }
      ],
      affectedSectors: ['高端制造', '物流/运输', '大消费/食品'],
      severity: 'high' as const
    },
    {
      title: '国际油价大幅波动',
      description: '国际油价出现大幅波动，能源行业受到影响',
      impacts: [
        { type: 'inflation', value: 0.2 },
        { type: 'sector_performance', target: '新能源/造车', value: 0.15 }
      ],
      affectedSectors: ['新能源/造车', '农业/养殖'],
      severity: 'medium' as const
    },
    {
      title: '全球科技合作深化',
      description: '国际科技合作取得新进展，科技行业迎来发展机遇',
      impacts: [
        { type: 'sector_performance', target: '互联网/科技', value: 0.2 },
        { type: 'sector_performance', target: '生物医药', value: 0.15 }
      ],
      affectedSectors: ['互联网/科技', '生物医药'],
      severity: 'medium' as const
    },
    {
      title: '全球供应链重构',
      description: '全球供应链正在重构，制造业面临新的机遇与挑战',
      impacts: [
        { type: 'sector_performance', target: '高端制造', value: 0.1 },
        { type: 'sector_performance', target: '物流/运输', value: 0.15 }
      ],
      affectedSectors: ['高端制造', '物流/运输'],
      severity: 'medium' as const
    }
  ],
  technology: [
    {
      title: '重大技术突破',
      description: '某领域取得重大技术突破，相关行业迎来革命性变化',
      impacts: [
        { type: 'sector_performance', target: '互联网/科技', value: 0.3 },
        { type: 'volatility', value: 0.4 }
      ],
      affectedSectors: ['互联网/科技', '生物医药'],
      severity: 'high' as const
    },
    {
      title: 'AI技术商业化加速',
      description: '人工智能技术商业化进程加速，多个行业迎来变革',
      impacts: [
        { type: 'sector_performance', target: '互联网/科技', value: 0.25 },
        { type: 'sector_performance', target: '金融/银行', value: 0.1 }
      ],
      affectedSectors: ['互联网/科技', '金融/银行', '高端制造'],
      severity: 'medium' as const
    },
    {
      title: '5G网络全面铺开',
      description: '5G网络建设全面铺开，相关产业迎来发展机遇',
      impacts: [
        { type: 'sector_performance', target: '互联网/科技', value: 0.2 },
        { type: 'sector_performance', target: '电子游戏', value: 0.15 }
      ],
      affectedSectors: ['互联网/科技', '电子游戏', '高端制造'],
      severity: 'medium' as const
    },
    {
      title: '量子计算取得进展',
      description: '量子计算技术取得重要进展，科技行业迎来新机遇',
      impacts: [
        { type: 'sector_performance', target: '互联网/科技', value: 0.2 },
        { type: 'sector_performance', target: '金融/银行', value: 0.1 }
      ],
      affectedSectors: ['互联网/科技', '金融/银行'],
      severity: 'medium' as const
    }
  ],
  social: [
    {
      title: '消费升级趋势明显',
      description: '居民消费升级趋势明显，高品质消费需求增长',
      impacts: [
        { type: 'sector_performance', target: '大消费/食品', value: 0.2 },
        { type: 'sector_performance', target: '潮玩/手办', value: 0.15 }
      ],
      affectedSectors: ['大消费/食品', '潮玩/手办'],
      severity: 'medium' as const
    },
    {
      title: '人口老龄化加速',
      description: '人口老龄化进程加速，医疗健康行业迎来发展机遇',
      impacts: [
        { type: 'sector_performance', target: '生物医药', value: 0.25 },
        { type: 'sector_performance', target: '大消费/食品', value: 0.1 }
      ],
      affectedSectors: ['生物医药', '大消费/食品'],
      severity: 'medium' as const
    },
    {
      title: 'Z世代消费崛起',
      description: 'Z世代成为消费主力，新兴消费品牌快速崛起',
      impacts: [
        { type: 'sector_performance', target: '潮玩/手办', value: 0.25 },
        { type: 'sector_performance', target: '电子游戏', value: 0.2 }
      ],
      affectedSectors: ['潮玩/手办', '电子游戏'],
      severity: 'medium' as const
    },
    {
      title: '健康意识提升',
      description: '居民健康意识显著提升，健康相关产业快速发展',
      impacts: [
        { type: 'sector_performance', target: '生物医药', value: 0.2 },
        { type: 'sector_performance', target: '大消费/食品', value: 0.15 }
      ],
      affectedSectors: ['生物医药', '大消费/食品', '农业/养殖'],
      severity: 'medium' as const
    }
  ]
};

const NEWS_FLASH_TEMPLATES = {
  economic: [
    '突发！央行宣布降息25个基点，市场流动性大幅增加',
    '重磅！GDP增长超预期，经济复苏势头强劲',
    '预警！通胀数据超出预期，市场担忧加剧',
    '关注！经济指标显示增速放缓，市场避险情绪升温'
  ],
  policy: [
    '利好！政府发布产业扶持政策，相关行业迎来春天',
    '突发！监管部门启动反垄断调查，科技股承压',
    '重磅！碳中和政策加码，新能源板块大涨',
    '关注！房地产调控政策收紧，地产股承压'
  ],
  international: [
    '突发！国际贸易摩擦升级，出口企业面临挑战',
    '关注！国际油价大幅波动，能源板块震荡',
    '利好！国际科技合作深化，科技股迎来机遇',
    '关注！全球供应链重构，制造业迎来新机遇'
  ],
  technology: [
    '重磅！重大技术突破，相关行业迎来革命性变化',
    '关注！AI技术商业化加速，多行业迎来变革',
    '利好！5G网络全面铺开，相关产业迎来发展机遇',
    '关注！量子计算取得进展，科技行业迎来新机遇'
  ],
  social: [
    '关注！消费升级趋势明显，高品质消费需求增长',
    '利好！人口老龄化加速，医疗健康行业迎来机遇',
    '关注！Z世代消费崛起，新兴消费品牌快速成长',
    '利好！健康意识提升，健康相关产业快速发展'
  ]
};

export class MacroEventService {
  private activeEvents: Map<string, MacroEvent> = new Map();
  private eventHistory: MacroEvent[] = [];
  private marketCondition: MarketCondition = {
    overallSentiment: 0,
    volatilityIndex: 0.2,
    interestRate: 0.05,
    inflationRate: 0.03,
    gdpGrowth: 0.06,
    sectorPerformance: {},
    activeEvents: []
  };

  generateRandomEvent(): MacroEvent | null {
    const eventTypes = Object.keys(MACRO_EVENT_TEMPLATES) as Array<keyof typeof MACRO_EVENT_TEMPLATES>;
    const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const templates = MACRO_EVENT_TEMPLATES[randomType];
    const template = templates[Math.floor(Math.random() * templates.length)];

    const event: MacroEvent = {
      id: this.generateEventId(),
      title: template.title,
      description: template.description,
      type: randomType,
      severity: template.severity,
      startTime: Date.now(),
      duration: this.getDurationBySeverity(template.severity),
      affectedSectors: template.affectedSectors,
      impacts: template.impacts.map(impact => ({
        ...impact,
        value: impact.value * (0.8 + Math.random() * 0.4)
      })),
      newsFlash: NEWS_FLASH_TEMPLATES[randomType][Math.floor(Math.random() * NEWS_FLASH_TEMPLATES[randomType].length)]
    };

    return event;
  }

  applyEvent(event: MacroEvent): void {
    this.activeEvents.set(event.id, event);
    this.eventHistory.push(event);
    this.updateMarketCondition(event);
  }

  removeEvent(eventId: string): void {
    const event = this.activeEvents.get(eventId);
    if (event) {
      this.revertEventEffects(event);
      this.activeEvents.delete(eventId);
    }
  }

  updateMarketCondition(event: MacroEvent): void {
    for (const impact of event.impacts) {
      switch (impact.type) {
        case 'market_sentiment':
          this.marketCondition.overallSentiment += impact.value;
          break;
        case 'sector_performance':
          if (impact.target) {
            this.marketCondition.sectorPerformance[impact.target] = 
              (this.marketCondition.sectorPerformance[impact.target] || 0) + impact.value;
          }
          break;
        case 'interest_rate':
          this.marketCondition.interestRate += impact.value;
          break;
        case 'inflation':
          this.marketCondition.inflationRate += impact.value;
          break;
        case 'gdpGrowth':
          this.marketCondition.gdpGrowth += impact.value;
          break;
        case 'volatility':
          this.marketCondition.volatilityIndex += impact.value;
          break;
      }
    }

    this.marketCondition.activeEvents = Array.from(this.activeEvents.keys());
  }

  revertEventEffects(event: MacroEvent): void {
    for (const impact of event.impacts) {
      switch (impact.type) {
        case 'market_sentiment':
          this.marketCondition.overallSentiment -= impact.value;
          break;
        case 'sector_performance':
          if (impact.target) {
            this.marketCondition.sectorPerformance[impact.target] = 
              (this.marketCondition.sectorPerformance[impact.target] || 0) - impact.value;
          }
          break;
        case 'interest_rate':
          this.marketCondition.interestRate -= impact.value;
          break;
        case 'inflation':
          this.marketCondition.inflationRate -= impact.value;
          break;
        case 'gdpGrowth':
          this.marketCondition.gdpGrowth -= impact.value;
          break;
        case 'volatility':
          this.marketCondition.volatilityIndex -= impact.value;
          break;
      }
    }

    this.marketCondition.activeEvents = Array.from(this.activeEvents.keys());
  }

  getSectorImpact(sector: string): number {
    let totalImpact = this.marketCondition.overallSentiment;
    
    for (const event of this.activeEvents.values()) {
      for (const impact of event.impacts) {
        if (impact.type === 'sector_performance' && impact.target === sector) {
          totalImpact += impact.value;
        }
      }
    }

    return totalImpact;
  }

  getVolatilityMultiplier(): number {
    const baseVolatility = 1.0;
    const eventVolatility = this.marketCondition.volatilityIndex;
    return baseVolatility + eventVolatility;
  }

  getMarketCondition(): MarketCondition {
    return { ...this.marketCondition };
  }

  getActiveEvents(): MacroEvent[] {
    return Array.from(this.activeEvents.values());
  }

  getEventHistory(): MacroEvent[] {
    return [...this.eventHistory];
  }

  update(): void {
    const now = Date.now();
    const expiredEvents: string[] = [];

    for (const [eventId, event] of this.activeEvents) {
      if (now - event.startTime > event.duration) {
        expiredEvents.push(eventId);
      }
    }

    for (const eventId of expiredEvents) {
      this.removeEvent(eventId);
    }
  }

  reset(): void {
    this.activeEvents.clear();
    this.eventHistory = [];
    this.marketCondition = {
      overallSentiment: 0,
      volatilityIndex: 0.2,
      interestRate: 0.05,
      inflationRate: 0.03,
      gdpGrowth: 0.06,
      sectorPerformance: {},
      activeEvents: []
    };
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDurationBySeverity(severity: MacroEvent['severity']): number {
    const durations = {
      low: 24 * 60 * 60 * 1000,
      medium: 48 * 60 * 60 * 1000,
      high: 72 * 60 * 60 * 1000,
      extreme: 96 * 60 * 60 * 1000
    };
    return durations[severity];
  }
}

export const macroEventService = new MacroEventService();
