import { PrismaClient } from '@prisma/client';

// 测试数据库配置
const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db'
    }
  }
});

// 全局测试设置
beforeAll(async () => {
  // 创建测试数据库
  await testPrisma.$executeRaw`PRAGMA foreign_keys = OFF`;
  
  // 删除所有表（按依赖关系顺序）
  await testPrisma.$executeRaw`DROP TABLE IF EXISTS UserItem`;
  await testPrisma.$executeRaw`DROP TABLE IF EXISTS GameResult`;
  await testPrisma.$executeRaw`DROP TABLE IF EXISTS GamePlayer`;
  await testPrisma.$executeRaw`DROP TABLE IF EXISTS GameRoom`;
  await testPrisma.$executeRaw`DROP TABLE IF EXISTS Item`;
  await testPrisma.$executeRaw`DROP TABLE IF EXISTS User`;
  
  // 重新创建表结构（按依赖关系顺序）
  await testPrisma.$executeRaw`
    CREATE TABLE User (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      nickname TEXT NOT NULL,
      avatar TEXT,
      role TEXT DEFAULT 'USER',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      totalGames INTEGER DEFAULT 0,
      totalWins INTEGER DEFAULT 0,
      totalAssets REAL DEFAULT 100000,
      level INTEGER DEFAULT 1,
      experience INTEGER DEFAULT 0,
      nextLevelExp INTEGER DEFAULT 100,
      rank TEXT DEFAULT '青铜',
      resetToken TEXT,
      resetTokenExpiry DATETIME
    )
  `;

  await testPrisma.$executeRaw`
    CREATE TABLE GameRoom (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      hostId TEXT NOT NULL,
      status TEXT DEFAULT 'LOBBY',
      config TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      endedAt DATETIME
    )
  `;

  await testPrisma.$executeRaw`
    CREATE TABLE GamePlayer (
      id TEXT PRIMARY KEY,
      roomId TEXT NOT NULL,
      userId TEXT,
      name TEXT NOT NULL,
      isBot BOOLEAN DEFAULT FALSE,
      cash REAL,
      debt REAL DEFAULT 0,
      portfolio TEXT,
      FOREIGN KEY (roomId) REFERENCES GameRoom(id),
      UNIQUE(roomId, name)
    )
  `;

  await testPrisma.$executeRaw`
    CREATE TABLE GameResult (
      id TEXT PRIMARY KEY,
      roomId TEXT NOT NULL,
      userId TEXT,
      finalAssets REAL,
      rank INTEGER,
      playedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (roomId) REFERENCES GameRoom(id),
      FOREIGN KEY (userId) REFERENCES User(id)
    )
  `;

  await testPrisma.$executeRaw`
    CREATE TABLE Item (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      effectType TEXT,
      price REAL
    )
  `;

  await testPrisma.$executeRaw`
    CREATE TABLE UserItem (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (userId) REFERENCES User(id),
      FOREIGN KEY (itemId) REFERENCES Item(id),
      UNIQUE(userId, itemId)
    )
  `;

  // 启用外键约束
  await testPrisma.$executeRaw`PRAGMA foreign_keys = ON`;
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

afterEach(async () => {
  // 清理测试数据（按依赖关系顺序，先禁用外键约束）
  await testPrisma.$executeRaw`PRAGMA foreign_keys = OFF`;
  
  // 按依赖关系顺序删除数据（使用条件判断避免表不存在错误）
  try {
    await testPrisma.$executeRaw`DELETE FROM UserItem`;
  } catch (error) {
    // 忽略表不存在的错误
  }
  
  try {
    await testPrisma.$executeRaw`DELETE FROM GameResult`;
  } catch (error) {
    // 忽略表不存在的错误
  }
  
  try {
    await testPrisma.$executeRaw`DELETE FROM GamePlayer`;
  } catch (error) {
    // 忽略表不存在的错误
  }
  
  try {
    await testPrisma.$executeRaw`DELETE FROM GameRoom`;
  } catch (error) {
    // 忽略表不存在的错误
  }
  
  try {
    await testPrisma.$executeRaw`DELETE FROM Item`;
  } catch (error) {
    // 忽略表不存在的错误
  }
  
  try {
    await testPrisma.$executeRaw`DELETE FROM User`;
  } catch (error) {
    // 忽略表不存在的错误
  }
  
  // 重新启用外键约束
  await testPrisma.$executeRaw`PRAGMA foreign_keys = ON`;
});

// 全局测试工具函数
global.testUtils = {
  createTestUser: async (userData = {}) => {
    const defaultUser = {
      id: 'test-user-id',
      username: 'testuser',
      password: 'hashedpassword',
      nickname: '测试用户',
      email: 'test@example.com',
      ...userData
    };
    
    await testPrisma.$executeRaw`
      INSERT INTO User (id, username, password, nickname, email)
      VALUES (${defaultUser.id}, ${defaultUser.username}, ${defaultUser.password}, ${defaultUser.nickname}, ${defaultUser.email})
    `;
    
    return defaultUser;
  }
};

declare global {
  var testUtils: {
    createTestUser: (userData?: any) => Promise<any>;
  };
}