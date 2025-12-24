import { Request, Response } from 'express';
import { generateDailyEvent, applyEventEffects, getEventTemplates } from '../../controllers/eventController';
import { Sector } from '../../types';

// Mock EventService
jest.mock('../../services/eventService', () => {
  const mockEventService = {
    generateDailyEvent: jest.fn(),
    applyEventEffects: jest.fn()
  };
  
  return {
    EventService: jest.fn(() => mockEventService)
  };
});

import { EventService } from '../../services/eventService';

describe('EventController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;
  let mockEventService: any;

  beforeEach(() => {
    mockRequest = { body: {} };
    
    responseObject = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((result) => {
        responseObject = result;
        return mockResponse;
      })
    };

    // 获取mock实例
    mockEventService = new EventService();
    jest.clearAllMocks();
  });

  describe('generateDailyEvent', () => {
    it('should generate daily event successfully with valid parameters', async () => {
      mockRequest.body = {
        currentTime: 'MORNING',
        marketTrend: 0.5,
        activeSectors: [Sector.FINANCE, Sector.TECH]
      };

      const mockEvent = {
        id: 'event_123',
        title: '测试事件',
        description: '测试事件描述',
        effects: [],
        triggerCondition: 'MORNING' as 'MORNING',
        newsFlash: '【快讯】测试事件'
      };

      mockEventService.generateDailyEvent.mockResolvedValue(mockEvent);

      await generateDailyEvent(mockRequest as Request, mockResponse as Response);

      expect(mockEventService.generateDailyEvent).toHaveBeenCalledWith(
        'MORNING',
        0.5,
        [Sector.FINANCE, Sector.TECH]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toEqual({
        success: true,
        data: mockEvent
      });
    });

    it('should return 400 error when missing required parameters', async () => {
      mockRequest.body = {
        currentTime: 'MORNING'
        // 缺少 marketTrend 和 activeSectors
      };

      await generateDailyEvent(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject).toEqual({
        success: false,
        message: '缺少必要参数：currentTime, marketTrend, activeSectors'
      });
      expect(mockEventService.generateDailyEvent).not.toHaveBeenCalled();
    });

    it('should return 500 error when service throws error', async () => {
      mockRequest.body = {
        currentTime: 'MORNING',
        marketTrend: 0.5,
        activeSectors: [Sector.FINANCE]
      };

      mockEventService.generateDailyEvent.mockRejectedValue(new Error('Service error'));

      await generateDailyEvent(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseObject).toEqual({
        success: false,
        message: '生成大事件失败'
      });
    });
  });

  describe('applyEventEffects', () => {
    it('should apply event effects successfully with valid parameters', async () => {
      const mockStocks = [
        { id: 'stock1', price: 100, sector: Sector.FINANCE },
        { id: 'stock2', price: 200, sector: Sector.TECH }
      ];
      
      const mockEvent = {
        id: 'event_123',
        title: '测试事件',
        effects: [
          { type: 'MARKET_SENTIMENT', value: 0.1, description: '市场情绪提升' }
        ]
      };

      mockRequest.body = {
        stocks: mockStocks,
        event: mockEvent
      };

      const modifiedStocks = [
        { id: 'stock1', price: 110, sector: Sector.FINANCE },
        { id: 'stock2', price: 220, sector: Sector.TECH }
      ];

      mockEventService.applyEventEffects.mockReturnValue(modifiedStocks);

      await applyEventEffects(mockRequest as Request, mockResponse as Response);

      expect(mockEventService.applyEventEffects).toHaveBeenCalledWith(mockStocks, mockEvent);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toEqual({
        success: true,
        data: modifiedStocks
      });
    });

    it('should return 400 error when missing stocks or event', async () => {
      mockRequest.body = {
        stocks: []
        // 缺少 event
      };

      await applyEventEffects(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject).toEqual({
        success: false,
        message: '缺少必要参数：stocks, event'
      });
      expect(mockEventService.applyEventEffects).not.toHaveBeenCalled();
    });

    it('should return 500 error when service throws error', async () => {
      mockRequest.body = {
        stocks: [{ id: 'stock1', price: 100 }],
        event: { id: 'event1', effects: [] }
      };

      mockEventService.applyEventEffects.mockImplementation(() => {
        throw new Error('Service error');
      });

      await applyEventEffects(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseObject).toEqual({
        success: false,
        message: '应用事件效果失败'
      });
    });
  });

  describe('getEventTemplates', () => {
    it('should return event templates successfully', async () => {
      await getEventTemplates(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject.success).toBe(true);
      expect(responseObject.data).toHaveLength(3);
      
      // 验证模板数据
      const template1 = responseObject.data[0];
      expect(template1.id).toBe('template_1');
      expect(template1.title).toBe('央行降准释放流动性');
      expect(template1.description).toContain('央行宣布下调存款准备金率');
      expect(template1.effects).toHaveLength(1);
      expect(template1.newsFlash).toBe('【快讯】央行降准释放万亿流动性');
    });

    it('should handle errors gracefully', async () => {
      // 模拟JSON序列化错误
      mockResponse.json = jest.fn().mockImplementation(() => {
        throw new Error('JSON error');
      });

      // 重新设置responseObject
      responseObject = {};
      mockResponse.status = jest.fn().mockReturnValue({
        json: jest.fn().mockImplementation((result) => {
          responseObject = result;
          throw new Error('JSON error');
        })
      });

      // 这个测试主要验证函数不会因为内部错误而崩溃
      await expect(getEventTemplates(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('JSON error');
    });
  });
});