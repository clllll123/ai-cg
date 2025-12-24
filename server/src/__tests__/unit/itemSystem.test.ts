import { ItemType, GameItem, AVAILABLE_ITEMS, ItemManager } from '../../game/itemSystem';

describe('ItemSystem', () => {
  describe('ItemType enum', () => {
    it('should have correct item types', () => {
      expect(ItemType.PRICE_PEEK).toBe('PRICE_PEEK');
      expect(ItemType.FREEZE_STOCK).toBe('FREEZE_STOCK');
      expect(ItemType.TAX_AUDIT).toBe('TAX_AUDIT');
      expect(ItemType.INSIDER_NEWS).toBe('INSIDER_NEWS');
    });
  });

  describe('GameItem interface', () => {
    it('should have correct structure', () => {
      const sampleItem: GameItem = {
        id: 'test-item',
        type: ItemType.PRICE_PEEK,
        name: '测试道具',
        description: '测试描述',
        cost: 1000,
        cooldown: 60
      };

      expect(sampleItem.id).toBe('test-item');
      expect(sampleItem.type).toBe(ItemType.PRICE_PEEK);
      expect(sampleItem.name).toBe('测试道具');
      expect(sampleItem.description).toBe('测试描述');
      expect(sampleItem.cost).toBe(1000);
      expect(sampleItem.cooldown).toBe(60);
    });
  });

  describe('AVAILABLE_ITEMS', () => {
    it('should contain all available items', () => {
      expect(AVAILABLE_ITEMS).toHaveLength(3);
      
      const peekItem = AVAILABLE_ITEMS.find(item => item.id === 'item_peek');
      const freezeItem = AVAILABLE_ITEMS.find(item => item.id === 'item_freeze');
      const auditItem = AVAILABLE_ITEMS.find(item => item.id === 'item_audit');

      expect(peekItem).toBeDefined();
      expect(peekItem?.type).toBe(ItemType.PRICE_PEEK);
      expect(peekItem?.name).toBe('内幕透视镜');
      expect(peekItem?.cost).toBe(5000);

      expect(freezeItem).toBeDefined();
      expect(freezeItem?.type).toBe(ItemType.FREEZE_STOCK);
      expect(freezeItem?.name).toBe('停牌令');
      expect(freezeItem?.cost).toBe(10000);

      expect(auditItem).toBeDefined();
      expect(auditItem?.type).toBe(ItemType.TAX_AUDIT);
      expect(auditItem?.name).toBe('税务稽查');
      expect(auditItem?.cost).toBe(8000);
    });

    it('should have valid item properties', () => {
      AVAILABLE_ITEMS.forEach(item => {
        expect(item.id).toBeDefined();
        expect(item.type).toBeDefined();
        expect(item.name).toBeDefined();
        expect(item.description).toBeDefined();
        expect(item.cost).toBeGreaterThan(0);
        expect(item.cooldown).toBeGreaterThan(0);
      });
    });
  });

  describe('ItemManager', () => {
    let itemManager: ItemManager;

    beforeEach(() => {
      itemManager = new ItemManager();
    });

    it('should process item use successfully', () => {
      const result = itemManager.processItemUse('user123', 'item_peek', 'stock456');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Used item item_peek');
    });

    it('should process item use without target', () => {
      const result = itemManager.processItemUse('user123', 'item_peek');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Used item item_peek');
    });

    it('should handle different item types', () => {
      const items = ['item_peek', 'item_freeze', 'item_audit'];
      
      items.forEach(itemId => {
        const result = itemManager.processItemUse('user123', itemId, 'target456');
        expect(result.success).toBe(true);
        expect(result.message).toContain(`Used item ${itemId}`);
      });
    });
  });
});