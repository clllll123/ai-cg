import { Stock, Sector } from '../types';
import { MacroEvent, MarketCondition } from '../types/startup';
import { macroEventService } from './macroEventService';
import { companyOperationService } from './companyOperationService';

export interface PriceCalculationFactors {
  volumeImpact: number;
  momentum: number;
  drift: number;
  macroImpact: number;
  sectorImpact: number;
  companyDecisionImpact: number;
  totalChangePercent: number;
}

export class EnhancedPriceCalculationService {
  private companyDecisions: Map<string, { decisionId: string; impact: number; startTime: number; duration: number }[]> = new Map();

  registerCompanyDecision(stockId: string, decisionId: string, impact: number, duration: number): void {
    if (!this.companyDecisions.has(stockId)) {
      this.companyDecisions.set(stockId, []);
    }
    this.companyDecisions.get(stockId)!.push({
      decisionId,
      impact,
      startTime: Date.now(),
      duration
    });
  }

  calculatePriceChange(
    stock: Stock,
    netBuyVolume: number,
    marketDepth: number,
    globalTrend: number,
    settings: { maxDailyFluctuation: number; marketDepth: number }
  ): PriceCalculationFactors {
    const factors: PriceCalculationFactors = {
      volumeImpact: 0,
      momentum: 0,
      drift: 0,
      macroImpact: 0,
      sectorImpact: 0,
      companyDecisionImpact: 0,
      totalChangePercent: 0
    };

    factors.momentum = (stock.momentum || 0) * 0.90;

    factors.volumeImpact = netBuyVolume / marketDepth;
    factors.volumeImpact = Math.max(-0.03, Math.min(0.03, factors.volumeImpact));

    factors.drift = (Math.random() - 0.5) * stock.volatility * 0.05;

    factors.macroImpact = this.calculateMacroImpact(stock);

    factors.sectorImpact = this.calculateSectorImpact(stock.sector);

    factors.companyDecisionImpact = this.calculateCompanyDecisionImpact(stock.id);

    const trendImpact = globalTrend * stock.beta * 0.005;

    factors.totalChangePercent = 
      factors.momentum + 
      factors.drift + 
      trendImpact + 
      factors.macroImpact + 
      factors.sectorImpact + 
      factors.companyDecisionImpact;

    factors.totalChangePercent = Math.max(-0.03, Math.min(0.03, factors.totalChangePercent));

    return factors;
  }

  calculateMacroImpact(stock: Stock): number {
    const marketCondition = macroEventService.getMarketCondition();
    let impact = 0;

    impact += marketCondition.overallSentiment * 0.02;

    if (marketCondition.interestRate > 0.06) {
      impact -= 0.01 * (marketCondition.interestRate - 0.06);
    } else if (marketCondition.interestRate < 0.04) {
      impact += 0.01 * (0.04 - marketCondition.interestRate);
    }

    if (marketCondition.inflationRate > 0.04) {
      impact -= 0.005 * (marketCondition.inflationRate - 0.04);
    }

    if (marketCondition.gdpGrowth > 0.08) {
      impact += 0.01 * (marketCondition.gdpGrowth - 0.08);
    } else if (marketCondition.gdpGrowth < 0.04) {
      impact -= 0.01 * (0.04 - marketCondition.gdpGrowth);
    }

    const volatilityMultiplier = macroEventService.getVolatilityMultiplier();
    impact *= volatilityMultiplier;

    return impact * stock.beta;
  }

  calculateSectorImpact(sector: string): number {
    return macroEventService.getSectorImpact(sector) * 0.02;
  }

  calculateCompanyDecisionImpact(stockId: string): number {
    const decisions = this.companyDecisions.get(stockId) || [];
    let totalImpact = 0;
    const now = Date.now();

    for (const decision of decisions) {
      if (now - decision.startTime < decision.duration) {
        const progress = (now - decision.startTime) / decision.duration;
        const impactFactor = Math.sin(progress * Math.PI);
        totalImpact += decision.impact * impactFactor * 0.01;
      }
    }

    return totalImpact;
  }

  updateCompanyDecisions(): void {
    const now = Date.now();
    
    for (const [stockId, decisions] of this.companyDecisions.entries()) {
      const activeDecisions = decisions.filter(d => now - d.startTime < d.duration);
      
      if (activeDecisions.length === 0) {
        this.companyDecisions.delete(stockId);
      } else {
        this.companyDecisions.set(stockId, activeDecisions);
      }
    }
  }

  calculateLimitPrice(stock: Stock, isUp: boolean, maxFluctuation: number): number {
    const basePrice = stock.openPrice;
    const limitPercent = maxFluctuation;
    
    if (isUp) {
      return basePrice * (1 + limitPercent);
    } else {
      return basePrice * (1 - limitPercent);
    }
  }

  calculateMarketIndex(stocks: Stock[], initialIndex: number): number {
    const initialMarketCap = stocks.reduce((acc, s) => acc + s.openPrice, 0);
    const currentMarketCap = stocks.reduce((acc, s) => acc + s.price, 0);
    
    if (initialMarketCap === 0) return initialIndex;
    
    return initialIndex * (currentMarketCap / initialMarketCap);
  }

  calculateVolatilityIndex(stocks: Stock[]): number {
    if (stocks.length === 0) return 0;

    const priceChanges = stocks.map(stock => {
      if (stock.history.length < 2) return 0;
      const latest = stock.history[stock.history.length - 1];
      const previous = stock.history[stock.history.length - 2];
      return Math.abs((latest.price - previous.price) / previous.price);
    });

    const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    return avgChange * 100;
  }

  getActiveCompanyDecisions(stockId: string): Array<{ decisionId: string; impact: number; startTime: number; duration: number; progress: number }> {
    const decisions = this.companyDecisions.get(stockId) || [];
    const now = Date.now();
    
    return decisions.map(decision => ({
      ...decision,
      progress: Math.min(1, (now - decision.startTime) / decision.duration)
    }));
  }

  reset(): void {
    this.companyDecisions.clear();
  }

  getMarketCondition(): MarketCondition {
    return macroEventService.getMarketCondition();
  }

  getActiveMacroEvents() {
    return macroEventService.getActiveEvents();
  }
}

export const enhancedPriceCalculationService = new EnhancedPriceCalculationService();
