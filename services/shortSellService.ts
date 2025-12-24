import { 
  Stock, 
  Player, 
  ShortPosition, 
  ShortSellConfig, 
  MarginAccount,
  ExtendedOrder,
  OrderType,
  OrderStatus,
  ExtendedBroadcastEvent
} from '../types';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const SHORT_SELL_CONFIG: ShortSellConfig = {
  allowShorting: true,
  minMarginRequirement: 0.5,
  marginCallThreshold: 0.3,
  dailyBorrowFee: 0.0005,
  maxShortRatio: 0.3,
  maxShortDays: 10
};

export { SHORT_SELL_CONFIG };

export interface ShortSellResult {
  success: boolean;
  position?: ShortPosition;
  error?: string;
  marginUsed?: number;
}

export interface CoverResult {
  success: boolean;
  profit?: number;
  profitRate?: number;
  error?: string;
}

export interface MarginCallResult {
  triggered: boolean;
  positions: ShortPosition[];
  totalLoss: number;
  liquidationAmount: number;
}

export class ShortSellService {
  private shortPositions: Map<string, ShortPosition[]> = new Map();
  private marginAccounts: Map<string, MarginAccount> = new Map();
  private availableShares: Map<string, number> = new Map();
  private config: ShortSellConfig;

  constructor(config: Partial<ShortSellConfig> = {}) {
    this.config = { ...SHORT_SELL_CONFIG, ...config };
    this.initializeAvailableShares();
  }

  private initializeAvailableShares(): void {
    const totalShares = 10000000;
    this.availableShares.set('market', Math.floor(totalShares * (1 - this.config.maxShortRatio)));
  }

  getAvailableShares(stockId: string): number {
    const marketAvailable = this.availableShares.get('market') || 0;
    const usedShares = this.getTotalShortedShares(stockId);
    return Math.max(0, marketAvailable - usedShares);
  }

  private getTotalShortedShares(stockId: string): number {
    let total = 0;
    for (const positions of this.shortPositions.values()) {
      for (const pos of positions) {
        if (pos.stockId === stockId && pos.status !== 'closed') {
          total += pos.borrowedAmount - (pos.borrowedAmount * (1 - this.getPositionProgress(pos)));
        }
      }
    }
    return total;
  }

  private getPositionProgress(position: ShortPosition): number {
    if (position.status === 'closed') return 1;
    if (position.status === 'open') return 0;
    return 0.5;
  }

  initiateShortSell(
    player: Player,
    stock: Stock,
    amount: number,
    currentTick: number
  ): ShortSellResult {
    if (!this.config.allowShorting) {
      return { success: false, error: '做空功能暂未开放' };
    }

    const availableShares = this.getAvailableShares(stock.id);
    if (amount > availableShares) {
      return { 
        success: false, 
        error: `可借股数不足，当前可借: ${availableShares}股` 
      };
    }

    const marginRequired = amount * stock.price * this.config.minMarginRequirement;
    const playerCash = player.cash;

    if (marginRequired > playerCash) {
      return { 
        success: false, 
        error: `保证金不足，需要 ${Math.round(marginRequired)} 元，当前可用: ${Math.round(playerCash)} 元` 
      };
    }

    const marginCallPrice = stock.price * (1 + (1 - this.config.marginCallThreshold));
    const dueDate = currentTick + this.config.maxShortDays * 600;

    const position: ShortPosition = {
      id: generateId(),
      playerId: player.id,
      stockId: stock.id,
      stockName: stock.name,
      borrowedAmount: amount,
      borrowedPrice: stock.price,
      currentPrice: stock.price,
      marginRequired: Math.round(marginRequired),
      marginRatio: 1,
      marginCallPrice: Math.round(marginCallPrice * 100) / 100,
      borrowFee: 0,
      openTimestamp: currentTick,
      dueDate,
      status: 'open',
      profit: 0,
      profitRate: 0
    };

    const playerPositions = this.shortPositions.get(player.id) || [];
    playerPositions.push(position);
    this.shortPositions.set(player.id, playerPositions);

    this.updateMarginAccount(player, -marginRequired);

    return {
      success: true,
      position,
      marginUsed: marginRequired
    };
  }

  coverShortPosition(
    player: Player,
    positionId: string,
    coverPrice: number,
    currentTick: number
  ): CoverResult {
    const playerPositions = this.shortPositions.get(player.id) || [];
    const positionIndex = playerPositions.findIndex(p => p.id === positionId);

    if (positionIndex === -1) {
      return { success: false, error: '未找到做空仓位' };
    }

    const position = playerPositions[positionIndex];
    
    if (position.status === 'closed') {
      return { success: false, error: '该仓位已平仓' };
    }

    const borrowFee = this.calculateBorrowFee(position, currentTick);
    const totalCost = coverPrice * position.borrowedAmount;
    const revenue = position.borrowedPrice * position.borrowedAmount;
    const grossProfit = revenue - totalCost;
    const netProfit = grossProfit - borrowFee;
    const profitRate = netProfit / position.marginRequired;

    position.status = 'closed';
    position.profit = Math.round(netProfit * 100) / 100;
    position.profitRate = Math.round(profitRate * 10000) / 100;

    this.updateMarginAccount(player, position.marginRequired + netProfit);

    playerPositions.splice(positionIndex, 1);
    if (playerPositions.length > 0) {
      this.shortPositions.set(player.id, playerPositions);
    } else {
      this.shortPositions.delete(player.id);
    }

    return {
      success: true,
      profit: Math.round(netProfit * 100) / 100,
      profitRate: Math.round(profitRate * 10000) / 100
    };
  }

  private calculateBorrowFee(position: ShortPosition, currentTick: number): number {
    const daysHeld = (currentTick - position.openTimestamp) / 600;
    return position.borrowedAmount * position.borrowedPrice * this.config.dailyBorrowFee * daysHeld;
  }

  updatePositionPrice(position: ShortPosition, newPrice: number): void {
    position.currentPrice = newPrice;
    
    const unrealizedProfit = (position.borrowedPrice - newPrice) * position.borrowedAmount;
    const marginRatio = (position.marginRequired + unrealizedProfit) / position.marginRequired;
    
    position.marginRatio = Math.round(marginRatio * 100) / 100;
    position.profit = Math.round(unrealizedProfit * 100) / 100;
    position.profitRate = Math.round((unrealizedProfit / position.marginRequired) * 10000) / 100;
  }

  updateAllPositions(stocks: Stock[], currentTick: number): MarginCallResult {
    const marginCalls: MarginCallResult = {
      triggered: false,
      positions: [],
      totalLoss: 0,
      liquidationAmount: 0
    };

    let totalLiquidationNeeded = 0;

    for (const [playerId, positions] of this.shortPositions.entries()) {
      const account = this.marginAccounts.get(playerId);
      if (!account) continue;

      for (const position of positions) {
        if (position.status === 'closed') continue;

        const stock = stocks.find(s => s.id === position.stockId);
        if (stock) {
          this.updatePositionPrice(position, stock.price);

          if (position.currentPrice >= position.marginCallPrice) {
            marginCalls.positions.push(position);
            marginCalls.triggered = true;
            totalLiquidationNeeded += Math.abs(position.profit);
          }

          const dailyFee = position.borrowedAmount * position.borrowedPrice * this.config.dailyBorrowFee;
          position.borrowFee = Math.round((position.borrowFee + dailyFee) * 100) / 100;
        }
      }
    }

    if (marginCalls.triggered) {
      marginCalls.totalLoss = Math.round(totalLiquidationNeeded * 100) / 100;
      marginCalls.liquidationAmount = Math.min(
        marginCalls.totalLoss,
        this.getTotalPlayerMargin(marginCalls.positions[0]?.playerId || '')
      );
    }

    return marginCalls;
  }

  private getTotalPlayerMargin(playerId: string): number {
    const account = this.marginAccounts.get(playerId);
    return account?.usedMargin || 0;
  }

  private updateMarginAccount(player: Player, amountChange: number): void {
    let account = this.marginAccounts.get(player.id);

    if (!account) {
      account = {
        playerId: player.id,
        leverage: 1,
        usedMargin: 0,
        availableMargin: player.cash,
        marginRatio: 1,
        marginCallPrice: 0,
        liquidationTriggered: false,
        marginBalance: 0,
        securitiesBalance: 0,
        interestRate: 0.05,
        borrowFeeRate: this.config.dailyBorrowFee
      };
    }

    account.usedMargin = Math.max(0, account.usedMargin + amountChange);
    account.availableMargin = Math.max(0, account.usedMargin > 0 
      ? player.cash - account.usedMargin 
      : player.cash);
    
    account.marginRatio = account.usedMargin > 0 
      ? account.availableMargin / account.usedMargin 
      : 1;

    this.marginAccounts.set(player.id, account);
  }

  getPlayerShortPositions(playerId: string): ShortPosition[] {
    return this.shortPositions.get(playerId) || [];
  }

  getMarginAccount(playerId: string): MarginAccount | null {
    return this.marginAccounts.get(playerId) || null;
  }

  getTotalShortExposure(playerId: string): number {
    const positions = this.getPlayerShortPositions(playerId);
    return positions.reduce((total, pos) => total + pos.borrowedAmount * pos.borrowedPrice, 0);
  }

  getMarginCallPositions(playerId: string): ShortPosition[] {
    const positions = this.getPlayerShortPositions(playerId);
    return positions.filter(p => p.status !== 'closed' && p.currentPrice >= p.marginCallPrice);
  }

  forceLiquidatePosition(player: Player, positionId: string, currentPrice: number): CoverResult {
    const result = this.coverShortPosition(player, positionId, currentPrice, Date.now());
    
    if (result.success) {
      return {
        ...result,
        profit: (result.profit || 0) * 0.9
      };
    }
    
    return result;
  }

  getShortInterest(stockId: string): { shares: number; ratio: number } {
    const totalShorted = this.getTotalShortedShares(stockId);
    const totalShares = 10000000;
    return {
      shares: totalShorted,
      ratio: Math.round((totalShorted / totalShares) * 10000) / 100
    };
  }

  getShortSqueezeRisk(stockId: string): number {
    const interest = this.getShortInterest(stockId);
    const shortRatio = interest.ratio / 100;
    
    if (shortRatio > 0.2) return 0.9;
    if (shortRatio > 0.1) return 0.6;
    if (shortRatio > 0.05) return 0.3;
    return 0.1;
  }

  createShortOrder(
    player: Player,
    stock: Stock,
    amount: number,
    orderType: OrderType,
    price: number,
    currentTick: number
  ): ExtendedOrder {
    const orderId = generateId();
    
    return {
      id: orderId,
      playerId: player.id,
      stockId: stock.id,
      type: orderType,
      side: 'sell',
      status: OrderStatus.PENDING,
      price: {
        type: orderType === OrderType.MARKET ? 'market' : 'limit',
        limitPrice: orderType !== OrderType.MARKET ? price : undefined
      },
      amount,
      filledAmount: 0,
      icebergFilled: 0,
      timestamp: currentTick,
      expiresAt: currentTick + 3600000
    };
  }

  createCoverOrder(
    player: Player,
    stock: Stock,
    position: ShortPosition,
    orderType: OrderType,
    price: number,
    currentTick: number
  ): ExtendedOrder {
    const orderId = generateId();
    
    return {
      id: orderId,
      playerId: player.id,
      stockId: stock.id,
      type: orderType,
      side: 'buy',
      status: OrderStatus.PENDING,
      price: {
        type: orderType === OrderType.MARKET ? 'market' : 'limit',
        limitPrice: orderType !== OrderType.MARKET ? price : undefined
      },
      amount: position.borrowedAmount,
      filledAmount: 0,
      icebergFilled: 0,
      parentOrderId: position.id,
      timestamp: currentTick,
      expiresAt: currentTick + 3600000
    };
  }

  createStopLossOrder(
    player: Player,
    stock: Stock,
    position: ShortPosition,
    stopPrice: number,
    orderType: OrderType,
    triggerType: 'gte' | 'lte',
    currentTick: number
  ): ExtendedOrder {
    const orderId = generateId();
    
    return {
      id: orderId,
      playerId: player.id,
      stockId: stock.id,
      type: OrderType.STOP_LOSS,
      side: 'buy',
      status: OrderStatus.PENDING,
      price: {
        type: 'limit',
        limitPrice: position.borrowedPrice
      },
      amount: position.borrowedAmount,
      filledAmount: 0,
      icebergFilled: 0,
      stopCondition: {
        triggerPrice: stopPrice,
        triggerType,
        orderType: OrderType.MARKET,
        orderPrice: { type: 'market' }
      },
      parentOrderId: position.id,
      timestamp: currentTick,
      expiresAt: currentTick + 86400000
    };
  }

  checkStopLossTriggered(position: ShortPosition, currentPrice: number): boolean {
    if (!position) return false;
    return currentPrice >= position.marginCallPrice;
  }

  getPlayerStats(playerId: string): {
    totalPositions: number;
    totalExposure: number;
    totalProfit: number;
    winRate: number;
    marginUtilization: number;
  } {
    const positions = this.getPlayerShortPositions(playerId);
    const account = this.getMarginAccount(playerId);
    
    const closedPositions = positions.filter(p => p.status === 'closed');
    const winningPositions = closedPositions.filter(p => p.profit > 0);
    
    const totalExposure = this.getTotalShortExposure(playerId);
    const totalProfit = positions.reduce((sum, p) => sum + p.profit, 0);
    const marginUtilization = account 
      ? (account.usedMargin / (account.usedMargin + account.availableMargin)) 
      : 0;

    return {
      totalPositions: positions.length,
      totalExposure: Math.round(totalExposure),
      totalProfit: Math.round(totalProfit * 100) / 100,
      winRate: closedPositions.length > 0 
        ? Math.round((winningPositions.length / closedPositions.length) * 100) 
        : 0,
      marginUtilization: Math.round(marginUtilization * 100) / 100
    };
  }

  getShortLeaderboard(): { playerId: string; playerName: string; exposure: number; profit: number }[] {
    const leaderboard: { playerId: string; playerName: string; exposure: number; profit: number }[] = [];

    for (const [playerId, positions] of this.shortPositions.entries()) {
      const totalExposure = positions.reduce((sum, p) => sum + p.borrowedAmount * p.borrowedPrice, 0);
      const totalProfit = positions.reduce((sum, p) => sum + p.profit, 0);
      
      leaderboard.push({
        playerId,
        playerName: positions[0]?.stockName || 'Unknown',
        exposure: Math.round(totalExposure),
        profit: Math.round(totalProfit * 100) / 100
      });
    }

    return leaderboard.sort((a, b) => b.exposure - a.exposure);
  }
}

export const shortSellService = new ShortSellService();
