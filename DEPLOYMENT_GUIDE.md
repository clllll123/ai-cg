# AI股市操盘手 - 阿里云轻量服务器部署指南

## 概述

本指南详细说明如何将AI股市操盘手项目部署到阿里云轻量应用服务器，包括环境配置、项目部署、数据库设置、反向代理配置等完整流程。

## 服务器规格建议

### 推荐配置
- **CPU**: 2核或以上
- **内存**: 4GB或以上  
- **系统盘**: 40GB SSD
- **带宽**: 3Mbps或以上
- **操作系统**: Ubuntu 20.04/22.04 LTS

### 最低配置
- **CPU**: 1核
- **内存**: 2GB
- **系统盘**: 20GB SSD
- **带宽**: 1Mbps

## 第一步：服务器环境配置

### 1.1 服务器购买与初始化

1. **购买阿里云轻量应用服务器**
   - 登录阿里云控制台
   - 选择"轻量应用服务器"
   - 选择推荐配置，操作系统选择Ubuntu 20.04/22.04 LTS
   - 完成购买并获取服务器IP地址、用户名和密码

2. **服务器安全组配置**
   ```bash
   # 开放必要端口
   - 22 (SSH)
   - 80 (HTTP)
   - 443 (HTTPS)
   - 3000 (前端开发服务器)
   - 5000 (后端API服务器)
   ```

### 1.2 系统环境配置

**连接到服务器**
```bash
ssh root@你的服务器IP地址
```

**更新系统包**
```bash
apt update && apt upgrade -y
```

**安装必要工具**
```bash
apt install -y curl wget vim git htop nginx supervisor
```

### 1.3 Node.js环境安装

**安装Node.js 18 LTS**
```bash
# 方法一：使用NodeSource仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 方法二：使用NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

**验证安装**
```bash
node --version  # 应该显示 v18.x.x
npm --version   # 应该显示 9.x.x
```

### 1.4 数据库安装与配置

**安装SQLite（开发环境）**
```bash
apt install -y sqlite3
```

**安装PostgreSQL（生产环境推荐）**
```bash
# 安装PostgreSQL
apt install -y postgresql postgresql-contrib

# 启动服务
systemctl start postgresql
systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
```

**PostgreSQL配置**
```sql
-- 创建数据库用户
CREATE USER stock_user WITH PASSWORD '你的密码';

-- 创建数据库
CREATE DATABASE stock_game OWNER stock_user;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE stock_game TO stock_user;

-- 退出
\q
```

## 第二步：项目部署

### 2.1 项目文件上传

**方法一：使用Git克隆（推荐）**
```bash
# 创建项目目录
mkdir -p /var/www/stock-game
cd /var/www/stock-game

# 克隆项目（如果使用Git仓库）
git clone 你的项目仓库地址 .
```

**方法二：使用SCP上传**
```bash
# 在本地执行
scp -r /本地项目路径/* root@服务器IP:/var/www/stock-game/
```

**方法三：使用FTP/SFTP**
- 使用FileZilla等FTP客户端上传项目文件

### 2.2 项目依赖安装

**安装前端依赖**
```bash
cd /var/www/stock-game
npm install
```

**安装后端依赖**
```bash
cd /var/www/stock-game/server
npm install
```

### 2.3 环境变量配置

**创建环境变量文件**
```bash
# 前端环境变量
vim /var/www/stock-game/.env.production
```

**前端环境变量配置**
```env
VITE_API_BASE_URL=https://你的域名.com/api
VITE_APP_TITLE=AI股市操盘手
VITE_APP_VERSION=1.0.0
```

**后端环境变量配置**
```bash
# 后端环境变量
vim /var/www/stock-game/server/.env
```

```env
# 数据库配置
DATABASE_URL="postgresql://stock_user:你的密码@localhost:5432/stock_game"
# 或者使用SQLite
DATABASE_URL="file:./dev.db"

# JWT配置
JWT_SECRET=你的JWT密钥
JWT_EXPIRES_IN=7d

# AI服务配置
DEEPSEEK_API_KEY=你的DeepSeek API密钥
TONGYI_API_KEY=你的通义千问API密钥

# 服务器配置
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://你的域名.com
```

### 2.4 数据库初始化

**初始化数据库**
```bash
cd /var/www/stock-game/server

# 生成Prisma客户端
npx prisma generate

# 数据库迁移
npx prisma db push

# 可选：填充初始数据
npx prisma db seed
```

## 第三步：服务配置

### 3.1 前端构建

**构建生产版本**
```bash
cd /var/www/stock-game
npm run build
```

**验证构建结果**
```bash
# 检查dist目录是否生成
ls -la dist/
```

### 3.2 后端服务配置

**使用PM2管理后端进程**
```bash
# 全局安装PM2
npm install -g pm2

# 创建PM2配置文件
vim /var/www/stock-game/ecosystem.config.js
```

**PM2配置文件**
```javascript
module.exports = {
  apps: [{
    name: 'stock-game-api',
    script: './server/dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/api-err.log',
    out_file: './logs/api-out.log',
    log_file: './logs/api-combined.log',
    time: true
  }]
};
```

**启动后端服务**
```bash
cd /var/www/stock-game
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3.3 Nginx反向代理配置

**创建Nginx配置文件**
```bash
vim /etc/nginx/sites-available/stock-game
```

**Nginx配置内容**
```nginx
server {
    listen 80;
    server_name 你的域名.com www.你的域名.com;
    
    # 前端静态文件
    location / {
        root /var/www/stock-game/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**启用站点配置**
```bash
# 创建符号链接
ln -s /etc/nginx/sites-available/stock-game /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
systemctl enable nginx
```

## 第四步：SSL证书配置（可选但推荐）

### 4.1 使用Let's Encrypt免费SSL证书

**安装Certbot**
```bash
# Ubuntu 20.04+
apt install -y certbot python3-certbot-nginx
```

**获取SSL证书**
```bash
certbot --nginx -d 你的域名.com -d www.你的域名.com
```

**自动续期设置**
```bash
# 测试自动续期
certbot renew --dry-run

# 设置定时任务
crontab -e
# 添加以下行（每天凌晨2点检查续期）
0 2 * * * /usr/bin/certbot renew --quiet
```

## 第五步：防火墙和安全配置

### 5.1 配置UFW防火墙

```bash
# 启用UFW
ufw enable

# 允许SSH
ufw allow ssh

# 允许HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# 查看状态
ufw status
```

### 5.2 安全加固

**禁用root SSH登录**
```bash
vim /etc/ssh/sshd_config
```

修改以下配置：
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

**重启SSH服务**
```bash
systemctl restart sshd
```

## 第六步：部署后测试

### 6.1 服务状态检查

```bash
# 检查Nginx状态
systemctl status nginx

# 检查PM2状态
pm2 status

# 检查端口监听
netstat -tulpn | grep -E '(:80|:443|:5000)'
```

### 6.2 功能测试

**前端访问测试**
- 浏览器访问：`http://你的域名.com`
- 检查页面是否正常加载
- 测试登录/注册功能

**API接口测试**
```bash
# 测试健康检查接口
curl http://localhost:5000/api/health

# 测试用户注册接口
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"123456","nickname":"测试用户"}'
```

### 6.3 性能监控

**安装监控工具**
```bash
# 安装htop进行系统监控
apt install -y htop

# 使用PM2监控应用
pm2 monit
```

## 第七步：日常维护

### 7.1 日志管理

**查看应用日志**
```bash
# PM2日志
pm2 logs stock-game-api

# Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 7.2 备份策略

**数据库备份**
```bash
# PostgreSQL备份
pg_dump -U stock_user stock_game > /backup/stock_game_$(date +%Y%m%d).sql

# SQLite备份
cp /var/www/stock-game/server/dev.db /backup/dev.db_$(date +%Y%m%d)
```

**项目文件备份**
```bash
# 创建备份脚本
vim /usr/local/bin/backup-stock-game.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backup/stock-game"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR/$DATE

# 备份项目文件
tar -czf $BACKUP_DIR/$DATE/project.tar.gz /var/www/stock-game

# 备份数据库
pg_dump -U stock_user stock_game > $BACKUP_DIR/$DATE/database.sql

# 保留最近7天的备份
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;

echo "备份完成: $BACKUP_DIR/$DATE"
```

### 7.3 更新部署流程

**代码更新部署**
```bash
cd /var/www/stock-game

# 拉取最新代码
git pull origin main

# 安装依赖
npm install
cd server && npm install

# 构建前端
npm run build

# 数据库迁移
npx prisma db push

# 重启服务
pm2 restart stock-game-api
```

## 故障排除

### 常见问题解决

**1. 端口被占用**
```bash
# 查看端口占用
lsof -i :5000

# 杀死占用进程
kill -9 <PID>
```

**2. 权限问题**
```bash
# 修改文件权限
chown -R www-data:www-data /var/www/stock-game
chmod -R 755 /var/www/stock-game
```

**3. 数据库连接失败**
```bash
# 检查PostgreSQL服务状态
systemctl status postgresql

# 检查连接
psql -U stock_user -d stock_game -h localhost
```

**4. Nginx配置错误**
```bash
# 检查配置语法
nginx -t

# 查看错误日志
tail -f /var/log/nginx/error.log
```

## 性能优化建议

### 前端优化
- 启用Gzip压缩
- 配置浏览器缓存
- 使用CDN加速静态资源

### 后端优化
- 数据库连接池优化
- API响应缓存
- 负载均衡配置

### 服务器优化
- 内核参数调优
- 内存优化配置
- 监控告警设置

## 总结

通过以上步骤，您已经成功将AI股市操盘手项目部署到阿里云轻量应用服务器。部署完成后，建议定期进行系统维护、安全更新和性能监控，确保应用稳定运行。

如有任何问题，请参考故障排除部分或查看相关日志文件进行诊断。