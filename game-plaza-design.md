# 游戏广场功能设计文档

## 功能概述
移除原有的"扫一扫"和"查房房间"功能，新增"查看游戏广场"功能，展示局域网内所有已开设的游戏房间列表。

## 技术架构

### 前端组件结构
```
components/
├── GamePlaza.tsx          # 游戏广场主界面
├── GameRoomList.tsx       # 房间列表组件
├── GameRoomItem.tsx       # 单个房间条目组件
└── GameDiscovery.tsx      # 局域网房间发现组件
```

### 后端服务结构
```
server/src/
├── services/
│   ├── roomDiscoveryService.ts    # 房间发现服务
│   └── roomSyncService.ts         # 房间状态同步服务
├── controllers/
│   └── gamePlazaController.ts     # 游戏广场控制器
└── routes/
    └── gamePlazaRoutes.ts         # 游戏广场路由
```

## 数据结构设计

### 房间信息接口
```typescript
interface GameRoomInfo {
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
}
```

### 局域网发现协议
```typescript
interface DiscoveryMessage {
  type: 'broadcast' | 'response' | 'heartbeat';
  roomInfo: GameRoomInfo;
  timestamp: number;
  signature: string;        // 消息签名，防止伪造
}
```

## 实现方案

### 1. 局域网房间发现机制
- **广播发现**：使用UDP广播协议定期发送房间存在消息
- **心跳机制**：房间主机定期发送心跳包，保持在线状态
- **超时清理**：检测超时未响应的房间，自动从列表中移除

### 2. 实时同步机制
- **WebSocket连接**：建立与房间主机的WebSocket连接
- **状态推送**：房间状态变化时实时推送到所有客户端
- **数据一致性**：确保所有客户端看到的房间信息一致

### 3. 用户界面设计
- **房间列表**：显示所有可用房间，按状态排序
- **实时更新**：玩家加入/离开时实时更新人数显示
- **快速加入**：点击房间直接加入，无需输入房号

## 移除功能清单

### 需要移除的功能
1. **扫一扫功能** (`/game/scan` 路由)
2. **查房房间功能** (`/game/join` 路由)
3. 相关的QR码生成和扫描逻辑
4. 手动输入房号的界面

### 保留功能
1. 游戏房间创建逻辑
2. 玩家加入游戏逻辑
3. 游戏状态管理
4. 实时通信机制

## 开发计划

### 阶段一：基础架构 (当前)
- [ ] 设计数据结构和接口
- [ ] 创建游戏广场组件
- [ ] 实现局域网发现服务

### 阶段二：功能实现
- [ ] 实现房间状态同步
- [ ] 创建房间列表UI
- [ ] 实现快速加入功能

### 阶段三：优化完善
- [ ] 添加错误处理和重试机制
- [ ] 优化性能和用户体验
- [ ] 测试和调试

## 预期效果

用户打开游戏广场后，将看到类似以下界面：
```
游戏广场

[1234] 已有3人进入 - 等待中
[5678] 已有1人进入 - 等待中  
[9012] 已有4人进入 - 游戏中
```

点击任意房间即可快速加入，无需手动输入房号或扫描二维码。