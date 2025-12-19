// 玩家经验值计算服务
// 负责处理玩家等级、经验值、段位等成长系统逻辑

export interface ExperienceConfig {
  baseExp: number; // 基础经验值
  winMultiplier: number; // 胜利加成
  rankMultiplier: number; // 排名加成
  performanceBonus: number; // 表现加成
}

export interface LevelConfig {
  level: number;
  expRequired: number;
  rank: string;
}

export class ExperienceService {
  private static readonly LEVEL_CONFIGS: LevelConfig[] = [
    { level: 1, expRequired: 0, rank: '青铜' },
    { level: 2, expRequired: 100, rank: '青铜' },
    { level: 3, expRequired: 300, rank: '青铜' },
    { level: 4, expRequired: 600, rank: '青铜' },
    { level: 5, expRequired: 1000, rank: '白银' },
    { level: 6, expRequired: 1500, rank: '白银' },
    { level: 7, expRequired: 2100, rank: '白银' },
    { level: 8, expRequired: 2800, rank: '白银' },
    { level: 9, expRequired: 3600, rank: '黄金' },
    { level: 10, expRequired: 4500, rank: '黄金' },
    { level: 11, expRequired: 5500, rank: '黄金' },
    { level: 12, expRequired: 6600, rank: '黄金' },
    { level: 13, expRequired: 7800, rank: '铂金' },
    { level: 14, expRequired: 9100, rank: '铂金' },
    { level: 15, expRequired: 10500, rank: '铂金' },
    { level: 16, expRequired: 12000, rank: '铂金' },
    { level: 17, expRequired: 13600, rank: '钻石' },
    { level: 18, expRequired: 15300, rank: '钻石' },
    { level: 19, expRequired: 17100, rank: '钻石' },
    { level: 20, expRequired: 19000, rank: '钻石' },
    { level: 21, expRequired: 21000, rank: '大师' },
    { level: 22, expRequired: 23100, rank: '大师' },
    { level: 23, expRequired: 25300, rank: '大师' },
    { level: 24, expRequired: 27600, rank: '大师' },
    { level: 25, expRequired: 30000, rank: '王者' },
    { level: 26, expRequired: 32500, rank: '王者' },
    { level: 27, expRequired: 35100, rank: '王者' },
    { level: 28, expRequired: 37800, rank: '王者' },
    { level: 29, expRequired: 40600, rank: '王者' },
    { level: 30, expRequired: 43500, rank: '王者' }
  ];

  private static readonly DEFAULT_CONFIG: ExperienceConfig = {
    baseExp: 50,
    winMultiplier: 1.5,
    rankMultiplier: 0.8,
    performanceBonus: 0.3
  };

  /**
   * 计算游戏结束后玩家获得的经验值
   * @param finalRank 最终排名 (1 = 第一名)
   * @param totalPlayers 总玩家数
   * @param isWinner 是否获胜
   * @param performanceScore 表现评分 (0-1)
   * @param config 经验值配置
   */
  static calculateExperience(
    finalRank: number,
    totalPlayers: number,
    isWinner: boolean,
    performanceScore: number = 0.5,
    config: ExperienceConfig = this.DEFAULT_CONFIG
  ): number {
    // 基础经验值
    let exp = config.baseExp;

    // 胜利加成
    if (isWinner) {
      exp *= config.winMultiplier;
    }

    // 排名加成 (排名越靠前加成越高)
    const rankBonus = 1 + (config.rankMultiplier * (totalPlayers - finalRank) / totalPlayers);
    exp *= rankBonus;

    // 表现加成
    exp += config.performanceBonus * performanceScore * config.baseExp;

    // 确保最小经验值
    return Math.max(Math.floor(exp), 10);
  }

  /**
   * 根据当前经验值获取玩家等级和段位
   * @param currentExp 当前经验值
   */
  static getLevelInfo(currentExp: number): { level: number; expRequired: number; nextLevelExp: number; rank: string } {
    for (let i = this.LEVEL_CONFIGS.length - 1; i >= 0; i--) {
      if (currentExp >= this.LEVEL_CONFIGS[i].expRequired) {
        const nextLevel = this.LEVEL_CONFIGS[i + 1];
        return {
          level: this.LEVEL_CONFIGS[i].level,
          expRequired: this.LEVEL_CONFIGS[i].expRequired,
          nextLevelExp: nextLevel ? nextLevel.expRequired : this.LEVEL_CONFIGS[i].expRequired + 1000,
          rank: this.LEVEL_CONFIGS[i].rank
        };
      }
    }
    
    // 默认返回最低等级
    return {
      level: 1,
      expRequired: 0,
      nextLevelExp: 100,
      rank: '青铜'
    };
  }

  /**
   * 检查玩家是否升级
   * @param oldExp 升级前经验值
   * @param newExp 升级后经验值
   */
  static checkLevelUp(oldExp: number, newExp: number): { leveledUp: boolean; oldLevel: number; newLevel: number; oldRank: string; newRank: string } {
    const oldInfo = this.getLevelInfo(oldExp);
    const newInfo = this.getLevelInfo(newExp);
    
    return {
      leveledUp: newInfo.level > oldInfo.level,
      oldLevel: oldInfo.level,
      newLevel: newInfo.level,
      oldRank: oldInfo.rank,
      newRank: newInfo.rank
    };
  }

  /**
   * 计算玩家表现评分
   * @param finalAssets 最终资产
   * @param initialAssets 初始资产
   * @param tradeCount 交易次数
   * @param peakValue 峰值资产
   */
  static calculatePerformanceScore(
    finalAssets: number,
    initialAssets: number,
    tradeCount: number,
    peakValue: number
  ): number {
    // 收益率评分 (0-0.5)
    const profitRatio = Math.max(0, (finalAssets - initialAssets) / initialAssets);
    const profitScore = Math.min(profitRatio * 0.5, 0.5);

    // 交易活跃度评分 (0-0.3)
    const tradeScore = Math.min(tradeCount * 0.05, 0.3);

    // 风险控制评分 (0-0.2)
    const drawdown = Math.max(0, (peakValue - finalAssets) / peakValue);
    const riskScore = Math.max(0, 0.2 - drawdown * 0.2);

    return Math.min(profitScore + tradeScore + riskScore, 1);
  }
}