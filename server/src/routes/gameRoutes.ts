// 游戏相关路由
import express from 'express';
import { saveGameResult, getGameHistory, getPlayerLevelInfo, getLeaderboard } from '../controllers/gameController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// 保存游戏结果
router.post('/results', authenticateToken, saveGameResult);

// 获取玩家游戏历史
router.get('/history/:userId', authenticateToken, getGameHistory);

// 获取玩家等级信息
router.get('/level/:userId', authenticateToken, getPlayerLevelInfo);

// 获取排行榜
router.get('/leaderboard', getLeaderboard);

export default router;