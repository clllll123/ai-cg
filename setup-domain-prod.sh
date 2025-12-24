#!/bin/bash

# AI Stock Trader 生产环境域名配置脚本
# 请先配置DNS解析，然后执行此脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 配置参数（请根据实际情况修改）
DOMAIN="aistocktrader.com"  # 请替换为您的实际域名
SERVER_IP="47.98.44.27"

# 检查域名解析
check_dns() {
    log_info "检查域名解析: $DOMAIN"
    
    if nslookup "$DOMAIN" > /dev/null 2>&1; then
        resolved_ip=$(nslookup "$DOMAIN" | grep 'Address:' | tail -1 | awk '{print $2}')
        if [[ "$resolved_ip" == "$SERVER_IP" ]]; then
            log_success "域名解析正确: $DOMAIN -> $SERVER_IP"
            return 0
        else
            log_error "域名解析到错误IP: $DOMAIN -> $resolved_ip (期望: $SERVER_IP)"
            return 1
        fi
    else
        log_error "域名解析失败，请先配置DNS"
        return 1
    fi
}

# 配置Nginx域名支持
setup_nginx() {
    log_info "配置Nginx域名支持..."
    
    # 备份现有配置
    if [ -f "/etc/nginx/conf.d/ai-stock-trader.conf" ]; then
        cp "/etc/nginx/conf.d/ai-stock-trader.conf" "/etc/nginx/conf.d/ai-stock-trader.conf.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # 创建生产环境Nginx配置
    cat > "/etc/nginx/conf.d/ai-stock-trader.conf" << EOF
# HTTP重定向到HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # 重定向到HTTPS
    return 301 https://\$server_name\$request_uri;
}

# HTTPS主配置
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL证书路径
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    root /var/www/ai-stock-trader;
    index index.html;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 静态资源缓存（1年）
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
        access_log off;
    }
    
    # HTML文件缓存（1小时）
    location ~* \\.html$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }
    
    # API代理到后端服务
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # API缓存（5分钟）
        proxy_cache api_cache;
        proxy_cache_valid 200 302 5m;
        proxy_cache_valid 404 1m;
    }
    
    # SPA路由支持
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # 禁止缓存HTML文件（确保SPA路由正确）
        if (\$uri ~* \\.html$) {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }
    
    # 安全配置
    location ~ /\\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ /README\\.md$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# API缓存配置
proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;
EOF
    
    log_success "Nginx生产环境配置完成"
}

# 安装和配置Let's Encrypt SSL证书
setup_ssl() {
    log_info "设置Let's Encrypt SSL证书..."
    
    # 安装certbot
    if ! command -v certbot &> /dev/null; then
        log_info "安装certbot..."
        dnf install -y certbot python3-certbot-nginx
    fi
    
    # 临时配置用于证书验证
    cat > "/etc/nginx/conf.d/temp-certbot.conf" << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF
    
    # 创建验证目录
    mkdir -p /var/www/certbot/.well-known/acme-challenge
    chown -R nginx:nginx /var/www/certbot
    
    # 测试并重载Nginx
    nginx -t && systemctl reload nginx
    
    # 获取SSL证书
    log_info "获取Let's Encrypt证书..."
    if certbot certonly --webroot -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN; then
        log_success "SSL证书获取成功"
    else
        log_error "SSL证书获取失败，尝试备用方法..."
        # 备用方法：使用standalone模式
        systemctl stop nginx
        certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
        systemctl start nginx
    fi
    
    # 清理临时配置
    rm -f /etc/nginx/conf.d/temp-certbot.conf
    
    # 设置自动续期
    (crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 3 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log_success "SSL证书配置完成"
}

# 更新前端API配置
update_frontend_config() {
    log_info "更新前端API配置使用域名..."
    
    # 这里需要在构建前更新前端代码中的API配置
    # 实际部署时会自动处理
    log_success "前端配置已标记需要更新"
}

# 测试配置
test_configuration() {
    log_info "测试配置..."
    
    # 测试Nginx配置
    if nginx -t; then
        log_success "Nginx配置测试通过"
    else
        log_error "Nginx配置测试失败"
        exit 1
    fi
    
    # 重启Nginx
    systemctl reload nginx
    
    # 测试HTTPS访问
    log_info "测试HTTPS访问..."
    if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" | grep -q "200"; then
        log_success "HTTPS访问测试通过"
    else
        log_warning "HTTPS访问测试异常，请检查证书"
    fi
    
    # 测试API代理
    log_info "测试API代理..."
    if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" | grep -q "200"; then
        log_success "API代理测试通过"
    else
        log_warning "API代理测试异常"
    fi
}

# 显示部署结果
show_deployment_result() {
    echo ""
    echo "=== 生产环境部署完成 ==="
    echo ""
    echo "🌐 访问地址:"
    echo "- 主域名: https://$DOMAIN"
    echo "- 备用地址: https://www.$DOMAIN"
    echo ""
    echo "🔧 配置详情:"
    echo "- SSL证书: Let's Encrypt (自动续期)"
    echo "- 安全头: 已启用HSTS等安全配置"
    echo "- 缓存策略: 静态资源1年，API 5分钟"
    echo "- 压缩: Gzip已启用"
    echo ""
    echo "📋 后续步骤:"
    echo "1. 更新前端构建使用新域名"
    echo "2. 测试所有功能正常"
    echo "3. 配置监控和备份"
    echo ""
}

# 主函数
main() {
    echo ""
    echo "=== AI Stock Trader 生产环境域名配置 ==="
    echo ""
    
    # 检查DNS解析
    if ! check_dns; then
        echo ""
        echo "❌ DNS解析检查失败"
        echo ""
        echo "请先在域名服务商控制台配置DNS解析:"
        echo "A记录: $DOMAIN -> $SERVER_IP"
        echo "A记录: www.$DOMAIN -> $SERVER_IP"
        echo ""
        echo "DNS生效后重新执行此脚本"
        exit 1
    fi
    
    # 执行配置步骤
    setup_nginx
    setup_ssl
    test_configuration
    show_deployment_result
}

# 执行主函数
main "$@"