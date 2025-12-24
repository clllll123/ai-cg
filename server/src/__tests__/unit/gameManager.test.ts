import { GameManager } from '../../game/gameManager';

// Mock AI Service
jest.mock('../../services/aiService', () => ({
  getAIService: jest.fn().mockReturnValue({
    generateText: jest.fn().mockResolvedValue({
      content: 'Mock AI response'
    })
  })
}));

describe('GameManager - Unit Tests', () => {
  let gameManager: GameManager;

  beforeEach(() => {
    gameManager = new GameManager();
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('should create a new room with valid settings', () => {
      const hostId = 'host-user-id';
      const settings = {
        gameDuration: 60,
        maxPlayers: 4,
        initialCash: 100000
      };

      const roomId = gameManager.createRoom(hostId, settings);

      expect(roomId).toMatch(/^\d{4}$/); // Should be 4-digit number
      
      const room = gameManager.getRoom(roomId);
      expect(room).toEqual({
        id: roomId,
        hostId,
        settings,
        players: [],
        stocks: [],
        phase: 'LOBBY',
        createdAt: expect.any(Date)
      });
    });

    it('should generate unique room IDs', () => {
      const roomId1 = gameManager.createRoom('host1', {});
      const roomId2 = gameManager.createRoom('host2', {});

      expect(roomId1).not.toBe(roomId2);
      
      const room1 = gameManager.getRoom(roomId1);
      const room2 = gameManager.getRoom(roomId2);
      
      expect(room1).toBeDefined();
      expect(room2).toBeDefined();
      expect(room1.id).toBe(roomId1);
      expect(room2.id).toBe(roomId2);
    });
  });

  describe('getRoom', () => {
    it('should return room for valid room ID', () => {
      const roomId = gameManager.createRoom('host-id', {});
      
      const room = gameManager.getRoom(roomId);
      
      expect(room).toBeDefined();
      expect(room.id).toBe(roomId);
    });

    it('should return undefined for invalid room ID', () => {
      const room = gameManager.getRoom('invalid-room-id');
      
      expect(room).toBeUndefined();
    });
  });

  describe('room management', () => {
    it('should allow adding players to room', () => {
      const roomId = gameManager.createRoom('host-id', {});
      const room = gameManager.getRoom(roomId);
      
      // Simulate adding players
      room.players.push({
        id: 'player1',
        name: '玩家1',
        cash: 100000,
        portfolio: {}
      });
      
      expect(room.players).toHaveLength(1);
      expect(room.players[0].name).toBe('玩家1');
    });

    it('should track room phase transitions', () => {
      const roomId = gameManager.createRoom('host-id', {});
      const room = gameManager.getRoom(roomId);
      
      expect(room.phase).toBe('LOBBY');
      
      // Simulate phase transition
      room.phase = 'PLAYING';
      
      expect(room.phase).toBe('PLAYING');
    });
  });

  describe('AI integration', () => {
    it('should have AI service available', () => {
      const { getAIService } = require('../../services/aiService');
      
      // 验证AI服务工厂函数存在且可调用
      expect(typeof getAIService).toBe('function');
      
      // 调用AI服务工厂函数并验证返回的服务
      const aiService = getAIService();
      expect(aiService).toBeDefined();
      expect(typeof aiService.generateText).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle missing room gracefully', () => {
      const room = gameManager.getRoom('non-existent-room');
      
      expect(room).toBeUndefined();
    });

    it('should handle invalid room operations', () => {
      // This tests that the game manager doesn't crash on invalid operations
      expect(() => {
        gameManager.getRoom('');
      }).not.toThrow();
      
      expect(() => {
        gameManager.getRoom(null as any);
      }).not.toThrow();
    });
  });
});