#!/bin/bash

# AI Stock Trader 前端部署脚本
# 使用方法: ./deploy-frontend.sh [环境]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 参数处理
ENVIRONMENT=${1:-production}
SERVER_HOST=${2:-47.98.44.27}
DEPLOY_USER=${3:-root}

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查部署依赖..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    if ! command -v ssh &> /dev/null; then
        log_error "SSH 客户端未安装"
        exit 1
    fi
    
    log_success "所有依赖检查通过"
}

# 构建前端
build_frontend() {
    log_info "检查前端构建产物..."
    
    # 检查是否已有构建产物
    if [ -d "dist" ]; then
        BUILD_SIZE=$(du -sh dist | cut -f1)
        log_success "使用现有构建产物，构建大小: ${BUILD_SIZE}"
        return 0
    fi
    
    log_info "开始构建前端应用..."
    
    # 设置环境变量
    export NODE_ENV=production
    export VITE_API_URL=https://${SERVER_HOST}
    
    # 安装依赖
    log_info "安装项目依赖..."
    npm ci --silent
    
    # 跳过TypeScript类型检查，直接构建
    log_info "跳过TypeScript类型检查，直接进行构建..."
    
    # 构建应用
    log_info "执行生产环境构建..."
    npm run build
    
    # 检查构建结果
    if [ ! -d "dist" ]; then
        log_error "构建失败，dist目录未生成"
        exit 1
    fi
    
    # 分析构建文件
    BUILD_SIZE=$(du -sh dist | cut -f1)
    log_success "构建完成，构建大小: ${BUILD_SIZE}"
}

# 准备部署包
prepare_deployment() {
    log_info "准备部署包..."
    
    # 创建部署时间戳
    DEPLOY_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    # 创建部署清单
    cat > dist/deploy-info.json << EOF
{
    "app": "AI Stock Trader",
    "version": "1.0.0",
    "environment": "${ENVIRONMENT}",
    "deployTime": "${DEPLOY_TIMESTAMP}",
    "buildSize": "$(du -sh dist | cut -f1)",
    "gitCommit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
}
EOF
    
    # 创建压缩包
    tar -czf ai-stock-trader-frontend-${DEPLOY_TIMESTAMP}.tar.gz -C dist .
    
    log_success "部署包准备完成: ai-stock-trader-frontend-${DEPLOY_TIMESTAMP}.tar.gz"
}

# 部署到服务器
deploy_to_server() {
    log_info "开始部署到服务器 ${SERVER_HOST}..."
    
    # 获取最新的部署包
    DEPLOY_PACKAGE=$(ls -t ai-stock-trader-frontend-*.tar.gz | head -1)
    
    if [ -z "${DEPLOY_PACKAGE}" ]; then
        log_error "未找到部署包"
        exit 1
    fi
    
    log_info "使用部署包: ${DEPLOY_PACKAGE}"
    
    # 传输到服务器
    log_info "传输文件到服务器..."
    scp ${DEPLOY_PACKAGE} ${DEPLOY_USER}@${SERVER_HOST}:/tmp/
    
    # 在服务器上执行部署
    ssh ${DEPLOY_USER}@${SERVER_HOST} << EOF
        set -e
        
        echo "=== 服务器端部署开始 ==="
        
        # 备份现有部署（如果存在）
        if [ -d "/var/www/ai-stock-trader" ]; then
            echo "备份现有部署..."
            BACKUP_DIR="/backup/ai-stock-trader/$(date +%Y%m%d_%H%M%S)"
            mkdir -p "\${BACKUP_DIR}"
            cp -r /var/www/ai-stock-trader "\${BACKUP_DIR}/"
            
            # 切换部署
            rm -rf /var/www/ai-stock-trader-old
            mv /var/www/ai-stock-trader /var/www/ai-stock-trader-old
        else
            echo "首次部署，创建目录..."
            mkdir -p /var/www/ai-stock-trader-old
        fi
        
        # 解压新部署
        mkdir -p /var/www/ai-stock-trader
        tar -xzf /tmp/${DEPLOY_PACKAGE} -C /var/www/ai-stock-trader
        
        # 设置权限（使用root用户）
        chown -R root:root /var/www/ai-stock-trader
        chmod -R 755 /var/www/ai-stock-trader
        
        # 安装并配置Nginx
        if ! command -v nginx &> /dev/null; then
            echo "安装Nginx..."
            dnf install -y nginx
            systemctl enable nginx
            systemctl start nginx
        fi
        
        # 配置Nginx虚拟主机
        echo "配置Nginx虚拟主机..."
        cat > /etc/nginx/conf.d/ai-stock-trader.conf << 'NGINX_CONFIG'
server {
    listen 80;
    server_name 47.98.44.27;
    
    root /var/www/ai-stock-trader;
    index index.html;
    
    # 静态资源缓存
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
        access_log off;
    }
    
    # API代理到后端服务
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # SPA路由支持
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX_CONFIG
        
        # 测试Nginx配置
        nginx -t
        
        # 重启Nginx
        systemctl restart nginx
        
        echo "部署完成"
EOF
    
    log_success "部署完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    max_attempts=10
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "健康检查尝试 $attempt/$max_attempts"
        
        if curl -f http://${SERVER_HOST} > /dev/null 2>&1; then
            log_success "应用健康检查通过"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "健康检查失败"
            exit 1
        fi
        
        sleep 5
        attempt=$((attempt + 1))
    done
}

# 主函数
main() {
    log_info "开始 AI Stock Trader 前端部署 (环境: ${ENVIRONMENT})"
    
    check_dependencies
    build_frontend
    prepare_deployment
    deploy_to_server
    health_check
    
    log_success "前端部署流程完成！"
    log_info "应用地址: http://${SERVER_HOST}"
}

# 执行主函数
main "$@"