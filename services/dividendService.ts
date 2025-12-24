import { Stock, Player, DividendEvent, DividendRecord, StockFundamentals, Sector } from '../types';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export class DividendService {
  private dividendEvents: Map<string, DividendEvent> = new Map();
  private dividendRecords: Map<string, DividendRecord[]> = new Map();
  
  private readonly DIVIDEND_INTERVAL_DAYS = 3;
  private readonly MIN_DIVIDEND_YIELD = 0.01;
  private readonly MAX_DIVIDEND_YIELD = 0.08;
  
  generateFundamentals(stock: Stock): StockFundamentals {
    const baseEps = this.generateBaseEPS(stock.sector);
    const peRatio = this.generatePERatio(stock.sector);
    const marketCap = stock.price * 10000000;
    
    const roe = 0.08 + Math.random() * 0.15;
    const netProfitMargin = 0.05 + Math.random() * 0.2;
    
    const dividendYield = this.MIN_DIVIDEND_YIELD + Math.random() * (this.MAX_DIVIDEND_YIELD - this.MIN_DIVIDEND_YIELD);
    const dividendPerShare = stock.price * dividendYield / this.DIVIDEND_INTERVAL_DAYS;
    
    const revenueGrowth = -0.1 + Math.random() * 0.4;
    const netProfitGrowth = -0.1 + Math.random() * 0.5;
    
    const debtToEquity = 0.2 + Math.random() * 0.6;
    const volatility = stock.volatility;
    const industryHeat = 30 + Math.random() * 70;
    
    return {
      peRatio,
      pbRatio: peRatio * 0.3,
      marketCap,
      eps: baseEps,
      roe: Math.round(roe * 10000) / 100,
      netProfitMargin: Math.round(netProfitMargin * 10000) / 100,
      revenueGrowth: Math.round(revenueGrowth * 10000) / 100,
      netProfitGrowth: Math.round(netProfitGrowth * 10000) / 100,
      dividendPerShare: Math.round(dividendPerShare * 100) / 100,
      dividendYield: Math.round(dividendYield * 10000) / 100,
      exDividendDate: 0,
      dividendPaymentDate: 0,
      recordDate: 0,
      debtToEquity: Math.round(debtToEquity * 10000) / 100,
      volatility,
      industryHeat,
      sectorCorrelation: 0.5 + Math.random() * 0.4
    };
  }
  
  private generateBaseEPS(sector: Sector): number {
    const sectorMultipliers: { [key in Sector]: number } = {
      [Sector.TECH]: 1.5,
      [Sector.ENERGY]: 1.2,
      [Sector.CONSUMER]: 0.8,
      [Sector.REAL_ESTATE]: 0.6,
      [Sector.MEDICAL]: 1.3,
      [Sector.GAME]: 1.4,
      [Sector.TOY]: 0.9,
      [Sector.FINANCE]: 1.1,
      [Sector.MANUFACTURING]: 0.7,
      [Sector.LOGISTICS]: 0.65,
      [Sector.AGRICULTURE]: 0.5
    };
    
    return (0.2 + Math.random() * 0.8) * sectorMultipliers[sector];
  }
  
  private generatePERatio(sector: Sector): number {
    const sectorRanges: { [key in Sector]: [number, number] } = {
      [Sector.TECH]: [30, 80],
      [Sector.ENERGY]: [10, 25],
      [Sector.CONSUMER]: [15, 35],
      [Sector.REAL_ESTATE]: [5, 15],
      [Sector.MEDICAL]: [25, 60],
      [Sector.GAME]: [20, 50],
      [Sector.TOY]: [15, 35],
      [Sector.FINANCE]: [6, 15],
      [Sector.MANUFACTURING]: [10, 25],
      [Sector.LOGISTICS]: [12, 28],
      [Sector.AGRICULTURE]: [15, 30]
    };
    
    const [min, max] = sectorRanges[sector];
    return min + Math.random() * (max - min);
  }
  
  createDividendEvent(stock: Stock, fundamentals: StockFundamentals, currentTick: number): DividendEvent {
    const announcementDelay = Math.floor(Math.random() * 5) + 2;
    const recordDelay = Math.floor(Math.random() * 3) + 1;
    const paymentDelay = Math.floor(Math.random() * 3) + 2;
    
    const announcementDate = currentTick + announcementDelay * 600;
    const recordDate = announcementDate + recordDelay * 600;
    const exDividendDate = recordDate;
    const paymentDate = recordDate + paymentDelay * 600;
    
    const adjustedPrice = stock.price * (1 - fundamentals.dividendYield / this.DIVIDEND_INTERVAL_DAYS);
    const bonusRatio = Math.random() < 0.3 ? Math.random() * 0.5 : 0;
    const rightsIssueRatio = Math.random() < 0.2 ? Math.random() * 0.3 : 0;
    const rightsIssuePrice = adjustedPrice * 0.8;
    
    const event: DividendEvent = {
      id: generateId(),
      stockId: stock.id,
      exDividendDate,
      dividendPerShare: fundamentals.dividendPerShare,
      dividendYield: fundamentals.dividendYield,
      announcementDate,
      recordDate,
      paymentDate,
      exRightsPrice: Math.round(adjustedPrice * 100) / 100,
      bonusSharesRatio: Math.round(bonusRatio * 100) / 100,
      rightsIssueRatio: Math.round(rightsIssueRatio * 100) / 100,
      rightsIssuePrice: Math.round(rightsIssuePrice * 100) / 100
    };
    
    this.dividendEvents.set(`${stock.id}_${announcementDate}`, event);
    return event;
  }
  
  getDividendEvent(stockId: string, tick: number): DividendEvent | null {
    for (const event of this.dividendEvents.values()) {
      if (event.stockId === stockId && 
          event.announcementDate <= tick && 
          event.paymentDate > tick) {
        return event;
      }
    }
    return null;
  }
  
  calculateRecordDateHoldings(player: Player, stockId: string, recordDate: number): number {
    const shares = player.portfolio[stockId] || 0;
    return shares;
  }
  
  calculateDividendPayment(
    player: Player,
    dividendEvent: DividendEvent,
    tick: number
  ): DividendRecord | null {
    if (tick < dividendEvent.paymentDate) {
      return null;
    }
    
    const recordDateHoldings = this.calculateRecordDateHoldings(
      player,
      dividendEvent.stockId,
      dividendEvent.recordDate
    );
    
    if (recordDateHoldings <= 0) {
      return null;
    }
    
    const totalDividend = recordDateHoldings * dividendEvent.dividendPerShare;
    
    const record: DividendRecord = {
      playerId: player.id,
      stockId: dividendEvent.stockId,
      shares: recordDateHoldings,
      dividendPerShare: dividendEvent.dividendPerShare,
      totalDividend: Math.round(totalDividend * 100) / 100,
      recordDate: dividendEvent.recordDate,
      paymentDate: dividendEvent.paymentDate,
      isReceived: false
    };
    
    const playerKey = `${player.id}_${dividendEvent.stockId}`;
    const existingRecords = this.dividendRecords.get(playerKey) || [];
    existingRecords.push(record);
    this.dividendRecords.set(playerKey, existingRecords);
    
    return record;
  }
  
  applyExRightsPrice(currentPrice: number, dividendEvent: DividendEvent): number {
    const adjustedPrice = currentPrice - dividendEvent.dividendPerShare;
    return Math.max(0.01, Math.round(adjustedPrice * 100) / 100);
  }
  
  calculateNewShareCount(
    currentShares: number,
    bonusSharesRatio: number,
    rightsIssueRatio: number,
    rightsIssuePrice: number,
    investmentAmount: number
  ): { newShares: number; bonusShares: number; rightsShares: number; remainingCash: number } {
    const bonusShares = Math.floor(currentShares * bonusSharesRatio);
    const maxRightsShares = Math.floor(currentShares * rightsIssueRatio);
    const affordableRightsShares = Math.min(
      maxRightsShares,
      Math.floor(investmentAmount / rightsIssuePrice)
    );
    
    const totalShares = currentShares + bonusShares + affordableRightsShares;
    const cost = affordableRightsShares * rightsIssuePrice;
    const remainingCash = investmentAmount - cost;
    
    return {
      newShares: totalShares,
      bonusShares,
      rightsShares: affordableRightsShares,
      remainingCash: Math.round(remainingCash * 100) / 100
    };
  }
  
  getPendingDividends(playerId: string): DividendRecord[] {
    const pending: DividendRecord[] = [];
    for (const records of this.dividendRecords.values()) {
      for (const record of records) {
        if (record.playerId === playerId && !record.isReceived) {
          pending.push(record);
        }
      }
    }
    return pending;
  }
  
  markDividendReceived(playerId: string, stockId: string, paymentDate: number): number {
    const playerKey = `${playerId}_${stockId}`;
    const records = this.dividendRecords.get(playerKey);
    
    if (!records) return 0;
    
    for (const record of records) {
      if (record.paymentDate === paymentDate && !record.isReceived) {
        record.isReceived = true;
        return record.totalDividend;
      }
    }
    return 0;
  }
  
  processDividendPayments(
    players: Player[],
    stocks: Stock[],
    currentTick: number
  ): Map<string, number> {
    const payments = new Map<string, number>();
    
    for (const stock of stocks) {
      const event = this.getDividendEvent(stock.id, currentTick);
      if (!event || currentTick < event.paymentDate) continue;
      
      for (const player of players) {
        if (player.isBot) continue;
        
        const record = this.calculateDividendPayment(player, event, currentTick);
        if (record && !record.isReceived) {
          const amount = this.markDividendReceived(player.id, stock.id, record.paymentDate);
          if (amount > 0) {
            payments.set(player.id, (payments.get(player.id) || 0) + amount);
          }
        }
      }
    }
    
    return payments;
  }
  
  getStockDividendInfo(stockId: string): DividendEvent | null {
    const now = Date.now();
    for (const event of this.dividendEvents.values()) {
      if (event.stockId === stockId && 
          event.announcementDate <= now && 
          event.paymentDate > now) {
        return event;
      }
    }
    return null;
  }
  
  isExDividendDay(stockId: string, tick: number): boolean {
    for (const event of this.dividendEvents.values()) {
      if (event.stockId === stockId && 
          event.exDividendDate <= tick && 
          event.paymentDate > tick) {
        return true;
      }
    }
    return false;
  }
  
  getDividendCalendar(daysAhead: number, stocks: Stock[], currentTick: number): DividendEvent[] {
    const cutoff = currentTick + daysAhead * 600;
    const calendar: DividendEvent[] = [];
    
    for (const event of this.dividendEvents.values()) {
      if (event.announcementDate >= currentTick && 
          event.announcementDate <= cutoff) {
        const stock = stocks.find(s => s.id === event.stockId);
        if (stock) {
          calendar.push(event);
        }
      }
    }
    
    return calendar.sort((a, b) => a.announcementDate - b.announcementDate);
  }
  
  calculateDividendYield(projectedAnnualDividend: number, currentPrice: number): number {
    if (currentPrice <= 0) return 0;
    return Math.round((projectedAnnualDividend / currentPrice) * 10000) / 100;
  }
  
  estimateFutureDividend(
    fundamentals: StockFundamentals,
    daysHeld: number
  ): number {
    const annualDividendPerShare = fundamentals.dividendPerShare * (365 / this.DIVIDEND_INTERVAL_DAYS);
    const dailyDividend = annualDividendPerShare / 365;
    return Math.round(dailyDividend * daysHeld * 100) / 100;
  }
}

export const dividendService = new DividendService();
