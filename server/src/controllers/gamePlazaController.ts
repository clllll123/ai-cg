// 游戏广场控制器
import { Request, Response } from 'express';
import { roomDiscoveryService } from '../services/roomDiscoveryService';
import { GamePlazaResponse, JoinRoomRequest, JoinRoomResponse } from '../types/gamePlaza';

// 生成房间码
export const generateRoomCode = async (req: Request, res: Response) => {
  try {
    // 生成6位随机房间码
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    res.json({
      success: true,
      data: {
        roomCode
      }
    });
  } catch (error) {
    console.error('生成房间码失败:', error);
    res.status(500).json({
      success: false,
      error: '生成房间码失败'
    });
  }
};

// 获取可用房间列表
export const getAvailableRooms = async (req: Request, res: Response) => {
  try {
    const rooms = roomDiscoveryService.getAvailableRooms();
    
    const response: GamePlazaResponse = {
      success: true,
      data: rooms
    };
    
    res.json(response);
  } catch (error) {
    console.error('获取房间列表失败:', error);
    
    const response: GamePlazaResponse = {
      success: false,
      error: '获取房间列表失败'
    };
    
    res.status(500).json(response);
  }
};

// 加入游戏房间
export const joinGameRoom = async (req: Request<{}, {}, JoinRoomRequest>, res: Response) => {
  try {
    const { roomId, playerName, playerId } = req.body;
    
    // 验证请求参数
    if (!roomId || !playerName) {
      const response: JoinRoomResponse = {
        success: false,
        error: '房间ID和玩家名称不能为空'
      };
      return res.status(400).json(response);
    }
    
    // 查找目标房间
    const availableRooms = roomDiscoveryService.getAvailableRooms();
    const targetRoom = availableRooms.find(room => room.roomId === roomId);
    
    if (!targetRoom) {
      const response: JoinRoomResponse = {
        success: false,
        error: '房间不存在或已关闭'
      };
      return res.status(404).json(response);
    }
    
    // 检查房间状态
    if (targetRoom.gameStatus !== 'waiting') {
      const response: JoinRoomResponse = {
        success: false,
        error: '房间已开始游戏，无法加入'
      };
      return res.status(400).json(response);
    }
    
    // 检查玩家数量
    if (targetRoom.playerCount >= targetRoom.maxPlayers) {
      const response: JoinRoomResponse = {
        success: false,
        error: '房间已满，无法加入'
      };
      return res.status(400).json(response);
    }
    
    // 生成加入令牌（简化实现）
    const joinToken = Buffer.from(`${roomId}:${playerName}:${Date.now()}`).toString('base64');
    
    // 构建WebSocket连接地址
    const websocketUrl = `ws://${targetRoom.ipAddress}:${targetRoom.port}/game/${roomId}`;
    
    const response: JoinRoomResponse = {
      success: true,
      data: {
        roomInfo: targetRoom,
        joinToken,
        websocketUrl
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('加入房间失败:', error);
    
    const response: JoinRoomResponse = {
      success: false,
      error: '加入房间失败'
    };
    
    res.status(500).json(response);
  }
};

// 创建游戏房间（供房间主机调用）
export const createGameRoom = async (req: Request, res: Response) => {
  try {
    const { roomCode, hostName, maxPlayers, gameTitle, gameMode } = req.body;
    
    // 验证参数
    if (!roomCode || !hostName || !maxPlayers) {
      return res.status(400).json({
        success: false,
        error: '房间号、房主名称和最大玩家数不能为空'
      });
    }
    
    // 创建房间信息
    const roomInfo = {
      roomId: roomCode,
      roomCode,
      hostName,
      playerCount: 1, // 房主自己
      maxPlayers: parseInt(maxPlayers),
      gameStatus: 'waiting' as const,
      createdAt: new Date(),
      lastUpdated: new Date(),
      ipAddress: req.ip || '127.0.0.1',
      port: 3000, // 默认端口
      gameTitle: gameTitle || 'AI股市操盘手',
      gameMode: gameMode || '标准模式'
    };
    
    // 开始广播房间存在
    const stopBroadcast = roomDiscoveryService.startRoomBroadcast(roomInfo);
    
    // 返回房间创建成功信息
    res.json({
      success: true,
      data: {
        roomInfo,
        stopBroadcast: true // 表示可以停止广播
      }
    });
    
  } catch (error) {
    console.error('创建房间失败:', error);
    res.status(500).json({
      success: false,
      error: '创建房间失败'
    });
  }
};