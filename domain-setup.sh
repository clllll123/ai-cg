#!/bin/bash

# 域名和SSL证书配置脚本
# 支持自定义域名和多种SSL证书选项

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

# 交互式获取域名信息
get_domain_info() {
    echo ""
    echo "=== 域名配置向导 ==="
    echo ""
    
    # 获取域名
    while true; do
        read -p "请输入您的域名 (例如: aistocktrader.com): " DOMAIN
        if [[ -n "$DOMAIN" ]]; then
            break
        else
            log_error "域名不能为空"
        fi
    done
    
    # 获取服务器IP（自动检测或手动输入）
    SERVER_IP="47.98.44.27"
    read -p "服务器IP地址 [默认: $SERVER_IP]: " input_ip
    if [[ -n "$input_ip" ]]; then
        SERVER_IP="$input_ip"
    fi
    
    # SSL证书选项
    echo ""
    echo "请选择SSL证书类型:"
    echo "1. Let's Encrypt (免费，需要域名解析生效)"
    echo "2. 自签名证书 (测试用，浏览器会显示不安全)"
    echo "3. 已有证书 (手动上传证书文件)"
    
    while true; do
        read -p "请选择 [1-3]: " ssl_choice
        case $ssl_choice in
            1) SSL_TYPE="letsencrypt"; break ;;
            2) SSL_TYPE="selfsigned"; break ;;
            3) SSL_TYPE="existing"; break ;;
            *) log_error "无效选择，请重新输入" ;;
        esac
    done
    
    log_success "域名信息收集完成"
}

# 检查域名解析状态
check_dns_resolution() {
    log_info "检查域名解析状态..."
    
    if nslookup "$DOMAIN" > /dev/null 2>&1; then
        resolved_ip=$(nslookup "$DOMAIN" | grep 'Address:' | tail -1 | awk '{print $2}')
        if [[ "$resolved_ip" == "$SERVER_IP" ]]; then
            log_success "域名解析正确: $DOMAIN -> $SERVER_IP"
            return 0
        else
            log_warning "域名解析到不同IP: $DOMAIN -> $resolved_ip (期望: $SERVER_IP)"
            return 1
        fi
    else
        log_warning "域名解析失败，请检查DNS配置"
        return 1
    fi
}

# 显示DNS配置指南
show_dns_guide() {
    echo ""
    echo "=== DNS配置指南 ==="
    echo ""
    echo "请在您的域名服务商控制台添加以下记录:"
    echo ""
    echo "A记录配置:"
    echo "- 主机记录: @        指向: $SERVER_IP"
    echo "- 主机记录: www      指向: $SERVER_IP"
    echo ""
    echo "可选CNAME记录:"
    echo "- 主机记录: api      指向: $DOMAIN"
    echo "- 主机记录: assets   指向: $DOMAIN"
    echo ""
    echo "DNS生效时间通常为10分钟到24小时"
    echo ""
}

# 配置Nginx支持域名和HTTPS
setup_nginx_domain() {
    log_info "配置Nginx域名支持..."
    
    # 备份现有配置
    if [ -f "/etc/nginx/conf.d/ai-stock-trader.conf" ]; then
        cp "/etc/nginx/conf.d/ai-stock-trader.conf" "/etc/nginx/conf.d/ai-stock-trader.conf.backup"
    fi
    
    # 创建新的Nginx配置
    cat > "/etc/nginx/conf.d/ai-stock-trader.conf" << EOF
# HTTP重定向到HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # 重定向到HTTPS
    return 301 https://\$server_name\$request_uri;
}

# HTTPS配置
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL证书路径（稍后配置）
    ssl_certificate /etc/ssl/certs/$DOMAIN.crt;
    ssl_certificate_key /etc/ssl/private/$DOMAIN.key;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
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
        proxy_set_header Connection 'upgrade';
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
    
    # 安全配置
    location ~ /\\. {
        deny all;
    }
    
    location ~ /README\\.md$ {
        deny all;
    }
}
EOF
    
    log_success "Nginx域名配置完成"
}

# 设置Let's Encrypt SSL证书
setup_letsencrypt_ssl() {
    log_info "设置Let's Encrypt SSL证书..."
    
    # 安装certbot
    if ! command -v certbot &> /dev/null; then
        log_info "安装certbot..."
        dnf install -y certbot python3-certbot-nginx
    fi
    
    # 临时配置HTTP用于证书验证
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
    
    # 测试Nginx配置
    nginx -t
    systemctl reload nginx
    
    # 获取证书
    log_info "获取Let's Encrypt证书..."
    certbot certonly --webroot -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    # 更新Nginx配置使用真实证书
    sed -i "s|ssl_certificate /etc/ssl/certs/$DOMAIN.crt;|ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;|" /etc/nginx/conf.d/ai-stock-trader.conf
    sed -i "s|ssl_certificate_key /etc/ssl/private/$DOMAIN.key;|ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;|" /etc/nginx/conf.d/ai-stock-trader.conf
    
    # 清理临时配置
    rm -f /etc/nginx/conf.d/temp-certbot.conf
    
    # 设置自动续期
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log_success "Let's Encrypt SSL证书配置完成"
}

# 设置自签名证书
setup_selfsigned_ssl() {
    log_info "设置自签名SSL证书..."
    
    # 创建证书目录
    mkdir -p /etc/ssl/certs /etc/ssl/private
    
    # 生成自签名证书
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/$DOMAIN.key \
        -out /etc/ssl/certs/$DOMAIN.crt \
        -subj "/C=CN/ST=Zhejiang/L=Hangzhou/O=AI Stock Trader/CN=$DOMAIN"
    
    log_success "自签名SSL证书生成完成"
}

# 主函数
main() {
    echo ""
    echo "=== AI Stock Trader 域名和SSL配置 ==="
    echo ""
    
    # 获取域名信息
    get_domain_info
    
    # 检查域名解析
    if ! check_dns_resolution; then
        show_dns_guide
        read -p "是否继续配置？(y/N): " continue_choice
        if [[ ! "$continue_choice" =~ ^[Yy]$ ]]; then
            log_info "配置已取消"
            exit 0
        fi
    fi
    
    # 配置Nginx
    setup_nginx_domain
    
    # 配置SSL证书
    case "$SSL_TYPE" in
        "letsencrypt")
            setup_letsencrypt_ssl
            ;;
        "selfsigned")
            setup_selfsigned_ssl
            ;;
        "existing")
            log_info "请手动上传证书文件到服务器"
            log_info "证书路径: /etc/ssl/certs/$DOMAIN.crt"
            log_info "私钥路径: /etc/ssl/private/$DOMAIN.key"
            ;;
    esac
    
    # 测试并重启Nginx
    log_info "测试Nginx配置..."
    nginx -t
    
    log_info "重启Nginx服务..."
    systemctl reload nginx
    
    # 显示配置结果
    echo ""
    echo "=== 配置完成 ==="
    echo ""
    echo "域名: $DOMAIN"
    echo "SSL类型: $SSL_TYPE"
    echo ""
    echo "访问地址:"
    echo "- HTTPS: https://$DOMAIN"
    echo "- 备用: https://www.$DOMAIN"
    echo ""
    echo "下一步:"
    echo "1. 确保DNS解析已生效"
    echo "2. 更新前端API配置使用新域名"
    echo "3. 测试所有功能"
    echo ""
}

# 执行主函数
main "$@"