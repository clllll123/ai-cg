// 游戏广场相关类型定义

export interface GameRoomInfo {
  roomId: string;           // 房间ID (如: "1234")
  roomCode: string;         // 房间号 (如: "1234")
  hostName: string;         // 房主名称
  playerCount: number;      // 当前玩家数量
  maxPlayers: number;       // 最大玩家数量
  gameStatus: 'waiting' | 'playing' | 'ended';  // 游戏状态
  createdAt: Date;          // 创建时间
  lastUpdated: Date;        // 最后更新时间
  ipAddress: string;        // 主机IP地址
  port: number;             // 服务端口
  gameTitle?: string;       // 游戏标题
  gameMode?: string;        // 游戏模式
}

export interface DiscoveryMessage {
  type: 'broadcast' | 'response' | 'heartbeat';
  roomInfo: GameRoomInfo;
  timestamp: number;
  signature: string;        // 消息签名，防止伪造
}

export interface GamePlazaResponse {
  success: boolean;
  data?: GameRoomInfo[];
  error?: string;
}

export interface JoinRoomRequest {
  roomId: string;
  playerName: string;
  playerId?: string;
}

export interface JoinRoomResponse {
  success: boolean;
  data?: {
    roomInfo: GameRoomInfo;
    joinToken: string;
    websocketUrl: string;
  };
  error?: string;
}