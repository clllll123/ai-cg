// 局域网游戏房间发现服务
import dgram from 'dgram';
import { GameRoomInfo, DiscoveryMessage } from '../types/gamePlaza';

class RoomDiscoveryService {
  private broadcastPort = 8888;
  private discoveryPort = 8889;
  private broadcastSocket: dgram.Socket;
  private discoverySocket: dgram.Socket;
  private knownRooms: Map<string, GameRoomInfo> = new Map();
  private roomTimeout = 30000; // 30秒超时

  constructor() {
    this.broadcastSocket = dgram.createSocket('udp4');
    this.discoverySocket = dgram.createSocket('udp4');
    this.setupBroadcastSocket();
    this.setupDiscoverySocket();
    this.startRoomCleanup();
  }

  // 设置广播套接字（房间主机使用）
  private setupBroadcastSocket() {
    this.broadcastSocket.bind(this.broadcastPort, () => {
      this.broadcastSocket.setBroadcast(true);
      console.log(`广播服务已启动，端口: ${this.broadcastPort}`);
    });

    this.broadcastSocket.on('error', (err) => {
      console.error('广播套接字错误:', err);
    });
  }

  // 设置发现套接字（客户端使用）
  private setupDiscoverySocket() {
    this.discoverySocket.bind(this.discoveryPort, () => {
      console.log(`发现服务已启动，端口: ${this.discoveryPort}`);
    });

    this.discoverySocket.on('message', (msg, rinfo) => {
      try {
        const message: DiscoveryMessage = JSON.parse(msg.toString());
        this.handleDiscoveryMessage(message, rinfo);
      } catch (error) {
        console.error('解析发现消息失败:', error);
      }
    });

    this.discoverySocket.on('error', (err) => {
      console.error('发现套接字错误:', err);
    });
  }

  // 处理发现消息
  private handleDiscoveryMessage(message: DiscoveryMessage, rinfo: dgram.RemoteInfo) {
    switch (message.type) {
      case 'broadcast':
        // 收到房间广播，更新房间信息
        this.updateRoomInfo(message.roomInfo, rinfo.address);
        // 发送响应确认
        this.sendDiscoveryResponse(rinfo);
        break;
      case 'heartbeat':
        // 收到心跳包，更新房间活跃时间
        this.updateRoomInfo(message.roomInfo, rinfo.address);
        break;
    }
  }

  // 更新房间信息
  private updateRoomInfo(roomInfo: GameRoomInfo, ipAddress: string) {
    const roomKey = `${ipAddress}:${roomInfo.roomId}`;
    roomInfo.ipAddress = ipAddress;
    roomInfo.lastUpdated = new Date();
    
    this.knownRooms.set(roomKey, roomInfo);
    console.log(`更新房间信息: ${roomInfo.roomCode} (${roomInfo.playerCount}/${roomInfo.maxPlayers})`);
  }

  // 发送发现响应
  private sendDiscoveryResponse(rinfo: dgram.RemoteInfo) {
    const response: DiscoveryMessage = {
      type: 'response',
      roomInfo: null as any, // 客户端不需要房间信息
      timestamp: Date.now(),
      signature: this.generateSignature()
    };

    const message = JSON.stringify(response);
    this.discoverySocket.send(message, rinfo.port, rinfo.address);
  }

  // 开始广播房间存在（房间主机调用）
  public startRoomBroadcast(roomInfo: GameRoomInfo) {
    const broadcastMessage: DiscoveryMessage = {
      type: 'broadcast',
      roomInfo,
      timestamp: Date.now(),
      signature: this.generateSignature()
    };

    const message = JSON.stringify(broadcastMessage);
    const broadcastAddress = '255.255.255.255';

    // 定期广播房间信息
    const broadcastInterval = setInterval(() => {
      this.broadcastSocket.send(message, this.discoveryPort, broadcastAddress);
    }, 5000); // 每5秒广播一次

    // 返回停止广播的函数
    return () => {
      clearInterval(broadcastInterval);
    };
  }

  // 发送心跳包（房间主机调用）
  public sendHeartbeat(roomInfo: GameRoomInfo) {
    const heartbeatMessage: DiscoveryMessage = {
      type: 'heartbeat',
      roomInfo,
      timestamp: Date.now(),
      signature: this.generateSignature()
    };

    const message = JSON.stringify(heartbeatMessage);
    const broadcastAddress = '255.255.255.255';
    
    this.broadcastSocket.send(message, this.discoveryPort, broadcastAddress);
  }

  // 获取已知房间列表
  public getAvailableRooms(): GameRoomInfo[] {
    const now = Date.now();
    const availableRooms: GameRoomInfo[] = [];

    for (const [key, roomInfo] of this.knownRooms) {
      const lastUpdateTime = roomInfo.lastUpdated.getTime();
      if (now - lastUpdateTime <= this.roomTimeout) {
        availableRooms.push(roomInfo);
      }
    }

    // 按房间状态和玩家数量排序
    return availableRooms.sort((a, b) => {
      // 等待中的房间优先
      if (a.gameStatus === 'waiting' && b.gameStatus !== 'waiting') return -1;
      if (a.gameStatus !== 'waiting' && b.gameStatus === 'waiting') return 1;
      
      // 玩家数量多的优先
      return b.playerCount - a.playerCount;
    });
  }

  // 根据房间ID获取房间信息
  public getRoomById(roomId: string): GameRoomInfo | null {
    for (const [key, roomInfo] of this.knownRooms) {
      if (roomInfo.roomId === roomId) {
        const now = Date.now();
        const lastUpdateTime = roomInfo.lastUpdated.getTime();
        if (now - lastUpdateTime <= this.roomTimeout) {
          return roomInfo;
        }
      }
    }
    return null;
  }

  // 注册新房间（用于WebSocket服务创建房间）
  public registerRoom(roomInfo: GameRoomInfo): void {
    const roomKey = `${roomInfo.ipAddress}:${roomInfo.roomId}`;
    roomInfo.lastUpdated = new Date();
    this.knownRooms.set(roomKey, roomInfo);
    console.log(`注册新房间: ${roomInfo.roomCode} (${roomInfo.playerCount}/${roomInfo.maxPlayers})`);
  }

  // 清理超时房间
  private startRoomCleanup() {
    setInterval(() => {
      const now = Date.now();
      let removedCount = 0;

      for (const [key, roomInfo] of this.knownRooms) {
        const lastUpdateTime = roomInfo.lastUpdated.getTime();
        if (now - lastUpdateTime > this.roomTimeout) {
          this.knownRooms.delete(key);
          removedCount++;
          console.log(`清理超时房间: ${roomInfo.roomCode}`);
        }
      }

      if (removedCount > 0) {
        console.log(`清理完成，移除了 ${removedCount} 个超时房间`);
      }
    }, 10000); // 每10秒清理一次
  }

  // 生成消息签名（简单实现）
  private generateSignature(): string {
    return Buffer.from(Date.now().toString()).toString('base64');
  }

  // 验证消息签名
  private verifySignature(message: DiscoveryMessage): boolean {
    // 简单的签名验证逻辑
    const expectedSignature = this.generateSignature();
    return Math.abs(Date.now() - message.timestamp) < 60000; // 1分钟内有效
  }

  // 关闭服务
  public close() {
    this.broadcastSocket.close();
    this.discoverySocket.close();
    console.log('房间发现服务已关闭');
  }
}

export const roomDiscoveryService = new RoomDiscoveryService();