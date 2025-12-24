import request from 'supertest';
import express from 'express';
import aiRoutes from '../../routes/aiRoutes';
import authRoutes from '../../routes/authRoutes';
import prisma from '../../utils/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAIService } from '../../services/aiService';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

// Mock AI Service
const mockAIService = {
  generateText: jest.fn().mockResolvedValue({
    content: JSON.stringify({
      newsItems: [
        {
          type: 'NEWS',
          title: '测试新闻标题',
          content: '测试新闻内容',
          impact: 'neutral',
          severity: 0.5,
          source: '测试源',
          affectedSectors: ['科技']
        }
      ]
    }),
    usage: { totalTokens: 100 }
  })
};

// Mock the AI service factory
jest.mock('../../services/aiService', () => ({
  getAIService: jest.fn(() => mockAIService)
}));

describe('AI API Tests', () => {
  let authToken: string;
  let testUserId: string;

  beforeEach(async () => {
    // 清理测试数据（只清理必要的表）
    try {
      await prisma.$executeRaw`DELETE FROM GameResult`;
      await prisma.$executeRaw`DELETE FROM User`;
    } catch (error) {
      // 忽略表不存在的错误
    }

    // 创建测试用户
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUserId = `test-user-ai-${Date.now()}`;
    
    await prisma.user.create({
      data: {
        id: testUserId,
        username: `testuser-ai-${Date.now()}`,
        password: hashedPassword,
        nickname: '测试用户AI',
        email: `test-ai-${Date.now()}@example.com`,
        role: 'student'
      }
    });

    // 生成认证令牌
    authToken = jwt.sign(
      { userId: testUserId, username: 'testuser' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    // 设置AI服务环境变量
    process.env.DEEPSEEK_API_KEY = 'test-api-key';
    process.env.DASHSCOPE_API_KEY = 'test-dashscope-key';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/ai/news', () => {
    it('should generate news successfully', async () => {
      const response = await request(app)
        .post('/api/ai/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phase: '交易中',
          stockSummary: '科技股表现活跃，金融股震荡调整'
        });

      // 检查响应状态和格式
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('newsItems');
      expect(Array.isArray(response.body.newsItems)).toBe(true);
      
      // 检查新闻项的基本结构
      if (response.body.newsItems.length > 0) {
        const newsItem = response.body.newsItems[0];
        expect(newsItem).toHaveProperty('type');
        expect(newsItem).toHaveProperty('title');
        expect(newsItem).toHaveProperty('content');
        expect(newsItem).toHaveProperty('impact');
      }
    });

    it('should return error for missing authentication', async () => {
      const response = await request(app)
        .post('/api/ai/news')
        .send({
          market: 'A股',
          industry: '科技',
          style: '专业'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing parameters gracefully', async () => {
      const response = await request(app)
        .post('/api/ai/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // 缺少必要的参数
          phase: '交易中'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid parameters', async () => {
      const response = await request(app)
        .post('/api/ai/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phase: '', // 空字符串
          stockSummary: '科技股表现活跃'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/ai/report', () => {
    it('should generate report successfully', async () => {
      // 为报告生成端点配置不同的mock响应
      mockAIService.generateText.mockResolvedValueOnce({
        content: JSON.stringify({
          title: "午间快讯",
          summary: "上午市场交易活跃，多空双方激烈争夺。",
          starStock: "科技股",
          trashStock: "金融股",
          marketOutlook: "下午建议谨慎操作，控制仓位。"
        }),
        usage: { totalTokens: 100 }
      });

      const response = await request(app)
        .post('/api/ai/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          context: '上午交易总结：科技股表现活跃，金融股震荡调整',
          userId: testUserId,
          gameData: {
            finalAssets: 150000,
            rank: 1,
            trades: 10,
            winRate: 0.6
          },
          analysisType: 'performance'
        });

      // 检查响应状态和格式
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('starStock');
      expect(response.body).toHaveProperty('trashStock');
      expect(response.body).toHaveProperty('marketOutlook');
    });

    it('should handle missing game data', async () => {
      const response = await request(app)
        .post('/api/ai/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: testUserId,
          // 缺少gameData
          analysisType: 'performance'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid analysis type', async () => {
      const response = await request(app)
        .post('/api/ai/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: testUserId,
          gameData: {
            finalAssets: 150000,
            rank: 1
          },
          analysisType: 'invalid-type' // 无效的分析类型
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle empty user ID', async () => {
      const response = await request(app)
        .post('/api/ai/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: '', // 空用户ID
          gameData: {
            finalAssets: 150000,
            rank: 1
          },
          analysisType: 'performance'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('AI Service Error Handling', () => {
    it('should handle AI service errors gracefully', async () => {
      // 模拟AI服务错误
      mockAIService.generateText.mockRejectedValueOnce(new Error('AI服务不可用'));
      
      const response = await request(app)
        .post('/api/ai/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phase: '交易中',
          stockSummary: '科技股表现活跃'
        });

      // AI控制器应该返回500错误
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('生成新闻失败，请稍后重试');
    });
  });

  describe('Request Validation', () => {
    it('should validate request body structure', async () => {
      const response = await request(app)
        .post('/api/ai/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // 缺少必填字段
          phase: '交易中'
          // 缺少stockSummary字段，这会触发验证错误
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/ai/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // 缺少必填字段
          phase: '交易中'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate field types', async () => {
      const response = await request(app)
        .post('/api/ai/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phase: 123, // 数字而不是字符串
          stockSummary: '科技股表现活跃'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});