
import { Sector, MarketNews, Stock, MidDayReport, NewsType } from '../types';
import api from './api';

// --- News Generation ---

export const generateMarketNews = async (
  currentPhase: string,
  stocks: Stock[]
): Promise<Partial<MarketNews>[]> => {
  // Sample a few stocks to give context
  const stockSummary = stocks
    .sort(() => 0.5 - Math.random())
    .slice(0, 8)
    .map(s => `${s.name}(${s.sector})`)
    .join(', ');

  try {
    const response = await api.post('/ai/news', {
        phase: currentPhase,
        stockSummary
    });
    
    if (response.data && response.data.newsItems) {
        return response.data.newsItems.map((item: any) => ({
            ...item,
            type: item.type || NewsType.NEWS
        }));
    }
    return [];
  } catch (error) {
    console.error("News gen failed (Backend)", error);
    // Fallback offline news
    return [{ 
        type: NewsType.SENTIMENT,
        title: "市场异动", 
        content: "交易量突然放大，主力似乎在行动...", 
        impact: 'neutral', 
        severity: 0.1, 
        affectedSectors: [],
        source: "市场观察"
    }];
  }
};

// --- Mid-Day Report Generation (New) ---

export const generateMidDayReport = async (
    stocks: Stock[],
    marketIndex: number,
    initialIndex: number
): Promise<MidDayReport> => {
    // Default fallback object
    const fallback: MidDayReport = { 
        title: "午间快讯", 
        summary: "上午市场交易活跃，多空双方激烈争夺。", 
        starStock: "数据加载中", 
        trashStock: "数据加载中", 
        marketOutlook: "下午建议谨慎操作，控制仓位。" 
    };

    // Calculate winners and losers
    const sorted = [...stocks].sort((a,b) => {
        const ca = (a.price - a.openPrice)/a.openPrice;
        const cb = (b.price - b.openPrice)/b.openPrice;
        return cb - ca;
    });
    const star = sorted[0];
    const trash = sorted[sorted.length-1];
    const indexChange = ((marketIndex - initialIndex) / initialIndex) * 100;

    const context = `
       Market Index Change: ${indexChange.toFixed(2)}%
       Top Gainer: ${star.name} (${star.sector}) up ${(((star.price-star.openPrice)/star.openPrice)*100).toFixed(2)}%
       Top Loser: ${trash.name} (${trash.sector}) down ${(((trash.price-trash.openPrice)/trash.openPrice)*100).toFixed(2)}%
    `;

    try {
        const response = await api.post('/ai/report', { context });
        if (response.data) {
             // Validate keys exist, if not use fallback
            if (!response.data.title) return { ...fallback, starStock: `${star.name} 表现强势`, trashStock: `${trash.name} 遭遇抛压` };
            return response.data;
        }
        return fallback;
    } catch (e) {
        console.error("Report gen failed (Backend)", e);
        return { 
            ...fallback,
            starStock: `${star.name} 表现强势`, 
            trashStock: `${trash.name} 遭遇抛压`
        };
    }
};

// --- Image Generation (Certificate) ---

export const generateCertificateImage = async (playerName: string, rank: number, totalValue: number): Promise<string | null> => {
  // Placeholder: Image generation might require a different backend endpoint or service
  // For now, we return null to disable it or implement a simple backend proxy later if requested.
  // DeepSeek currently doesn't support image generation in the same way.
  console.log("Certificate generation requested but not implemented for DeepSeek backend yet.");
  return null;
};
