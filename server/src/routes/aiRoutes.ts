import express from 'express';
import { generateNews, generateReport } from '../controllers/aiController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Protect AI routes
router.post('/news', authenticateToken, generateNews);
router.post('/report', generateReport);

export default router;
