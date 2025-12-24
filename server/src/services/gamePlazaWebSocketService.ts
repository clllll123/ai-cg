import { Server } from 'socket.io';
import { GameRoomInfo } from '../types/gamePlaza';
import { roomDiscoveryService } from './roomDiscoveryService';

export class GamePlazaWebSocketService {
  private io: Server;
  private connectedClients: Map<string, any> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
    this.startRoomStatusSync();
  }

  // 设置Socket.IO处理器
  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('游戏广场客户端连接:', socket.id);
      
      // 存储客户端信息
      this.connectedClients.set(socket.id, {
        socket,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      // 发送初始房间列表
      this.sendRoomList(socket);

      // 处理房间列表请求
      socket.on('getRooms', () => {
        this.sendRoomList(socket);
      });

      // 处理加入房间请求
      socket.on('joinRoom', (data: { roomId: string, playerName: string }) => {
        this.handleJoinRoom(socket, data);
      });

      // 处理创建房间请求
      socket.on('createRoom', (data: { roomName: string, maxPlayers: number }) => {
        this.handleCreateRoom(socket, data);
      });

      // 处理心跳
      socket.on('heartbeat', () => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.lastActivity = new Date();
        }
      });

      // 处理断开连接
      socket.on('disconnect', () => {
        console.log('游戏广场客户端断开连接:', socket.id);
        this.connectedClients.delete(socket.id);
      });

      // 处理错误
      socket.on('error', (error) => {
        console.error('Socket错误:', error);
      });
    });
  }

  // 发送房间列表给客户端
  private sendRoomList(socket: any) {
    try {
      const rooms = roomDiscoveryService.getAvailableRooms();
      socket.emit('roomList', {
        success: true,
        data: rooms,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('发送房间列表失败:', error);
      socket.emit('roomList', {
        success: false,
        error: '获取房间列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 处理加入房间请求
  private async handleJoinRoom(socket: any, data: { roomId: string, playerName: string }) {
    try {
      const { roomId, playerName } = data;
      
      // 验证房间是否存在
      const room = roomDiscoveryService.getRoomById(roomId);
      if (!room) {
        socket.emit('joinRoomResult', {
          success: false,
          error: '房间不存在或已关闭'
        });
        return;
      }

      // 验证房间状态
      if (room.gameStatus !== 'waiting') {
        socket.emit('joinRoomResult', {
          success: false,
          error: '游戏已开始，无法加入'
        });
        return;
      }

      // 验证玩家数量
      if (room.playerCount >= room.maxPlayers) {
        socket.emit('joinRoomResult', {
          success: false,
          error: '房间已满'
        });
        return;
      }

      // 模拟加入房间逻辑
      const joinResult = {
        success: true,
        data: {
          roomInfo: room,
          playerName,
          joinTime: new Date(),
          playerId: `player_${Date.now()}`
        }
      };

      socket.emit('joinRoomResult', joinResult);
      
      // 广播房间状态更新
      this.broadcastRoomUpdate(roomId);
      
    } catch (error) {
      console.error('处理加入房间请求失败:', error);
      socket.emit('joinRoomResult', {
        success: false,
        error: '加入房间失败'
      });
    }
  }

  // 处理创建房间请求
  private async handleCreateRoom(socket: any, data: { roomName: string, maxPlayers: number, hostName?: string }) {
    try {
      const { roomName, maxPlayers, hostName = '玩家' } = data;
      
      // 获取客户端真实IP地址
      const clientIp = socket.handshake.address || '127.0.0.1';
      const realIp = clientIp === '127.0.0.1' ? 'localhost' : clientIp;
      
      // 生成房间信息
      const roomInfo: GameRoomInfo = {
        roomId: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        roomCode: Math.floor(1000 + Math.random() * 9000).toString(),
        hostName: hostName,
        playerCount: 1, // 房主自己
        maxPlayers: Math.min(maxPlayers, 10), // 限制最大玩家数
        gameStatus: 'waiting',
        createdAt: new Date(),
        lastUpdated: new Date(),
        ipAddress: realIp,
        port: 3001, // 服务器端口
        gameTitle: roomName || 'AI股市操盘手'
      };

      // 注册房间到发现服务
      roomDiscoveryService.registerRoom(roomInfo);

      socket.emit('createRoomResult', {
        success: true,
        data: roomInfo
      });

      // 广播新房间创建
      this.broadcastRoomListUpdate();
      
    } catch (error) {
      console.error('处理创建房间请求失败:', error);
      socket.emit('createRoomResult', {
        success: false,
        error: '创建房间失败'
      });
    }
  }

  // 广播房间列表更新给所有客户端
  private broadcastRoomListUpdate() {
    try {
      const rooms = roomDiscoveryService.getAvailableRooms();
      this.io.emit('roomListUpdate', {
        success: true,
        data: rooms,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('广播房间列表更新失败:', error);
    }
  }

  // 广播特定房间的更新
  private broadcastRoomUpdate(roomId: string) {
    try {
      const room = roomDiscoveryService.getRoomById(roomId);
      if (room) {
        this.io.emit('roomUpdate', {
          roomId,
          roomInfo: room,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('广播房间更新失败:', error);
    }
  }

  // 启动房间状态同步
  private startRoomStatusSync() {
    // 每3秒同步一次房间状态
    setInterval(() => {
      this.broadcastRoomListUpdate();
    }, 3000);

    // 清理不活跃的客户端（超过30秒无活动）
    setInterval(() => {
      const now = new Date();
      for (const [clientId, client] of this.connectedClients.entries()) {
        const inactiveTime = now.getTime() - client.lastActivity.getTime();
        if (inactiveTime > 30000) { // 30秒
          console.log('清理不活跃客户端:', clientId);
          client.socket.disconnect();
          this.connectedClients.delete(clientId);
        }
      }
    }, 10000); // 每10秒检查一次
  }

  // 获取连接统计信息
  public getConnectionStats() {
    return {
      connectedClients: this.connectedClients.size,
      activeRooms: roomDiscoveryService.getAvailableRooms().length
    };
  }
}

export default GamePlazaWebSocketService;