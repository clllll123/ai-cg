import { StartupCompany, BusinessDecision, DecisionResult, DecisionImpact, CompanyMetrics } from '../types/startup';

export class CompanyOperationService {
  executeDecision(company: StartupCompany, decision: BusinessDecision): {
    updatedCompany: StartupCompany;
    result: DecisionResult;
  } {
    const success = Math.random() < decision.successRate;
    const actualImpacts: { type: DecisionImpact; value: number }[] = [];
    const updatedMetrics = { ...company.metrics };

    if (success) {
      for (const impact of decision.impacts) {
        const actualValue = this.calculateActualImpact(impact, decision.riskLevel);
        actualImpacts.push({
          type: impact.type,
          value: actualValue
        });

        this.applyImpactToMetrics(updatedMetrics, impact.type, actualValue);
      }
    } else {
      for (const impact of decision.impacts) {
        const failedValue = impact.value * -0.5;
        actualImpacts.push({
          type: impact.type,
          value: failedValue
        });

        this.applyImpactToMetrics(updatedMetrics, impact.type, failedValue);
      }
    }

    const updatedCompany: StartupCompany = {
      ...company,
      metrics: updatedMetrics,
      activeDecisions: [
        ...company.activeDecisions,
        {
          decisionId: decision.id,
          startTime: Date.now(),
          progress: 0
        }
      ],
      history: [
        ...company.history,
        {
          timestamp: Date.now(),
          valuation: this.calculateNewValuation(company, updatedMetrics),
          revenue: updatedMetrics.revenue,
          profit: updatedMetrics.profit
        }
      ]
    };

    const result: DecisionResult = {
      decisionId: decision.id,
      success,
      actualImpacts,
      timestamp: Date.now(),
      description: success 
        ? `决策"${decision.title}"执行成功，${this.formatImpacts(actualImpacts)}`
        : `决策"${decision.title}"执行失败，${this.formatImpacts(actualImpacts)}`
    };

    return { updatedCompany, result };
  }

  updateDecisionProgress(company: StartupCompany, decisionId: string, progress: number): StartupCompany {
    return {
      ...company,
      activeDecisions: company.activeDecisions.map(decision => 
        decision.decisionId === decisionId 
          ? { ...decision, progress: Math.min(100, progress) }
          : decision
      )
    };
  }

  completeDecision(company: StartupCompany, decisionId: string): StartupCompany {
    const decision = company.activeDecisions.find(d => d.decisionId === decisionId);
    if (!decision) return company;

    return {
      ...company,
      activeDecisions: company.activeDecisions.filter(d => d.decisionId !== decisionId)
    };
  }

  calculateDecisionImpactOnStockPrice(company: StartupCompany, decision: BusinessDecision): number {
    let totalImpact = 0;

    for (const impact of decision.impacts) {
      const impactValue = this.calculateActualImpact(impact, decision.riskLevel);
      
      switch (impact.type) {
        case DecisionImpact.REVENUE:
          totalImpact += impactValue * 0.3;
          break;
        case DecisionImpact.PROFIT:
          totalImpact += impactValue * 0.4;
          break;
        case DecisionImpact.GROWTH:
          totalImpact += impactValue * 0.35;
          break;
        case DecisionImpact.BRAND:
          totalImpact += impactValue * 0.2;
          break;
        case DecisionImpact.INNOVATION:
          totalImpact += impactValue * 0.25;
          break;
        case DecisionImpact.MARKET_SHARE:
          totalImpact += impactValue * 0.3;
          break;
        case DecisionImpact.RISK:
          totalImpact -= impactValue * 0.5;
          break;
      }
    }

    return totalImpact * decision.successRate;
  }

  simulateDailyGrowth(company: StartupCompany): StartupCompany {
    const updatedMetrics = { ...company.metrics };
    const growthRate = company.metrics.growthRate / 100;

    updatedMetrics.revenue = Math.floor(updatedMetrics.revenue * (1 + growthRate * 0.01));
    updatedMetrics.profit = Math.floor(updatedMetrics.profit * (1 + growthRate * 0.008));
    updatedMetrics.marketShare = Math.min(100, updatedMetrics.marketShare * (1 + growthRate * 0.005));
    updatedMetrics.brandValue = Math.min(100, updatedMetrics.brandValue * (1 + growthRate * 0.003));
    updatedMetrics.innovationScore = Math.min(100, updatedMetrics.innovationScore * (1 + growthRate * 0.004));
    updatedMetrics.customerSatisfaction = Math.min(100, updatedMetrics.customerSatisfaction * (1 + growthRate * 0.002));

    const newValuation = this.calculateNewValuation(company, updatedMetrics);

    return {
      ...company,
      metrics: updatedMetrics,
      valuation: newValuation,
      history: [
        ...company.history,
        {
          timestamp: Date.now(),
          valuation: newValuation,
          revenue: updatedMetrics.revenue,
          profit: updatedMetrics.profit
        }
      ]
    };
  }

  calculateNewValuation(company: StartupCompany, metrics: CompanyMetrics): number {
    const revenueMultiple = 5 + (metrics.growthRate / 100) * 10;
    const profitMultiple = 20 + (metrics.growthRate / 100) * 15;
    const brandMultiplier = 1 + (metrics.brandValue / 100) * 0.5;
    const innovationMultiplier = 1 + (metrics.innovationScore / 100) * 0.3;
    const marketShareMultiplier = 1 + (metrics.marketShare / 100) * 0.4;

    const revenueBasedValuation = metrics.revenue * revenueMultiple;
    const profitBasedValuation = metrics.profit > 0 ? Math.abs(metrics.profit) * profitMultiple : revenueBasedValuation * 0.8;

    const baseValuation = (revenueBasedValuation + profitBasedValuation) / 2;
    const adjustedValuation = baseValuation * brandMultiplier * innovationMultiplier * marketShareMultiplier;

    return Math.floor(adjustedValuation);
  }

  private calculateActualImpact(impact: { type: DecisionImpact; value: number; duration: number }, riskLevel: string): number {
    const riskMultiplier = {
      low: 1.0,
      medium: 0.9,
      high: 0.8
    }[riskLevel] || 1.0;

    const randomFactor = 0.8 + Math.random() * 0.4;
    return impact.value * riskMultiplier * randomFactor;
  }

  private applyImpactToMetrics(metrics: CompanyMetrics, impactType: DecisionImpact, value: number): void {
    switch (impactType) {
      case DecisionImpact.REVENUE:
        metrics.revenue = Math.floor(metrics.revenue * (1 + value / 100));
        break;
      case DecisionImpact.PROFIT:
        metrics.profit = Math.floor(metrics.profit * (1 + value / 100));
        break;
      case DecisionImpact.GROWTH:
        metrics.growthRate = Math.max(0, metrics.growthRate * (1 + value / 100));
        break;
      case DecisionImpact.BRAND:
        metrics.brandValue = Math.min(100, Math.max(0, metrics.brandValue + value));
        break;
      case DecisionImpact.INNOVATION:
        metrics.innovationScore = Math.min(100, Math.max(0, metrics.innovationScore + value));
        break;
      case DecisionImpact.MARKET_SHARE:
        metrics.marketShare = Math.min(100, Math.max(0, metrics.marketShare * (1 + value / 100)));
        break;
      case DecisionImpact.RISK:
        metrics.debtRatio = Math.max(0, Math.min(100, metrics.debtRatio + value));
        break;
    }
  }

  private formatImpacts(impacts: { type: DecisionImpact; value: number }[]): string {
    const impactDescriptions = impacts.map(impact => {
      const sign = impact.value > 0 ? '提升' : '降低';
      const absValue = Math.abs(impact.value).toFixed(1);
      const typeNames = {
        [DecisionImpact.REVENUE]: '营收',
        [DecisionImpact.PROFIT]: '利润',
        [DecisionImpact.GROWTH]: '增长率',
        [DecisionImpact.RISK]: '风险',
        [DecisionImpact.BRAND]: '品牌价值',
        [DecisionImpact.INNOVATION]: '创新能力',
        [DecisionImpact.MARKET_SHARE]: '市场份额'
      };
      return `${typeNames[impact.type]}${sign}${absValue}%`;
    });

    return impactDescriptions.join('，');
  }

  evaluateCompanyHealth(company: StartupCompany): {
    healthScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  } {
    const metrics = company.metrics;
    const scores = {
      financial: this.calculateFinancialScore(metrics),
      growth: this.calculateGrowthScore(metrics),
      market: this.calculateMarketScore(metrics),
      innovation: this.calculateInnovationScore(metrics)
    };

    const healthScore = (scores.financial + scores.growth + scores.market + scores.innovation) / 4;
    
    const riskLevel = healthScore > 70 ? 'low' : healthScore > 40 ? 'medium' : 'high';
    
    const recommendations: string[] = [];
    
    if (scores.financial < 50) {
      recommendations.push('建议优化财务结构，控制成本支出');
    }
    if (scores.growth < 50) {
      recommendations.push('建议加大研发投入，提升产品竞争力');
    }
    if (scores.market < 50) {
      recommendations.push('建议加强品牌建设，扩大市场影响力');
    }
    if (scores.innovation < 50) {
      recommendations.push('建议引进高端人才，提升创新能力');
    }

    return { healthScore, riskLevel, recommendations };
  }

  private calculateFinancialScore(metrics: CompanyMetrics): number {
    const profitMargin = metrics.revenue > 0 ? (metrics.profit / metrics.revenue) * 100 : 0;
    const cashFlowScore = metrics.cashFlow > 0 ? 50 : 30;
    const debtScore = (1 - metrics.debtRatio) * 50;
    
    return Math.min(100, Math.max(0, profitMargin * 2 + cashFlowScore + debtScore));
  }

  private calculateGrowthScore(metrics: CompanyMetrics): number {
    return Math.min(100, metrics.growthRate);
  }

  private calculateMarketScore(metrics: CompanyMetrics): number {
    return (metrics.marketShare * 3 + metrics.brandValue * 0.7) / 4;
  }

  private calculateInnovationScore(metrics: CompanyMetrics): number {
    return (metrics.innovationScore + metrics.customerSatisfaction) / 2;
  }
}

export const companyOperationService = new CompanyOperationService();
