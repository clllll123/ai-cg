# 自动部署版 Dockerfile - 使用基于 Debian 的镜像解决 Prisma 兼容性问题
FROM node:18-slim

# 安装必要的系统库
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制后端文件
COPY server/package*.json ./server/
COPY server ./server/

# 安装后端依赖并构建
RUN cd server && npm ci --only=production
RUN cd server && npm run build

# 生成 Prisma 客户端
RUN cd server && npx prisma generate

# 复制必要的配置文件
COPY server/.env* ./server/
COPY server/prisma ./server/prisma/

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动命令
CMD ["node", "server/dist/index.js"]