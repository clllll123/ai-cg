import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '权限拒绝：仅管理员可访问' });
  }
  next();
};
