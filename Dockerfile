# 简化版 Dockerfile - 使用完整的 Node.js 镜像，避免系统依赖安装
FROM node:18

# 设置工作目录
WORKDIR /app

# 复制后端文件
COPY server/package*.json ./server/
COPY server ./server/

# 安装后端依赖并构建
RUN cd server && npm ci
RUN cd server && npm run build

# 生成 Prisma 客户端
RUN cd server && npx prisma generate

# 复制必要的配置文件
COPY server/.env* ./server/
COPY server/prisma ./server/prisma/

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server/dist/index.js"]