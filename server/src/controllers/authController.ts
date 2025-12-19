import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../utils/db';

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z.string().min(6).max(100),
  email: z.string().email().optional(),
  role: z.string().optional(),
  nickname: z.string().min(1).max(20)
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string(),
  newPassword: z.string().min(6)
});

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      // @ts-ignore
      where: { email }
    });

    if (!user) {
      // Don't reveal user existence
      return res.status(200).json({ message: '验证码已发送（如果邮箱存在）' });
    }

    // Generate 6 digit code
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // MOCK SEND EMAIL
    console.log(`[Mock Email Service] To: ${email}, Code: ${resetToken}`);

    res.json({ message: '验证码已发送' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '无效的邮箱格式' });
    }
    console.error(error);
    res.status(500).json({ error: '请求失败，请稍后重试' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { 
        // @ts-ignore
        email,
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({ message: '密码重置成功，请重新登录' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入数据无效' });
    }
    console.error(error);
    res.status(500).json({ error: '重置失败，请稍后重试' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, nickname, email, role } = registerSchema.parse(req.body);

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在，请选择其他用户名' });
    }

    // 检查昵称是否已存在
    const existingNickname = await prisma.user.findFirst({
      where: { nickname }
    });

    if (existingNickname) {
      return res.status(400).json({ error: '昵称已被使用，请选择其他昵称' });
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({
        // @ts-ignore
        where: { email }
      });
      if (existingEmail) {
        return res.status(400).json({ error: '邮箱已存在' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 强制公共注册的角色为 'student'
    // 教师账户必须由管理员创建
    const safeRole = 'student';

    const user = await prisma.user.create({
      data: {
        username,
        // @ts-ignore
        email,
        password: hashedPassword,
        nickname: nickname,
        role: safeRole,
        level: 1,
        experience: 0,
        nextLevelExp: 100,
        rank: '青铜'
      }
    });

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role,
        avatar: user.avatar,
        totalAssets: user.totalAssets,
        level: user.level,
        experience: user.experience,
        nextLevelExp: user.nextLevelExp,
        rank: user.rank
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入数据格式错误，请检查' });
    }
    console.error(error);
    res.status(500).json({ error: '注册过程中发生服务器错误' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      console.log(`[Login Failed] User not found: ${username}`);
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log(`[Login Failed] Invalid password for user: ${username}`);
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role,
        avatar: user.avatar,
        totalAssets: user.totalAssets,
        level: user.level,
        experience: user.experience,
        nextLevelExp: user.nextLevelExp,
        rank: user.rank
      }
    });
  } catch (error: any) {
     if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入数据格式错误，请检查' });
    }
    console.error(error);
    res.status(500).json({ error: '登录过程中发生服务器错误' });
  }
};
