import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/db';

const createTeacherSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  nickname: z.string().optional(),
  email: z.string().email().optional()
});

export const createTeacher = async (req: Request, res: Response) => {
  try {
    const { username, password, nickname, email } = createTeacherSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
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

    const user = await prisma.user.create({
      data: {
        username,
        // @ts-ignore
        email,
        password: hashedPassword,
        nickname: nickname || `Teacher ${username}`,
        role: 'teacher'
      }
    });

    res.status(201).json({
      message: '教师账户创建成功',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入数据无效' });
    }
    console.error(error);
    res.status(500).json({ error: '创建教师账户失败' });
  }
};
