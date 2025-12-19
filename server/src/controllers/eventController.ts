import { Request, Response } from 'express';
import { EventService } from '../services/eventService';

const eventService = new EventService();

/**
 * 生成一日大事件
 */
export const generateDailyEvent = async (req: Request, res: Response) => {
    try {
        const { currentTime, marketTrend, activeSectors } = req.body;
        
        // 验证参数
        if (!currentTime || !marketTrend || !activeSectors) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数：currentTime, marketTrend, activeSectors'
            });
        }

        const event = await eventService.generateDailyEvent(
            currentTime,
            marketTrend,
            activeSectors
        );

        res.json({
            success: true,
            data: event
        });
    } catch (error) {
        console.error('生成大事件失败:', error);
        res.status(500).json({
            success: false,
            message: '生成大事件失败'
        });
    }
};

/**
 * 应用事件效果到股票数据
 */
export const applyEventEffects = async (req: Request, res: Response) => {
    try {
        const { stocks, event } = req.body;
        
        if (!stocks || !event) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数：stocks, event'
            });
        }

        const modifiedStocks = eventService.applyEventEffects(stocks, event);

        res.json({
            success: true,
            data: modifiedStocks
        });
    } catch (error) {
        console.error('应用事件效果失败:', error);
        res.status(500).json({
            success: false,
            message: '应用事件效果失败'
        });
    }
};

/**
 * 获取预定义的事件模板（用于测试）
 */
export const getEventTemplates = async (req: Request, res: Response) => {
    try {
        const templates = [
            {
                id: 'template_1',
                title: '央行降准释放流动性',
                description: '央行宣布下调存款准备金率0.5个百分点，释放长期资金约1万亿元。',
                effects: [
                    {
                        type: 'MARKET_SENTIMENT',
                        value: 0.2,
                        description: '市场流动性增加，投资者信心提升'
                    }
                ],
                newsFlash: '【快讯】央行降准释放万亿流动性'
            },
            {
                id: 'template_2',
                title: '新能源补贴政策调整',
                description: '国家能源局发布新能源补贴政策调整方案，部分领域补贴力度加大。',
                effects: [
                    {
                        type: 'SECTOR_BOOST',
                        target: '新能源/造车',
                        value: 0.3,
                        description: '新能源板块受到政策利好刺激'
                    }
                ],
                newsFlash: '【快讯】新能源补贴政策重大调整'
            },
            {
                id: 'template_3',
                title: '国际局势紧张影响市场',
                description: '国际地缘政治局势紧张，全球市场避险情绪上升。',
                effects: [
                    {
                        type: 'MARKET_SENTIMENT',
                        value: -0.15,
                        description: '市场避险情绪上升，风险偏好下降'
                    },
                    {
                        type: 'VOLATILITY_CHANGE',
                        value: 0.4,
                        description: '市场不确定性增加，波动性上升'
                    }
                ],
                newsFlash: '【快讯】国际局势紧张引发市场担忧'
            }
        ];

        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        console.error('获取事件模板失败:', error);
        res.status(500).json({
            success: false,
            message: '获取事件模板失败'
        });
    }
};