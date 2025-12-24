import { PrismaClient } from '@prisma/client';

// 根据环境变量选择数据库连接
const getPrismaClient = () => {
  if (process.env.NODE_ENV === 'test') {
    return new PrismaClient({
      datasources: {
        db: {
          url: 'file:./test.db'
        }
      }
    });
  }
  
  return new PrismaClient();
};

const prisma = getPrismaClient();

export default prisma;
