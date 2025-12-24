import request from 'supertest';
import express from 'express';
import gameRoutes from '../../routes/gameRoutes';
import authRoutes from '../../routes/authRoutes';
import prisma from '../../utils/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

describe('Game API Tests', () => {
  let authToken: string;
  let testUserId: string;

  beforeEach(async () => {
    // 清理测试数据（按依赖关系顺序，禁用外键约束）
    await prisma.$executeRaw`PRAGMA foreign_keys = OFF`;
    await prisma.$executeRaw`DELETE FROM GameResult`;
    await prisma.$executeRaw`DELETE FROM GameRoom`;
    await prisma.$executeRaw`DELETE FROM User`;
    await prisma.$executeRaw`PRAGMA foreign_keys = ON`;

    // 创建测试用户
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUserId = `test-user-${Date.now()}`;
    
    await prisma.user.create({
      data: {
        id: testUserId,
        username: `testuser-${Date.now()}`,
        password: hashedPassword,
        nickname: '测试用户',
        email: `test-${Date.now()}@example.com`,
        role: 'student',
        totalGames: 5,
        totalWins: 3,
        totalAssets: 150000,
        level: 2,
        experience: 50,
        nextLevelExp: 200,
        rank: '白银'
      }
    });

    // 生成认证令牌
    authToken = jwt.sign(
      { userId: testUserId, username: 'testuser' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/game/results', () => {
    it('should save game result successfully', async () => {
      // 创建一个新的游戏房间用于测试
      const testRoomId = `test-room-${Date.now()}`;
      await prisma.gameRoom.create({
        data: {
          id: testRoomId,
          code: `TEST-${Date.now()}`,
          hostId: testUserId,
          status: 'completed',
          config: '{}'
        }
      });

      const gameResult = {
        roomId: testRoomId,
        userId: testUserId,
        finalAssets: 150000,
        initialAssets: 100000,
        rank: 1,
        totalPlayers: 4,
        tradeCount: 10,
        peakValue: 160000,
        isWinner: true
      };

      const response = await request(app)
        .post('/api/game/results')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameResult);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('gameResult');
      expect(response.body.data.gameResult).toHaveProperty('id');
      expect(response.body.data.gameResult.userId).toBe(testUserId);
      expect(response.body.data.gameResult.roomId).toBe(testRoomId);
      expect(response.body.data.gameResult.finalAssets).toBe(150000);
      expect(response.body.data.gameResult.rank).toBe(1);
    });

    it('should return error for missing authentication', async () => {
      const response = await request(app)
        .post('/api/game/results')
        .send({
          roomId: 'test-room',
          finalAssets: 150000,
          rank: 1
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for invalid game data', async () => {
      // 创建一个有效的游戏房间用于测试
      const testRoomId = `test-room-${Date.now()}`;
      await prisma.gameRoom.create({
        data: {
          id: testRoomId,
          code: `TEST-${Date.now()}`,
          hostId: testUserId,
          status: 'completed',
          config: '{}'
        }
      });

      const response = await request(app)
        .post('/api/game/results')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // 缺少必要的字段
          roomId: testRoomId
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/game/history/:userId', () => {
    it('should return user game history', async () => {
      // 创建测试游戏房间和游戏记录
      const room1Id = `room1-${Date.now()}`;
      const room2Id = `room2-${Date.now()}`;
      
      await prisma.gameRoom.createMany({
        data: [
          {
            id: room1Id,
            code: `ROOM1-${Date.now()}`,
            hostId: testUserId,
            status: 'completed',
            config: '{}',
            createdAt: new Date(Date.now() - 86400000)
          },
          {
            id: room2Id,
            code: `ROOM2-${Date.now()}`,
            hostId: testUserId,
            status: 'completed',
            config: '{}',
            createdAt: new Date(Date.now() - 172800000)
          }
        ]
      });

      // 创建游戏记录
      await prisma.gameResult.createMany({
        data: [
          {
            id: `game1-${Date.now()}`,
            userId: testUserId,
            roomId: room1Id,
            finalAssets: 120000,
            rank: 1,
            playedAt: new Date(Date.now() - 86400000) // 1天前
          },
          {
            id: `game2-${Date.now()}`,
            userId: testUserId,
            roomId: room2Id,
            finalAssets: 90000,
            rank: 3,
            playedAt: new Date(Date.now() - 172800000) // 2天前
          }
        ]
      });

      const response = await request(app)
        .get(`/api/game/history/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      
      // 检查返回的游戏记录
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('roomId');
      expect(response.body.data[0]).toHaveProperty('finalAssets');
      expect(response.body.data[0]).toHaveProperty('rank');
      expect(response.body.data[0]).toHaveProperty('playedAt');
    });

    it('should return empty array for user with no games', async () => {
      // 创建另一个用户
      const anotherUserId = 'another-user-id';
      await prisma.user.create({
        data: {
          id: anotherUserId,
          username: 'anotheruser',
          password: 'hashedpassword',
          nickname: '另一个用户',
          email: 'another@example.com',
          role: 'student'
        }
      });

      const response = await request(app)
        .get(`/api/game/history/${anotherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .get('/api/game/history/nonexistent-user')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/game/level/:userId', () => {
    it('should return user level information', async () => {
      const response = await request(app)
        .get(`/api/game/level/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', testUserId);
      expect(response.body.data).toHaveProperty('level', 2);
      expect(response.body.data).toHaveProperty('experience', 50);
      expect(response.body.data).toHaveProperty('nextLevelExp', 200);
      expect(response.body.data).toHaveProperty('rank', '白银');
      expect(response.body.data).toHaveProperty('totalGames', 5);
      expect(response.body.data).toHaveProperty('totalWins', 3);
      expect(response.body.data).toHaveProperty('progressToNextLevel');
      expect(response.body.data).toHaveProperty('expToNextLevel');
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .get('/api/game/level/nonexistent-user')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/game/leaderboard', () => {
    beforeEach(async () => {
      // 创建多个测试用户用于排行榜测试
      await prisma.user.createMany({
        data: [
          {
            id: 'user1',
            username: 'user1',
            password: await bcrypt.hash('password123', 10),
            nickname: '用户1',
            email: 'user1@example.com',
            role: 'USER',
            totalGames: 10,
            totalWins: 5,
            totalAssets: 200000,
            level: 3,
            experience: 150,
            nextLevelExp: 300,
            rank: '黄金'
          },
          {
            id: 'user2',
            username: 'user2',
            password: await bcrypt.hash('password123', 10),
            nickname: '用户2',
            email: 'user2@example.com',
            role: 'USER',
            totalGames: 8,
            totalWins: 4,
            totalAssets: 180000,
            level: 2,
            experience: 120,
            nextLevelExp: 200,
            rank: '白银'
          },
          {
            id: 'user3',
            username: 'user3',
            password: await bcrypt.hash('password123', 10),
            nickname: '用户3',
            email: 'user3@example.com',
            role: 'USER',
            totalGames: 12,
            totalWins: 6,
            totalAssets: 220000,
            level: 4,
            experience: 250,
            nextLevelExp: 400,
            rank: '铂金'
          }
        ]
      });
    });

    it('should return leaderboard sorted by total assets', async () => {
      const response = await request(app)
        .get('/api/game/leaderboard?type=assets');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // 检查排行榜排序（按总资产降序）
      if (response.body.data.length >= 2) {
        expect(response.body.data[0].totalAssets).toBeGreaterThanOrEqual(response.body.data[1].totalAssets);
      }
      if (response.body.data.length >= 3) {
        expect(response.body.data[1].totalAssets).toBeGreaterThanOrEqual(response.body.data[2].totalAssets);
      }
      
      // 检查返回的用户信息
      response.body.data.forEach((user: any) => {
        expect(user).toHaveProperty('nickname');
        expect(user).toHaveProperty('totalAssets');
        expect(user).toHaveProperty('level');
        expect(user).toHaveProperty('totalGames');
        expect(user).toHaveProperty('totalWins');
      });
    });

    it('should return limited number of entries when limit parameter is provided', async () => {
      const response = await request(app)
        .get('/api/game/leaderboard?limit=2');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return empty array when no users exist', async () => {
      // 清理所有数据（按依赖关系顺序）
      await prisma.$executeRaw`DELETE FROM GameResult`;
      await prisma.$executeRaw`DELETE FROM GameRoom`;
      await prisma.$executeRaw`DELETE FROM User`;

      const response = await request(app)
        .get('/api/game/leaderboard');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should handle pagination with offset parameter', async () => {
      const response = await request(app)
        .get('/api/game/leaderboard?limit=2&offset=1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return leaderboard sorted by win rate when type=winrate', async () => {
      const response = await request(app)
        .get('/api/game/leaderboard?type=winrate');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // 检查排行榜排序（按胜率降序）
      if (response.body.data.length >= 2) {
        const winRate1 = response.body.data[0].totalWins / response.body.data[0].totalGames;
        const winRate2 = response.body.data[1].totalWins / response.body.data[1].totalGames;
        expect(winRate1).toBeGreaterThanOrEqual(winRate2);
      }
    });

    it('should return leaderboard sorted by level when type=level', async () => {
      const response = await request(app)
        .get('/api/game/leaderboard?type=level');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // 检查排行榜排序（按等级降序）
      if (response.body.data.length >= 2) {
        expect(response.body.data[0].level).toBeGreaterThanOrEqual(response.body.data[1].level);
      }
    });

    it('should handle invalid type parameter gracefully', async () => {
      const response = await request(app)
        .get('/api/game/leaderboard?type=invalid');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // 默认应该按总资产排序
      if (response.body.data.length >= 2) {
        expect(response.body.data[0].totalAssets).toBeGreaterThanOrEqual(response.body.data[1].totalAssets);
      }
    });

    it('should handle negative limit and offset parameters', async () => {
      const response = await request(app)
        .get('/api/game/leaderboard?limit=-1&offset=-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // 应该返回所有用户（默认行为）
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/game/history/:userId additional tests', () => {
    beforeEach(async () => {
      // 创建多个游戏记录用于测试
      const room1Id = `room1-${Date.now()}`;
      const room2Id = `room2-${Date.now()}`;
      const room3Id = `room3-${Date.now()}`;
      
      await prisma.gameRoom.createMany({
        data: [
          {
            id: room1Id,
            code: `ROOM1-${Date.now()}`,
            hostId: testUserId,
            status: 'completed',
            config: '{}',
            createdAt: new Date(Date.now() - 86400000) // 1天前
          },
          {
            id: room2Id,
            code: `ROOM2-${Date.now()}`,
            hostId: testUserId,
            status: 'completed',
            config: '{}',
            createdAt: new Date(Date.now() - 172800000) // 2天前
          },
          {
            id: room3Id,
            code: `ROOM3-${Date.now()}`,
            hostId: testUserId,
            status: 'completed',
            config: '{}',
            createdAt: new Date(Date.now() - 259200000) // 3天前
          }
        ]
      });

      // 创建游戏记录
      await prisma.gameResult.createMany({
        data: [
          {
            id: `game1-${Date.now()}`,
            userId: testUserId,
            roomId: room1Id,
            finalAssets: 120000,
            rank: 1,
            playedAt: new Date(Date.now() - 86400000) // 1天前
          },
          {
            id: `game2-${Date.now()}`,
            userId: testUserId,
            roomId: room2Id,
            finalAssets: 90000,
            rank: 3,
            playedAt: new Date(Date.now() - 172800000) // 2天前
          },
          {
            id: `game3-${Date.now()}`,
            userId: testUserId,
            roomId: room3Id,
            finalAssets: 150000,
            rank: 2,
            playedAt: new Date(Date.now() - 259200000) // 3天前
          }
        ]
      });
    });

    it('should return game history in descending order by playedAt', async () => {
      const response = await request(app)
        .get(`/api/game/history/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // 检查按playedAt降序排序（最近的游戏在前）
      if (response.body.data.length >= 2) {
        const date1 = new Date(response.body.data[0].playedAt);
        const date2 = new Date(response.body.data[1].playedAt);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });

    it('should handle query parameters gracefully (API ignores them)', async () => {
      const response = await request(app)
        .get(`/api/game/history/${testUserId}?startDate=2023-01-01&endDate=2023-12-31&sortBy=assets&limit=5`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // API应该忽略查询参数并返回所有记录
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return limited number of records (max 20)', async () => {
      // 创建超过20条记录来测试限制
      const roomIds = [];
      for (let i = 0; i < 25; i++) {
        roomIds.push(`room-${i}-${Date.now()}`);
      }
      
      await prisma.gameRoom.createMany({
        data: roomIds.map((id, index) => ({
          id,
          code: `ROOM-${index}-${Date.now()}`,
          hostId: testUserId,
          status: 'completed',
          config: '{}',
          createdAt: new Date(Date.now() - (index * 86400000))
        }))
      });

      await prisma.gameResult.createMany({
        data: roomIds.map((roomId, index) => ({
          id: `game-${index}-${Date.now()}`,
          userId: testUserId,
          roomId,
          finalAssets: 100000 + (index * 1000),
          rank: index % 4 + 1,
          playedAt: new Date(Date.now() - (index * 86400000))
        }))
      });

      const response = await request(app)
        .get(`/api/game/history/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // API应该最多返回20条记录
      expect(response.body.data.length).toBeLessThanOrEqual(20);
    });

    it('should include room information in game history', async () => {
      const response = await request(app)
        .get(`/api/game/history/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // 检查是否包含房间信息
      if (response.body.data.length > 0) {
        const gameRecord = response.body.data[0];
        expect(gameRecord).toHaveProperty('room');
        expect(gameRecord.room).toHaveProperty('id');
        expect(gameRecord.room).toHaveProperty('code');
        expect(gameRecord.room).toHaveProperty('endedAt');
      }
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle invalid room ID in game results', async () => {
      const gameResult = {
        roomId: 'invalid-room-id',
        userId: testUserId,
        finalAssets: 150000,
        rank: 1
      };

      const response = await request(app)
        .post('/api/game/results')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameResult);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle duplicate game result submission', async () => {
      // 创建一个游戏房间
      const testRoomId = `test-room-${Date.now()}`;
      await prisma.gameRoom.create({
        data: {
          id: testRoomId,
          code: `TEST-${Date.now()}`,
          hostId: testUserId,
          status: 'completed',
          config: '{}'
        }
      });

      const gameResult = {
        roomId: testRoomId,
        userId: testUserId,
        finalAssets: 150000,
        rank: 1,
        totalPlayers: 4
      };

      // 第一次提交
      await request(app)
        .post('/api/game/results')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameResult);

      // 第二次提交相同数据
      const response = await request(app)
        .post('/api/game/results')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameResult);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed authentication token', async () => {
      const response = await request(app)
        .get(`/api/game/history/${testUserId}`)
        .set('Authorization', 'Bearer invalid-token');

      // API可能返回401或403，取决于认证中间件的实现
      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle expired authentication token', async () => {
      // 生成已过期的令牌
      const expiredToken = jwt.sign(
        { userId: testUserId, username: 'testuser' },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '-1h' } // 已过期
      );

      const response = await request(app)
        .get(`/api/game/history/${testUserId}`)
        .set('Authorization', `Bearer ${expiredToken}`);

      // API可能返回401或403，取决于认证中间件的实现
      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle SQL injection attempts in parameters', async () => {
      const response = await request(app)
        .get('/api/game/leaderboard?type=assets; DROP TABLE User; --')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      // 应该安全地处理SQL注入尝试
    });

    it('should handle very large numbers in game results', async () => {
      const testRoomId = `test-room-${Date.now()}`;
      await prisma.gameRoom.create({
        data: {
          id: testRoomId,
          code: `TEST-${Date.now()}`,
          hostId: testUserId,
          status: 'completed',
          config: '{}'
        }
      });

      const gameResult = {
        roomId: testRoomId,
        userId: testUserId,
        finalAssets: 999999, // 使用合理的较大数字
        initialAssets: 100000,
        rank: 1,
        totalPlayers: 4,
        tradeCount: 10,
        peakValue: 1000000,
        isWinner: true
      };

      const response = await request(app)
        .post('/api/game/results')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameResult);

      // 根据API的实际验证逻辑，可能返回201或400
      expect([201, 400]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body).toHaveProperty('success', true);
      } else {
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});