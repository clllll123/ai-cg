// 后端专用类型定义

export enum Sector {
  TECH = '互联网/科技',
  ENERGY = '新能源/造车',
  CONSUMER = '大消费/食品',
  REAL_ESTATE = '房地产/基建',
  MEDICAL = '生物医药',
  GAME = '电子游戏', 
  TOY = '潮玩/手办', 
  FINANCE = '金融/银行',
  MANUFACTURING = '高端制造',
  LOGISTICS = '物流/运输',
  AGRICULTURE = '农业/养殖'
}

export interface EventEffect {
  type: 'MARKET_SENTIMENT' | 'SECTOR_BOOST' | 'SECTOR_CRASH' | 'VOLATILITY_CHANGE';
  target?: Sector; 
  value: number; 
  description: string;
}

export interface DailyEvent {
  id: string;
  title: string;
  description: string;
  effects: EventEffect[];
  newsFlash: string; 
  triggerCondition?: 'MORNING' | 'AFTERNOON' | 'RANDOM';
}