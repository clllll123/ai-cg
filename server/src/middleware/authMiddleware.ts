import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要访问令牌' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: '令牌无效或已过期' });
  }
};
