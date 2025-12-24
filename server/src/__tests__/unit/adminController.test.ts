import { Request, Response } from 'express';
import { createTeacher } from '../../controllers/adminController';
import prisma from '../../utils/db';
import bcrypt from 'bcryptjs';

// Mock Prisma client
jest.mock('../../utils/db', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn()
  }
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn()
}));

describe('AdminController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(() => {
    mockRequest = {
      body: {}
    };
    
    responseObject = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((result) => {
        responseObject = result;
        return mockResponse;
      })
    };
    
    jest.clearAllMocks();
  });

  describe('createTeacher', () => {
    it('should create teacher successfully with valid data', async () => {
      mockRequest.body = {
        username: 'teacher123',
        password: 'password123',
        nickname: '王老师',
        email: 'teacher@example.com'
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-123',
        username: 'teacher123',
        email: 'teacher@example.com',
        nickname: '王老师',
        role: 'teacher'
      });

      await createTeacher(mockRequest as Request, mockResponse as Response);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'teacher123' }
      });
      
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'teacher@example.com' }
      });
      
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'teacher123',
          email: 'teacher@example.com',
          password: 'hashed_password',
          nickname: '王老师',
          role: 'teacher'
        }
      });
      
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: '教师账户创建成功',
        user: {
          id: 'user-123',
          username: 'teacher123',
          role: 'teacher'
        }
      });
    });

    it('should create teacher without email successfully', async () => {
      mockRequest.body = {
        username: 'teacher456',
        password: 'password456',
        nickname: '李老师'
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-456',
        username: 'teacher456',
        email: null,
        nickname: '李老师',
        role: 'teacher'
      });

      await createTeacher(mockRequest as Request, mockResponse as Response);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'teacher456' }
      });
      
      // Should not check email when email is not provided
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'teacher456',
          email: undefined,
          password: 'hashed_password',
          nickname: '李老师',
          role: 'teacher'
        }
      });
      
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should return error when username already exists', async () => {
      mockRequest.body = {
        username: 'existinguser',
        password: 'password123'
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        username: 'existinguser'
      });

      await createTeacher(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '用户名已存在'
      });
    });

    it('should return error when email already exists', async () => {
      mockRequest.body = {
        username: 'newteacher',
        password: 'password123',
        email: 'existing@example.com'
      };

      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // First call for username check
        .mockResolvedValueOnce({ // Second call for email check
          id: 'existing-user',
          email: 'existing@example.com'
        });

      await createTeacher(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '邮箱已存在'
      });
    });

    it('should generate default nickname when not provided', async () => {
      mockRequest.body = {
        username: 'teacher789',
        password: 'password789'
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-789',
        username: 'teacher789',
        nickname: 'Teacher teacher789',
        role: 'teacher'
      });

      await createTeacher(mockRequest as Request, mockResponse as Response);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'teacher789',
          email: undefined,
          password: 'hashed_password',
          nickname: 'Teacher teacher789',
          role: 'teacher'
        }
      });
    });

    it('should handle validation errors', async () => {
      mockRequest.body = {
        username: 'ab', // Too short
        password: '123' // Too short
      };

      await createTeacher(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '输入数据无效'
      });
    });

    it('should handle server errors', async () => {
      mockRequest.body = {
        username: 'teacher999',
        password: 'password999'
      };

      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      await createTeacher(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '创建教师账户失败'
      });
    });
  });
});