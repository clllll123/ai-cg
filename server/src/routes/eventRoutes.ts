import express from 'express';
import {
    generateDailyEvent,
    applyEventEffects,
    getEventTemplates
} from '../controllers/eventController';

const router = express.Router();

// 生成一日大事件
router.post('/generate', generateDailyEvent);

// 应用事件效果到股票数据
router.post('/apply-effects', applyEventEffects);

// 获取事件模板
router.get('/templates', getEventTemplates);

export default router;