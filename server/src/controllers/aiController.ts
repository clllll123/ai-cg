import { Request, Response } from 'express';
import { z } from 'zod';
import { getAIService } from '../services/aiService';

// 验证模式
const generateNewsSchema = z.object({
  phase: z.string().min(1, '阶段不能为空'),
  stockSummary: z.string().min(1, '股票摘要不能为空')
});

const generateReportSchema = z.object({
  context: z.string().min(1, '上下文不能为空'),
  userId: z.string().min(1, '用户ID不能为空'),
  gameData: z.object({
    finalAssets: z.number().min(0, '最终资产不能为负数'),
    rank: z.number().min(1, '排名必须大于0'),
    trades: z.number().min(0, '交易次数不能为负数').optional(),
    winRate: z.number().min(0).max(1, '胜率必须在0-1之间').optional()
  }),
  analysisType: z.enum(['performance', 'strategy', 'risk'], {
    errorMap: () => ({ message: '分析类型必须是 performance、strategy 或 risk' })
  })
});

export const generateNews = async (req: Request, res: Response) => {
  try {
    const validatedData = generateNewsSchema.parse(req.body);
    const { phase, stockSummary } = validatedData;
    const aiService = getAIService();
    
    const systemPrompt = `你是一个即时股市模拟游戏的后台 AI。请生成 1 到 2 条**前瞻性**或**情绪化**的市场快讯，用于制造紧张氛围。
不要只陈述股价涨跌，要预测趋势、散布谣言或发表专家观点。
请返回纯 JSON 数组格式，不要包含 Markdown 代码块标记。
JSON 格式要求:
{
  "newsItems": [
    {
      "type": "NEWS" | "EXPERT" | "RUMOR" | "SENTIMENT",
      "title": "string",
      "content": "string",
      "impact": "positive" | "negative" | "neutral",
      "severity": number (0-1),
      "source": "string",
      "affectedSectors": ["string"]
    }
  ]
}`;

    const prompt = `
    上下文:
    - 阶段: ${phase || '交易中'}
    - 股票池: ${stockSummary || '暂无数据'}
    
    请混合生成以下类型的内容 (Type):
    1. 'EXPERT': 专家/分析师直播观点。语气权威，预测某个板块即将爆发或暴跌。
    2. 'RUMOR': 市场谣言/内幕消息。语气神秘，不确定性高，迷惑玩家。
    3. 'SENTIMENT': 散户情绪/资金流向。描述市场氛围。
    4. 'NEWS': 突发行业新闻。

    要求:
    - 语言: 中文
    - 内容简短有力 (20字以内)
    - **极具煽动性**
    - 返回合法的 JSON 字符串
  `;

    const response = await aiService.generateText(prompt, systemPrompt);
    
    let content = response.content;
    // Clean markdown if present
    content = content.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    
    let newsData;
    try {
      newsData = JSON.parse(content);
    } catch (e) {
      // Fallback
      newsData = {
        newsItems: [{
          type: 'SENTIMENT',
          title: '市场波动',
          content: '市场情绪波动较大，请谨慎操作。',
          impact: 'neutral',
          severity: 0.1,
          source: '系统',
          affectedSectors: []
        }]
      };
    }

    res.json(newsData);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: '请求参数验证失败', 
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    res.status(500).json({ error: '生成新闻失败，请稍后重试' });
  }
};

export const generateReport = async (req: Request, res: Response) => {
  try {
    const validatedData = generateReportSchema.parse(req.body);
    const { context } = validatedData;
    const aiService = getAIService();
    
    const systemPrompt = `你是一个专业的财经电视分析师。上午的交易刚刚结束。请撰写一份"午间股评"。
请返回纯 JSON 格式，不要包含 Markdown 代码块标记。
JSON 格式要求:
{
  "title": "string",
  "summary": "string",
  "starStock": "string",
  "trashStock": "string",
  "marketOutlook": "string"
}`;

    const prompt = `
      ${context}
      
      请生成午间报告 JSON。
    `;

    const response = await aiService.generateText(prompt, systemPrompt);
    
    let content = response.content;
    content = content.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    
    let reportData;
    try {
      reportData = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI report response:', content);
      reportData = {
        title: "午间快讯", 
        summary: "上午市场交易活跃，多空双方激烈争夺。", 
        starStock: "数据加载中", 
        trashStock: "数据加载中", 
        marketOutlook: "下午建议谨慎操作，控制仓位。" 
      };
    }
    
    res.json(reportData);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: '请求参数验证失败', 
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    console.error('AI Report Generation Error:', error);
    res.status(500).json({ error: '生成报告失败' });
  }
};
