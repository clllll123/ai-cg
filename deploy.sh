#!/bin/bash
echo "开始部署股票操盘手应用..."

# 停止并删除旧容器
docker stop stock-trader-app 2>/dev/null || true
docker rm stock-trader-app 2>/dev/null || true

# 重新构建镜像
echo "构建 Docker 镜像..."
docker build -t ai-stock-trader .

# 运行新容器
echo "启动容器..."
docker run -d -p 3000:3000 --name stock-trader-app ai-stock-trader

# 等待应用启动
echo "等待应用启动..."
sleep 10

# 检查应用状态
echo "检查应用状态..."
docker logs stock-trader-app --tail 20

# 测试健康检查
echo "测试健康检查..."
curl -f http://localhost:3000/health || echo "健康检查失败"

echo "部署完成！"
echo "应用地址: http://47.98.44.27:3000"