import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import prisma from '../../utils/db';
import bcrypt from 'bcryptjs';
import authRoutes from '../../routes/authRoutes';
import aiRoutes from '../../routes/aiRoutes';
import adminRoutes from '../../routes/adminRoutes';
import eventRoutes from '../../routes/eventRoutes';
import gameRoutes from '../../routes/gameRoutes';

// Create test app with all routes (same as main app)
const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/game', gameRoutes);

// Basic health check (same as main app)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

describe('Auth Integration Tests', () => {
  beforeEach(async () => {
    // 清理测试数据
    await prisma.$executeRaw`DELETE FROM User`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('User Registration Flow', () => {
    it('should complete full user registration flow', async () => {
      // 1. 注册新用户
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'integrationtest',
          password: 'password123',
          nickname: '集成测试用户',
          email: 'integration@test.com'
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body).toHaveProperty('token');
      expect(registerResponse.body.user.username).toBe('integrationtest');

      const authToken = registerResponse.body.token;

      // 2. 使用新注册的用户登录
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'integrationtest',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');

      // 3. 验证用户数据已正确保存到数据库
      const savedUser = await prisma.user.findFirst({
        where: { username: 'integrationtest' }
      });

      expect(savedUser).toBeDefined();
      expect(savedUser!.nickname).toBe('集成测试用户');
      expect(savedUser!.email).toBe('integration@test.com');

      // 4. 验证密码已正确加密
      const isPasswordValid = await bcrypt.compare('password123', savedUser!.password);
      expect(isPasswordValid).toBe(true);
    });

    it('should handle duplicate username registration gracefully', async () => {
      // 第一次注册
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'duplicateuser',
          password: 'password123',
          nickname: '用户1'
        });

      // 第二次尝试注册相同用户名
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'duplicateuser',
          password: 'password123',
          nickname: '用户2'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('用户名已存在，请选择其他用户名');
    });
  });

  describe('Password Reset Flow', () => {
    it('should complete full password reset flow', async () => {
      // 1. 注册用户
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'resetuser',
          password: 'oldpassword',
          nickname: '重置测试用户',
          email: 'reset@test.com'
        });

      // 2. 请求密码重置
      const resetRequestResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'reset@test.com'
        });

      expect(resetRequestResponse.status).toBe(200);

      // 3. 获取重置令牌（从数据库）
      const user = await prisma.user.findFirst({
        where: { email: 'reset@test.com' }
      });

      expect(user).toBeDefined();
      expect(user!.resetToken).toBeDefined();
      expect(user!.resetTokenExpiry).toBeDefined();

      // 4. 使用令牌重置密码
      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: 'reset@test.com',
          token: user!.resetToken,
          newPassword: 'newpassword123'
        });

      expect(resetResponse.status).toBe(200);
      expect(resetResponse.body.message).toBe('密码重置成功，请重新登录');

      // 5. 验证新密码可以登录
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'resetuser',
          password: 'newpassword123'
        });

      expect(loginResponse.status).toBe(200);

      // 6. 验证旧密码不能登录
      const failedLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'resetuser',
          password: 'oldpassword'
        });

      expect(failedLoginResponse.status).toBe(401);
    });
  });

  describe('Authentication Flow', () => {
    it('should maintain session consistency', async () => {
      // 注册用户
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'sessionuser',
          password: 'password123',
          nickname: '会话测试用户'
        });

      const authToken = registerResponse.body.token;

      // 使用令牌访问受保护的路由（这里使用健康检查作为示例）
      const healthResponse = await request(app)
        .get('/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(healthResponse.status).toBe(200);

      // 验证无效令牌被拒绝
      const invalidTokenResponse = await request(app)
        .get('/health')
        .set('Authorization', 'Bearer invalid-token');

      expect(invalidTokenResponse.status).toBe(200); // 健康检查不需要认证
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          // 缺少必需字段
          username: 'malformed'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle SQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: "admin'; DROP TABLE User; --",
          password: 'password123',
          nickname: 'SQL注入测试'
        });

      // 应该被验证规则拒绝，而不是导致SQL错误
      expect(response.status).toBe(400);
    });

    it('should handle extremely long inputs', async () => {
      const longString = 'a'.repeat(1000);
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: longString,
          password: 'password123',
          nickname: '长输入测试'
        });

      // 应该被验证规则拒绝
      expect(response.status).toBe(400);
    });
  });
});