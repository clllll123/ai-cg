import {
  Stock,
  Player,
  ExtendedOrder,
  OrderType,
  OrderStatus,
  OrderPrice,
  StopCondition,
  OrderBookItem,
  GameSettings
} from '../types';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export interface OrderCreationParams {
  playerId: string;
  stockId: string;
  stockName: string;
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  orderType?: OrderType;
  stopCondition?: StopCondition;
  trailingPercent?: number;
  trailingDistance?: number;
  expiresAt?: number;
  icebergSize?: number;
}

export interface OrderResult {
  success: boolean;
  order?: ExtendedOrder;
  error?: string;
  estimatedPrice?: number;
}

export interface OrderExecutionResult {
  success: boolean;
  filledAmount: number;
  avgPrice: number;
  totalValue: number;
  remainingAmount: number;
  error?: string;
}

export interface OrderMatchResult {
  matched: boolean;
  triggerPrice?: number;
  currentPrice?: number;
  message?: string;
}

export class OrderService {
  private orders: Map<string, ExtendedOrder> = new Map();
  private settings: GameSettings;

  constructor(settings: GameSettings) {
    this.settings = settings;
  }

  createOrder(params: OrderCreationParams, currentTick: number): OrderResult {
    const {
      playerId,
      stockId,
      side,
      amount,
      price,
      orderType = OrderType.LIMIT,
      stopCondition,
      trailingPercent,
      trailingDistance,
      expiresAt,
      icebergSize
    } = params;

    if (amount <= 0) {
      return { success: false, error: '订单数量必须大于0' };
    }

    const priceConfig = this.buildPriceConfig(orderType, price);

    const estimatedPrice = this.estimateOrderPrice(orderType, price, stockId);

    const order: ExtendedOrder = {
      id: generateId(),
      playerId,
      stockId,
      type: orderType,
      side,
      status: OrderStatus.PENDING,
      price: priceConfig,
      amount,
      filledAmount: 0,
      stopCondition,
      timestamp: currentTick,
      expiresAt,
      icebergSize,
      icebergFilled: 0,
      trailingPercent,
      trailingDistance
    };

    this.orders.set(order.id, order);

    return {
      success: true,
      order,
      estimatedPrice
    };
  }

  createMarketOrder(
    playerId: string,
    stock: Stock,
    side: 'buy' | 'sell',
    amount: number,
    currentTick: number,
    priceLimit?: number
  ): OrderResult {
    const marketPrice = side === 'buy' ? stock.sellBook?.[0]?.p || stock.price : stock.buyBook?.[0]?.p || stock.price;

    const priceConfig: OrderPrice = {
      type: 'market',
      marketPrice: priceLimit
    };

    const order: ExtendedOrder = {
      id: generateId(),
      playerId,
      stockId: stock.id,
      type: OrderType.MARKET,
      side,
      status: OrderStatus.PENDING,
      price: priceConfig,
      amount,
      filledAmount: 0,
      icebergFilled: 0,
      timestamp: currentTick
    };

    this.orders.set(order.id, order);

    return {
      success: true,
      order,
      estimatedPrice: marketPrice
    };
  }

  createLimitOrder(
    playerId: string,
    stockId: string,
    side: 'buy' | 'sell',
    amount: number,
    limitPrice: number,
    currentTick: number,
    expiresAt?: number,
    icebergSize?: number
  ): OrderResult {
    return this.createOrder({
      playerId,
      stockId,
      stockName: '',
      side,
      amount,
      price: limitPrice,
      orderType: OrderType.LIMIT,
      expiresAt,
      icebergSize
    }, currentTick);
  }

  createStopLossOrder(
    playerId: string,
    stock: Stock,
    side: 'buy' | 'sell',
    amount: number,
    triggerPrice: number,
    triggerType: 'gte' | 'lte',
    executionType: OrderType = OrderType.MARKET,
    executionPrice?: OrderPrice,
    currentTick?: number
  ): OrderResult {
    const stopCondition: StopCondition = {
      triggerPrice,
      triggerType,
      orderType: executionType,
      orderPrice: executionPrice || { type: 'market' }
    };

    const orderType = side === 'sell' ? OrderType.STOP_LOSS : OrderType.STOP_PROFIT;

    return this.createOrder({
      playerId,
      stockId: stock.id,
      stockName: stock.name,
      side,
      amount,
      orderType,
      stopCondition
    }, currentTick || Date.now());
  }

  createTrailingStopOrder(
    playerId: string,
    stock: Stock,
    side: 'buy' | 'sell',
    amount: number,
    trailingPercent?: number,
    trailingDistance?: number,
    currentTick?: number
  ): OrderResult {
    if (!trailingPercent && !trailingDistance) {
      return { success: false, error: '必须设置追踪百分比或追踪距离' };
    }

    const isBuySide = side === 'buy';
    const triggerType: 'gte' | 'lte' = isBuySide ? 'lte' : 'gte';

    const triggerPrice = isBuySide
      ? stock.price * (1 - (trailingPercent || 0) / 100) - (trailingDistance || 0)
      : stock.price * (1 + (trailingPercent || 0) / 100) + (trailingDistance || 0);

    const stopCondition: StopCondition = {
      triggerPrice: Math.round(triggerPrice * 100) / 100,
      triggerType,
      orderType: OrderType.MARKET,
      orderPrice: { type: 'market' }
    };

    const order: ExtendedOrder = {
      id: generateId(),
      playerId,
      stockId: stock.id,
      type: OrderType.TRAILING_STOP,
      side,
      status: OrderStatus.PENDING,
      price: { type: 'market' },
      amount,
      filledAmount: 0,
      stopCondition,
      trailingPercent,
      trailingDistance,
      icebergFilled: 0,
      timestamp: currentTick || Date.now()
    };

    this.orders.set(order.id, order);

    return {
      success: true,
      order,
      estimatedPrice: stock.price
    };
  }

  createIcebergOrder(
    playerId: string,
    stockId: string,
    side: 'buy' | 'sell',
    amount: number,
    limitPrice: number,
    icebergSize: number,
    currentTick: number,
    expiresAt?: number
  ): OrderResult {
    if (icebergSize <= 0 || icebergSize >= amount) {
      return { success: false, error: '冰山订单大小必须大于0且小于总数量' };
    }

    return this.createOrder({
      playerId,
      stockId,
      stockName: '',
      side,
      amount,
      price: limitPrice,
      orderType: OrderType.LIMIT,
      expiresAt,
      icebergSize
    }, currentTick);
  }

  checkStopCondition(order: ExtendedOrder, currentPrice: number): OrderMatchResult {
    if (!order.stopCondition) {
      return { matched: false };
    }

    const { triggerPrice, triggerType } = order.stopCondition;

    if (triggerType === 'gte' && currentPrice >= triggerPrice) {
      return {
        matched: true,
        triggerPrice,
        currentPrice,
        message: `价格已触及止损/止盈线 ${triggerPrice}`
      };
    }

    if (triggerType === 'lte' && currentPrice <= triggerPrice) {
      return {
        matched: true,
        triggerPrice,
        currentPrice,
        message: `价格已触及止损/止盈线 ${triggerPrice}`
      };
    }

    return { matched: false };
  }

  updateTrailingStop(order: ExtendedOrder, currentPrice: number, highPrice: number, lowPrice: number): void {
    if (order.type !== OrderType.TRAILING_STOP || !order.stopCondition) {
      return;
    }

    const isSellSide = order.side === 'sell';
    const newTriggerPrice = isSellSide
      ? highPrice * (1 - (order.trailingPercent || 0) / 100) - (order.trailingDistance || 0)
      : lowPrice * (1 + (order.trailingPercent || 0) / 100) + (order.trailingDistance || 0);

    const roundedNewTrigger = Math.round(newTriggerPrice * 100) / 100;
    const currentTrigger = order.stopCondition.triggerPrice;

    if (isSellSide) {
      if (roundedNewTrigger > currentTrigger) {
        order.stopCondition.triggerPrice = roundedNewTrigger;
      }
    } else {
      if (roundedNewTrigger < currentTrigger) {
        order.stopCondition.triggerPrice = roundedNewTrigger;
      }
    }
  }

  executeOrder(
    order: ExtendedOrder,
    stock: Stock,
    amount: number,
    currentTick: number
  ): OrderExecutionResult {
    const remaining = order.amount - order.filledAmount;
    const fillAmount = Math.min(remaining, amount);
    const executionPrice = this.calculateExecutionPrice(order, stock, fillAmount);
    const totalValue = fillAmount * executionPrice;

    const updatedOrder = this.orders.get(order.id);
    if (updatedOrder) {
      updatedOrder.filledAmount += fillAmount;
      updatedOrder.status = updatedOrder.filledAmount >= order.amount
        ? OrderStatus.FILLED
        : OrderStatus.PARTIAL;

      if (updatedOrder.icebergSize) {
        updatedOrder.icebergFilled += fillAmount;
      }
    }

    return {
      success: true,
      filledAmount: fillAmount,
      avgPrice: Math.round(executionPrice * 100) / 100,
      totalValue: Math.round(totalValue * 100) / 100,
      remainingAmount: order.amount - order.filledAmount - fillAmount
    };
  }

  calculateExecutionPrice(order: ExtendedOrder, stock: Stock, amount: number): number {
    if (order.price.type === 'market') {
      if (order.side === 'buy') {
        return stock.sellBook?.[0]?.p || stock.price;
      } else {
        return stock.buyBook?.[0]?.p || stock.price;
      }
    }

    if (order.price.type === 'limit' && order.price.limitPrice) {
      return order.price.limitPrice;
    }

    return stock.price;
  }

  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELLED) {
      return false;
    }

    order.status = OrderStatus.CANCELLED;
    return true;
  }

  expireOrders(currentTick: number): ExtendedOrder[] {
    const expired: ExtendedOrder[] = [];

    for (const order of this.orders.values()) {
      if (order.status === OrderStatus.PENDING &&
          order.expiresAt &&
          currentTick >= order.expiresAt) {
        order.status = OrderStatus.EXPIRED;
        expired.push(order);
      }
    }

    return expired;
  }

  getPendingOrders(playerId?: string): ExtendedOrder[] {
    const pending: ExtendedOrder[] = [];

    for (const order of this.orders.values()) {
      if (order.status === OrderStatus.PENDING || order.status === OrderStatus.PARTIAL) {
        if (!playerId || order.playerId === playerId) {
          pending.push(order);
        }
      }
    }

    return pending;
  }

  getOrderById(orderId: string): ExtendedOrder | undefined {
    return this.orders.get(orderId);
  }

  getOrdersByStock(stockId: string): ExtendedOrder[] {
    return Array.from(this.orders.values()).filter(
      o => o.stockId === stockId &&
           (o.status === OrderStatus.PENDING || o.status === OrderStatus.PARTIAL)
    );
  }

  getOrderBookImbalance(stockId: string, currentPrice: number): { buyVolume: number; sellVolume: number; imbalance: number } {
    const orders = this.getOrdersByStock(stockId);

    let buyVolume = 0;
    let sellVolume = 0;

    for (const order of orders) {
      if (order.side === 'buy') {
        buyVolume += order.amount - order.filledAmount;
      } else {
        sellVolume += order.amount - order.filledAmount;
      }
    }

    const total = buyVolume + sellVolume;
    const imbalance = total > 0 ? (buyVolume - sellVolume) / total : 0;

    return { buyVolume, sellVolume, imbalance: Math.round(imbalance * 10000) / 100 };
  }

  estimateSlippage(order: ExtendedOrder, stock: Stock, amount: number): number {
    const book = order.side === 'buy' ? stock.sellBook : stock.buyBook;
    if (!book || book.length === 0) return 0;

    let remaining = amount;
    let totalCost = 0;
    let filled = 0;

    for (const item of book) {
      if (remaining <= 0) break;

      const take = Math.min(remaining, item.v);
      totalCost += take * item.p;
      remaining -= take;
      filled += take;
    }

    if (filled === 0) return 0;

    const avgPrice = totalCost / filled;
    const currentPrice = order.side === 'buy' ? book[0]?.p : book[0]?.p;

    return Math.abs((avgPrice - currentPrice) / currentPrice);
  }

  validateOrder(params: OrderCreationParams, player: Player, stock: Stock): { valid: boolean; error?: string } {
    const { side, amount, price, orderType } = params;

    if (amount <= 0) {
      return { valid: false, error: '订单数量必须大于0' };
    }

    if (orderType === OrderType.LIMIT && (!price || price <= 0)) {
      return { valid: false, error: '限价单必须指定有效价格' };
    }

    const estimatedCost = amount * (price || stock.price);
    const fee = estimatedCost * this.settings.transactionFeeRate;

    if (side === 'buy') {
      if (player.cash < estimatedCost + fee) {
        return { valid: false, error: `资金不足，需要 ${Math.round(estimatedCost + fee)} 元` };
      }
    } else {
      const currentShares = player.portfolio[stock.id] || 0;
      if (currentShares < amount) {
        return { valid: false, error: `持仓不足，当前持有 ${currentShares} 股` };
      }
    }

    return { valid: true };
  }

  private buildPriceConfig(orderType: OrderType, price?: number): OrderPrice {
    if (orderType === OrderType.MARKET) {
      return { type: 'market' };
    }

    return {
      type: 'limit',
      limitPrice: price
    };
  }

  private estimateOrderPrice(orderType: OrderType, price: number | undefined, stockId: string): number {
    switch (orderType) {
      case OrderType.MARKET:
        return 0;
      case OrderType.STOP_LOSS:
      case OrderType.STOP_PROFIT:
      case OrderType.TRAILING_STOP:
        return price || 0;
      case OrderType.LIMIT:
      default:
        return price || 0;
    }
  }

  getOrderStats(): {
    total: number;
    pending: number;
    filled: number;
    cancelled: number;
    byType: { [key in OrderType]: number };
  } {
    const stats = {
      total: 0,
      pending: 0,
      filled: 0,
      cancelled: 0,
      byType: {} as { [key in OrderType]: number }
    };

    for (const order of this.orders.values()) {
      stats.total++;

      switch (order.status) {
        case OrderStatus.PENDING:
        case OrderStatus.PARTIAL:
          stats.pending++;
          break;
        case OrderStatus.FILLED:
          stats.filled++;
          break;
        case OrderStatus.CANCELLED:
        case OrderStatus.EXPIRED:
          stats.cancelled++;
          break;
      }

      stats.byType[order.type] = (stats.byType[order.type] || 0) + 1;
    }

    return stats;
  }

  clearExpiredOrders(): void {
    const now = Date.now();
    for (const [id, order] of this.orders.entries()) {
      if (order.status === OrderStatus.CANCELLED ||
          order.status === OrderStatus.EXPIRED ||
          order.status === OrderStatus.FILLED) {
        this.orders.delete(id);
      }
    }
  }
}

export const createOrderService = (settings: GameSettings): OrderService => {
  return new OrderService(settings);
};
