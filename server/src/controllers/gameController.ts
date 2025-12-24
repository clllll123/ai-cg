// 游戏控制器
// 处理游戏结果保存、经验值计算等逻辑

import { Request, Response } from 'express';
import prisma from '../utils/db';
import { ExperienceService } from '../services/experienceService';

interface GameResultData {
  roomId: string;
  userId: string;
  finalAssets: number;
  initialAssets: number;
  rank: number;
  totalPlayers: number;
  tradeCount: number;
  peakValue: number;
  isWinner: boolean;
}

/**
 * 保存游戏结果并更新玩家经验值
 */
export const saveGameResult = async (req: Request, res: Response) => {
  try {
    const { roomId, userId, finalAssets, initialAssets, rank, totalPlayers, tradeCount, peakValue, isWinner }: GameResultData = req.body;

    // 验证必需字段
    if (!roomId || !userId || finalAssets === undefined || initialAssets === undefined || !rank || !totalPlayers) {
      return res.status(400).json({ error: '缺少必需的游戏结果数据' });
    }

    // 获取玩家当前信息
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 计算表现评分
    const performanceScore = ExperienceService.calculatePerformanceScore(
      finalAssets,
      initialAssets,
      tradeCount,
      peakValue
    );

    // 计算获得的经验值
    const expGained = ExperienceService.calculateExperience(
      rank,
      totalPlayers,
      isWinner,
      performanceScore
    );

    // 计算新的经验值
    const newExperience = user.experience + expGained;
    
    // 检查是否升级
    const levelUpInfo = ExperienceService.checkLevelUp(user.experience, newExperience);

    // 保存游戏结果
    const gameResult = await prisma.gameResult.create({
      data: {
        roomId,
        userId,
        finalAssets,
        rank,
        playedAt: new Date()
      }
    });

    // 更新玩家数据
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        totalGames: user.totalGames + 1,
        totalWins: isWinner ? user.totalWins + 1 : user.totalWins,
        totalAssets: finalAssets > user.totalAssets ? finalAssets : user.totalAssets, // 更新最高资产
        experience: newExperience,
        level: levelUpInfo.newLevel,
        nextLevelExp: ExperienceService.getLevelInfo(newExperience).nextLevelExp,
        rank: levelUpInfo.newRank
      }
    });

    res.status(201).json({
      success: true,
      data: {
        gameResult,
        user: {
          id: updatedUser.id,
          level: updatedUser.level,
          experience: updatedUser.experience,
          nextLevelExp: updatedUser.nextLevelExp,
          rank: updatedUser.rank,
          expGained,
          leveledUp: levelUpInfo.leveledUp,
          oldLevel: levelUpInfo.oldLevel,
          newLevel: levelUpInfo.newLevel,
          oldRank: levelUpInfo.oldRank,
          newRank: levelUpInfo.newRank
        }
      }
    });

  } catch (error: any) {
    console.error('保存游戏结果失败:', error);
    res.status(500).json({ error: '保存游戏结果失败' });
  }
};

/**
 * 获取玩家游戏历史
 */
export const getGameHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const gameHistory = await prisma.gameResult.findMany({
      where: { userId },
      include: {
        room: {
          select: {
            id: true,
            code: true,
            endedAt: true
          }
        }
      },
      orderBy: { playedAt: 'desc' },
      take: 20 // 最近20场游戏
    });

    res.json({
      success: true,
      data: gameHistory
    });

  } catch (error: any) {
    console.error('获取游戏历史失败:', error);
    res.status(500).json({ error: '获取游戏历史失败' });
  }
};

/**
 * 获取玩家等级信息
 */
export const getPlayerLevelInfo = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        level: true,
        experience: true,
        nextLevelExp: true,
        rank: true,
        totalGames: true,
        totalWins: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const levelInfo = ExperienceService.getLevelInfo(user.experience);
    
    res.json({
      success: true,
      data: {
        ...user,
        progressToNextLevel: ((user.experience - levelInfo.expRequired) / (levelInfo.nextLevelExp - levelInfo.expRequired)) * 100,
        expToNextLevel: levelInfo.nextLevelExp - user.experience
      }
    });

  } catch (error: any) {
    console.error('获取玩家等级信息失败:', error);
    res.status(500).json({ error: '获取玩家等级信息失败' });
  }
};

/**
 * 获取排行榜
 */
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { type = 'level', limit = 50 } = req.query;

    let orderBy: any;
    
    switch (type) {
      case 'assets':
        orderBy = { totalAssets: 'desc' };
        break;
      case 'wins':
        orderBy = { totalWins: 'desc' };
        break;
      case 'games':
        orderBy = { totalGames: 'desc' };
        break;
      case 'level':
      default:
        orderBy = [
          { level: 'desc' },
          { experience: 'desc' }
        ];
        break;
    }

    const leaderboard = await prisma.user.findMany({
      where: {
        role: 'USER' // 只显示普通玩家，排除管理员
      },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        level: true,
        experience: true,
        rank: true,
        totalGames: true,
        totalWins: true,
        totalAssets: true
      },
      orderBy,
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: leaderboard
    });

  } catch (error: any) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ error: '获取排行榜失败' });
  }
};