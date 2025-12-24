// 游戏广场相关路由
import express from 'express';
import { getAvailableRooms, createGameRoom, joinGameRoom, generateRoomCode } from '../controllers/gamePlazaController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// 获取可用房间列表
router.get('/rooms', authenticateToken, getAvailableRooms);

// 生成房间码（不创建房间）
router.post('/rooms/generate-code', authenticateToken, generateRoomCode);

// 创建游戏房间
router.post('/rooms', authenticateToken, createGameRoom);

// 加入游戏房间
router.post('/rooms/:roomId/join', authenticateToken, joinGameRoom);

export default router;