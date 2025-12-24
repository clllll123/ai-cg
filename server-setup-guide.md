# 服务器配置指南

## 1. 服务器环境准备

### 系统要求
- Ubuntu 20.04+ / CentOS 8+
- Docker 20.10+
- Docker Compose 2.0+
- 至少2GB RAM，20GB磁盘空间

### 安装Docker
```bash
# Ubuntu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# CentOS
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
```

## 2. 目录结构配置

```bash
# 创建部署目录
sudo mkdir -p /var/www/ai-stock-trader
sudo chown -R $USER:$USER /var/www/ai-stock-trader

# 创建日志目录
sudo mkdir -p /var/log/ai-stock-trader
sudo chown -R $USER:$USER /var/log/ai-stock-trader
```

## 3. Nginx配置（前端静态资源）

```bash
# 安装Nginx
sudo apt update && sudo apt install -y nginx

# 创建Nginx配置文件
sudo nano /etc/nginx/sites-available/ai-stock-trader
```

**Nginx配置内容**：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名
    root /var/www/ai-stock-trader;
    index index.html;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API代理到后端
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/ai-stock-trader /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 4. 防火墙配置

```bash
# 启用防火墙
sudo ufw enable

# 开放必要端口
sudo ufw allow ssh
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3000  # 后端API

# 查看防火墙状态
sudo ufw status
```

## 5. 监控和日志配置

### 系统监控
```bash
# 安装基础监控工具
sudo apt install -y htop iotop nethogs

# 设置日志轮转
sudo nano /etc/logrotate.d/ai-stock-trader
```

**日志轮转配置**：
```
/var/log/ai-stock-trader/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
```

## 6. 备份策略

### 数据库备份
```bash
# 创建备份脚本
sudo nano /root/backup-database.sh
```

**备份脚本内容**：
```bash
#!/bin/bash
BACKUP_DIR="/backup/ai-stock-trader"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
docker exec stock-trader-app sh -c 'sqlite3 /app/prisma/dev.db ".backup /tmp/backup.db"'
docker cp stock-trader-app:/tmp/backup.db $BACKUP_DIR/db_backup_$DATE.db

# 备份配置文件
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz /var/www/ai-stock-trader /root/stock-trader/server/.env.production

# 清理旧备份（保留最近7天）
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR"
```

```bash
# 设置定时备份（每天凌晨2点）
(crontab -l ; echo "0 2 * * * /root/backup-database.sh") | crontab -
```