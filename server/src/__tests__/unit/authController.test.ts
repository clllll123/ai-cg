import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { register, login, requestPasswordReset, resetPassword } from '../../controllers/authController';
import prisma from '../../utils/db';

// Mock Prisma client
jest.mock('../../utils/db', () => ({
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

describe('Auth Controller - Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        nickname: '测试用户',
        email: 'test@example.com',
      };

      mockRequest.body = userData;

      // Mock Prisma responses
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // 用户名检查
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null); // 昵称检查
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-id',
        ...userData,
        password: 'hashedpassword',
        role: 'student',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

      await register(mockRequest as Request, mockResponse as Response);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { nickname: '测试用户' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          password: 'hashedpassword',
          nickname: '测试用户',
          email: 'test@example.com',
          role: 'student',
          level: 1,
          experience: 0,
          nextLevelExp: 100,
          rank: '青铜'
        },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: 'user-id',
          username: 'testuser',
          nickname: '测试用户',
        }),
        token: 'jwt-token',
      });
    });

    it('should return error for duplicate username', async () => {
      const userData = {
        username: 'existinguser',
        password: 'password123',
        nickname: '测试用户',
      };

      mockRequest.body = userData;

      // Mock existing user (用户名检查)
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user-id',
        username: 'existinguser',
        nickname: '其他用户'
      });

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '用户名已存在，请选择其他用户名',
      });
    });

    it('should handle validation errors', async () => {
      const invalidUserData = {
        username: 'ab', // Too short
        password: '123', // Too short
        nickname: '', // Empty
      };

      mockRequest.body = invalidUserData;

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.stringContaining('输入数据格式错误'),
      });
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        username: 'testuser',
        password: 'password123',
      };

      mockRequest.body = loginData;

      // Mock user and password verification
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        username: 'testuser',
        password: 'hashedpassword',
        nickname: '测试用户',
        role: 'USER',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

      await login(mockRequest as Request, mockResponse as Response);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(mockResponse.json).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: 'user-id',
          username: 'testuser',
        }),
        token: 'jwt-token',
      });
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      mockRequest.body = loginData;

      // Mock user but wrong password
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'user-id',
        username: 'testuser',
        password: 'hashedpassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '用户名或密码错误',
      });
    });

    it('should return error for non-existent user', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'password123',
      };

      mockRequest.body = loginData;

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '用户名或密码错误',
      });
    });
  });

  describe('requestPasswordReset', () => {
    it('should send reset code for existing user', async () => {
      const resetData = {
        email: 'test@example.com',
      };

      mockRequest.body = resetData;

      // Mock existing user
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(prisma.user.update).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: '验证码已发送',
      });
    });

    it('should handle non-existent user gracefully', async () => {
      const resetData = {
        email: 'nonexistent@example.com',
      };

      mockRequest.body = resetData;

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: '验证码已发送（如果邮箱存在）',
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetData = {
        email: 'test@example.com',
        token: '123456',
        newPassword: 'newpassword123',
      };

      mockRequest.body = resetData;

      // Mock valid reset token
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        resetToken: '123456',
        resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhashedpassword');
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          resetToken: '123456',
          resetTokenExpiry: { gt: expect.any(Date) },
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: '密码重置成功，请重新登录',
      });
    });

    it('should return error for invalid reset token', async () => {
      const resetData = {
        email: 'test@example.com',
        token: 'wrongtoken',
        newPassword: 'newpassword123',
      };

      mockRequest.body = resetData;

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '验证码无效或已过期',
      });
    });
  });
});