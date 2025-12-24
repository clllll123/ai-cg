import { EventService } from '../../services/eventService';
import { getAIService } from '../../services/aiService';
import { Sector } from '../../types';

// Mock AI服务
jest.mock('../../services/aiService', () => ({
  getAIService: jest.fn()
}));

const mockAIService = {
  generateText: jest.fn()
};

describe('EventService', () => {
  let eventService: EventService;

  beforeEach(() => {
    (getAIService as jest.Mock).mockReturnValue(mockAIService);
    eventService = new EventService();
    jest.clearAllMocks();
  });

  describe('generateDailyEvent', () => {
    it('should generate daily event successfully', async () => {
      const mockResponse = {
        content: `央行降准释放流动性

中国人民银行宣布下调存款准备金率0.5个百分点，预计释放长期资金约1万亿元。这一政策将有效缓解市场流动性压力，对金融板块形成利好。`
      };
      
      mockAIService.generateText.mockResolvedValue(mockResponse);

      const result = await eventService.generateDailyEvent(
        'MORNING',
        0.5,
        [Sector.FINANCE, Sector.TECH]
      );

      expect(result).toBeDefined();
      expect(result.title).toBe('央行降准释放流动性');
      expect(result.description).toContain('中国人民银行宣布下调存款准备金率');
      expect(result.effects.length).toBeGreaterThan(0);
      expect(result.triggerCondition).toBe('MORNING');
    });

    it('should handle AI service failure and return default event', async () => {
      mockAIService.generateText.mockRejectedValue(new Error('AI service unavailable'));

      const result = await eventService.generateDailyEvent(
        'AFTERNOON',
        -0.2,
        [Sector.TECH]
      );

      expect(result).toBeDefined();
      expect(result.id).toContain('default_event');
      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.effects.length).toBe(1);
      expect(result.triggerCondition).toBe('AFTERNOON');
    });

    it('should generate appropriate prompt based on market conditions', async () => {
      const mockResponse = {
        content: '测试事件内容'
      };
      
      mockAIService.generateText.mockResolvedValue(mockResponse);

      await eventService.generateDailyEvent('MORNING', 0.8, [Sector.ENERGY]);

      expect(mockAIService.generateText).toHaveBeenCalledWith(
        expect.stringContaining('早盘'),
        expect.stringContaining('上涨')
      );
    });
  });

  describe('parseEventFromAIResponse', () => {
    it('should parse event with title and description', () => {
      const content = `科技巨头发布重磅产品

全球知名科技公司今日发布革命性新产品，预计将带动整个科技板块上涨。产品性能远超市场预期，投资者信心大增。`;

      // 使用反射调用私有方法
      const result = (eventService as any).parseEventFromAIResponse(
        content,
        'MORNING',
        0.3,
        [Sector.TECH]
      );

      expect(result.title).toBe('科技巨头发布重磅产品');
      expect(result.description).toContain('全球知名科技公司');
      expect(result.newsFlash).toContain('【快讯】');
    });

    it('should handle content without clear title', () => {
      const content = '今日市场出现重大变化，受国际局势影响，能源价格大幅波动。投资者需要密切关注市场动态，做好风险控制，确保投资安全。';

      const result = (eventService as any).parseEventFromAIResponse(
        content,
        'MORNING',
        0.5,
        [Sector.ENERGY]
      );

      // 由于第一行长度超过50个字符，应该使用默认标题
      expect(result.title).toBe('市场重大事件');
      expect(result.description).toBe(content);
    });
  });

  describe('generateEffectsFromContent', () => {
    it('should generate positive market sentiment effect', () => {
      const content = '政策利好，市场预期上涨';

      const result = (eventService as any).generateEffectsFromContent(
        content,
        0.5,
        [Sector.FINANCE]
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('MARKET_SENTIMENT');
      expect(result[0].value).toBeGreaterThan(0);
    });

    it('should generate negative market sentiment effect', () => {
      const content = '利空消息，市场可能下跌';

      const result = (eventService as any).generateEffectsFromContent(
        content,
        -0.3,
        [Sector.REAL_ESTATE]
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('MARKET_SENTIMENT');
      expect(result[0].value).toBeLessThan(0);
    });

    it('should generate sector-specific effects', () => {
      const content = '科技板块迎来重大利好，新能源行业政策支持';

      const result = (eventService as any).generateEffectsFromContent(
        content,
        0.2,
        [Sector.TECH, Sector.ENERGY]
      );

      const sectorEffects = result.filter((effect: any) => 
        effect.type === 'SECTOR_BOOST' || effect.type === 'SECTOR_CRASH'
      );

      expect(sectorEffects.length).toBeGreaterThan(0);
      expect(sectorEffects.some((effect: any) => effect.target === Sector.TECH)).toBe(true);
      expect(sectorEffects.some((effect: any) => effect.target === Sector.ENERGY)).toBe(true);
    });

    it('should generate volatility effect when no specific effects detected', () => {
      const content = '市场出现不确定性因素';

      const result = (eventService as any).generateEffectsFromContent(
        content,
        0,
        []
      );

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('VOLATILITY_CHANGE');
      expect(result[0].value).toBeGreaterThan(0);
    });
  });

  describe('applyEventEffects', () => {
    it('should apply market sentiment effect to all stocks', () => {
      const stocks = [
        { id: '1', price: 100, volatility: 0.1, sector: Sector.TECH },
        { id: '2', price: 50, volatility: 0.2, sector: Sector.FINANCE }
      ];

      const event = {
        id: 'test-event',
        title: '测试事件',
        description: '测试描述',
        effects: [{
          type: 'MARKET_SENTIMENT' as const,
          value: 0.1,
          description: '市场情绪积极'
        }],
        newsFlash: '测试快讯',
        triggerCondition: 'MORNING' as const
      };

      const result = eventService.applyEventEffects(stocks, event);

      expect(result[0].price).toBeCloseTo(110); // 100 * 1.1
      expect(result[1].price).toBeCloseTo(55);  // 50 * 1.1
      expect(result[0].volatility).toBeGreaterThan(0.1);
      expect(result[1].volatility).toBeGreaterThan(0.2);
    });

    it('should apply sector-specific effects only to target sector', () => {
      const stocks = [
        { id: '1', price: 100, volatility: 0.1, sector: Sector.TECH },
        { id: '2', price: 50, volatility: 0.2, sector: Sector.FINANCE }
      ];

      const event = {
        id: 'test-event',
        title: '测试事件',
        description: '测试描述',
        effects: [{
          type: 'SECTOR_BOOST' as const,
          target: Sector.TECH,
          value: 0.2,
          description: '科技板块利好'
        }],
        newsFlash: '测试快讯',
        triggerCondition: 'MORNING' as const
      };

      const result = eventService.applyEventEffects(stocks, event);

      expect(result[0].price).toBeCloseTo(120); // 100 * 1.2 (科技板块)
      expect(result[1].price).toBe(50);         // 50 (金融板块不受影响)
    });

    it('should apply volatility change effect', () => {
      const stocks = [
        { id: '1', price: 100, volatility: 0.1, sector: Sector.TECH }
      ];

      const event = {
        id: 'test-event',
        title: '测试事件',
        description: '测试描述',
        effects: [{
          type: 'VOLATILITY_CHANGE' as const,
          value: 0.3,
          description: '波动性增加'
        }],
        newsFlash: '测试快讯',
        triggerCondition: 'MORNING' as const
      };

      const result = eventService.applyEventEffects(stocks, event);

      expect(result[0].price).toBe(100); // 价格不变
      expect(result[0].volatility).toBeCloseTo(0.13); // 0.1 * 1.3
    });

    it('should apply multiple effects correctly', () => {
      const stocks = [
        { id: '1', price: 100, volatility: 0.1, sector: Sector.TECH }
      ];

      const event = {
        id: 'test-event',
        title: '测试事件',
        description: '测试描述',
        effects: [
          {
            type: 'MARKET_SENTIMENT' as const,
            value: 0.1,
            description: '市场情绪积极'
          },
          {
            type: 'SECTOR_BOOST' as const,
            target: Sector.TECH,
            value: 0.2,
            description: '科技板块利好'
          }
        ],
        newsFlash: '测试快讯',
        triggerCondition: 'MORNING' as const
      };

      const result = eventService.applyEventEffects(stocks, event);

      // 价格应该先应用市场情绪，再应用板块利好
      expect(result[0].price).toBeCloseTo(132); // 100 * 1.1 * 1.2
      expect(result[0].volatility).toBeGreaterThan(0.1);
    });
  });
});