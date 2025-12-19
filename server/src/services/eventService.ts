import { DailyEvent, EventEffect, Sector } from '../types';
import { getAIService } from './aiService';

/**
 * 一日大事件服务
 * 生成影响股市的全局事件
 */
export class EventService {
    private aiService;

    constructor() {
        this.aiService = getAIService();
    }

    /**
     * 根据当前市场情况生成大事件
     */
    async generateDailyEvent(
        currentTime: 'MORNING' | 'AFTERNOON',
        marketTrend: number, // 市场整体趋势 (-1 到 1)
        activeSectors: Sector[]
    ): Promise<DailyEvent> {
        const systemPrompt = `你是一个专业的财经分析师，需要为模拟股市游戏生成"一日大事件"。

要求：
1. 事件标题要吸引人，具有新闻感
2. 事件描述要详细，包含具体影响
3. 根据当前时段（${currentTime === 'MORNING' ? '早盘' : '尾盘'}）和市场趋势（${marketTrend > 0 ? '上涨' : marketTrend < 0 ? '下跌' : '震荡'}）生成合适的事件
4. 事件要真实可信，符合财经逻辑
5. 用中文输出

事件类型参考：
- 政策利好/利空
- 行业重大新闻
- 国际事件影响
- 公司重大公告
- 市场情绪变化

请生成一个完整的财经事件。`;

        const userPrompt = `当前市场情况：
- 时段：${currentTime === 'MORNING' ? '早盘' : '尾盘'}
- 市场趋势：${marketTrend > 0 ? '上涨' : marketTrend < 0 ? '下跌' : '震荡'}
- 活跃板块：${activeSectors.join('、')}

请生成一个影响股市的"一日大事件"。`;

        try {
            const response = await this.aiService.generateText(userPrompt, systemPrompt);
            const eventContent = response.content;

            // 解析AI返回的内容，提取事件信息
            return this.parseEventFromAIResponse(eventContent, currentTime, marketTrend, activeSectors);
        } catch (error) {
            console.error('生成大事件失败:', error);
            // 返回默认事件
            return this.generateDefaultEvent(currentTime, marketTrend);
        }
    }

    /**
     * 解析AI返回的事件内容
     */
    private parseEventFromAIResponse(
        content: string,
        currentTime: 'MORNING' | 'AFTERNOON',
        marketTrend: number,
        activeSectors: Sector[]
    ): DailyEvent {
        // 简单解析逻辑，实际应用中需要更复杂的NLP处理
        const lines = content.split('\n').filter(line => line.trim());
        
        let title = '市场重大事件';
        let description = content;
        let newsFlash = '【快讯】' + (lines[0] || '市场出现重大变化');

        // 尝试提取标题
        if (lines.length > 0) {
            const firstLine = lines[0];
            if (firstLine.includes('：') || firstLine.includes(':') || firstLine.length < 50) {
                title = firstLine.replace(/[：:].*$/, '').trim();
                description = lines.slice(1).join('\n');
            }
        }

        // 根据内容生成事件效果
        const effects = this.generateEffectsFromContent(content, marketTrend, activeSectors);

        return {
            id: `event_${Date.now()}`,
            title: title || '一日大事件',
            description: description || '市场出现重大变化，请密切关注',
            effects,
            newsFlash: newsFlash || '市场出现重大变化',
            triggerCondition: currentTime
        };
    }

    /**
     * 根据事件内容生成具体影响效果
     */
    private generateEffectsFromContent(
        content: string,
        marketTrend: number,
        activeSectors: Sector[]
    ): EventEffect[] {
        const effects: EventEffect[] = [];
        const lowerContent = content.toLowerCase();

        // 分析内容关键词，生成相应效果
        if (lowerContent.includes('利好') || lowerContent.includes('上涨') || lowerContent.includes('增长')) {
            effects.push({
                type: 'MARKET_SENTIMENT',
                value: 0.1 + Math.random() * 0.2, // 10%-30% 正面情绪
                description: '市场情绪积极，投资者信心增强'
            });
        }

        if (lowerContent.includes('利空') || lowerContent.includes('下跌') || lowerContent.includes('下滑')) {
            effects.push({
                type: 'MARKET_SENTIMENT',
                value: -0.1 - Math.random() * 0.2, // 10%-30% 负面情绪
                description: '市场情绪谨慎，投资者观望情绪浓厚'
            });
        }

        // 检测特定板块关键词
        const sectorKeywords: { [key: string]: Sector } = {
            '科技': Sector.TECH,
            '新能源': Sector.ENERGY,
            '消费': Sector.CONSUMER,
            '房地产': Sector.REAL_ESTATE,
            '医药': Sector.MEDICAL,
            '游戏': Sector.GAME,
            '金融': Sector.FINANCE
        };

        for (const [keyword, sector] of Object.entries(sectorKeywords)) {
            if (content.includes(keyword)) {
                const isPositive = lowerContent.includes('利好') || lowerContent.includes('上涨');
                effects.push({
                    type: isPositive ? 'SECTOR_BOOST' : 'SECTOR_CRASH',
                    target: sector,
                    value: isPositive ? 0.15 + Math.random() * 0.1 : -0.15 - Math.random() * 0.1,
                    description: `${sector}板块受到${isPositive ? '利好' : '利空'}影响`
                });
            }
        }

        // 如果没有检测到具体效果，生成一个基于市场趋势的默认效果
        if (effects.length === 0) {
            effects.push({
                type: 'VOLATILITY_CHANGE',
                value: 0.2 + Math.random() * 0.3, // 增加20%-50%波动性
                description: '市场不确定性增加，波动性上升'
            });
        }

        return effects;
    }

    /**
     * 生成默认事件（备用方案）
     */
    private generateDefaultEvent(
        currentTime: 'MORNING' | 'AFTERNOON',
        marketTrend: number
    ): DailyEvent {
        const morningEvents = [
            {
                title: '央行发布货币政策报告',
                description: '央行今日发布货币政策执行报告，强调保持流动性合理充裕，市场预期货币政策将保持稳健中性。',
                effectType: 'MARKET_SENTIMENT' as const,
                effectValue: marketTrend > 0 ? 0.1 : -0.05
            },
            {
                title: '国际油价大幅波动',
                description: '受国际局势影响，原油价格出现大幅波动，能源板块或将受到影响。',
                effectType: 'SECTOR_BOOST' as const,
                effectTarget: Sector.ENERGY,
                effectValue: 0.2
            }
        ];

        const afternoonEvents = [
            {
                title: '午间重要经济数据发布',
                description: '统计局发布重要经济数据，显示经济复苏态势良好，市场信心得到提振。',
                effectType: 'MARKET_SENTIMENT' as const,
                effectValue: 0.15
            },
            {
                title: '科技巨头发布财报',
                description: '多家科技公司发布季度财报，业绩表现超预期，科技板块受到关注。',
                effectType: 'SECTOR_BOOST' as const,
                effectTarget: Sector.TECH,
                effectValue: 0.25
            }
        ];

        const events = currentTime === 'MORNING' ? morningEvents : afternoonEvents;
        const event = events[Math.floor(Math.random() * events.length)];

        return {
            id: `default_event_${Date.now()}`,
            title: event.title,
            description: event.description,
            effects: [{
                type: event.effectType,
                target: (event as any).effectTarget,
                value: event.effectValue,
                description: event.description
            }],
            newsFlash: `【快讯】${event.title}`,
            triggerCondition: currentTime
        };
    }

    /**
     * 应用事件效果到市场
     */
    applyEventEffects(stocks: any[], event: DailyEvent): any[] {
        return stocks.map(stock => {
            let modifiedStock = { ...stock };
            
            for (const effect of event.effects) {
                switch (effect.type) {
                    case 'MARKET_SENTIMENT':
                        // 影响所有股票
                        modifiedStock.price *= (1 + effect.value);
                        modifiedStock.volatility *= (1 + Math.abs(effect.value) * 0.5);
                        break;
                    
                    case 'SECTOR_BOOST':
                    case 'SECTOR_CRASH':
                        // 只影响特定板块
                        if (effect.target && modifiedStock.sector === effect.target) {
                            modifiedStock.price *= (1 + effect.value);
                            modifiedStock.volatility *= (1 + Math.abs(effect.value) * 0.8);
                        }
                        break;
                    
                    case 'VOLATILITY_CHANGE':
                        // 改变波动性
                        modifiedStock.volatility *= (1 + effect.value);
                        break;
                }
            }
            
            return modifiedStock;
        });
    }
}