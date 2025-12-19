import express from 'express';
import { createTeacher } from '../controllers/adminController';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';

const router = express.Router();

// Protect all admin routes
router.use(authenticateToken, requireAdmin);

router.post('/create-teacher', createTeacher);

export default router;
