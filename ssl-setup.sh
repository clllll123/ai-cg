#!/bin/bash

# SSL证书设置脚本
# 使用方法: ./ssl-setup.sh [域名]

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN=${1:-aistocktrader.com}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 检查域名解析
check_dns() {
    log_info "检查域名解析: ${DOMAIN}"
    
    if ! nslookup ${DOMAIN} > /dev/null 2>&1; then
        echo "⚠️  域名 ${DOMAIN} 解析失败，请确保DNS配置正确"
        echo "建议配置:"
        echo "A记录: ${DOMAIN} -> 您的服务器IP"
        echo "A记录: www.${DOMAIN} -> 您的服务器IP"
        return 1
    fi
    
    log_success "域名解析正常"
}

# 使用Let's Encrypt获取免费SSL证书
setup_letsencrypt() {
    log_info "设置Let's Encrypt SSL证书..."
    
    # 安装certbot
    if ! command -v certbot &> /dev/null; then
        log_info "安装certbot..."
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
    fi
    
    # 获取证书
    log_info "获取SSL证书..."
    sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN}
    
    # 设置自动续期
    log_info "设置证书自动续期..."
    (crontab -l ; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log_success "SSL证书设置完成"
}

# 手动SSL证书设置（备用方案）
setup_manual_ssl() {
    log_info "设置手动SSL证书..."
    
    # 创建SSL目录
    sudo mkdir -p /etc/ssl/certs
    sudo mkdir -p /etc/ssl/private
    
    # 生成自签名证书（生产环境应使用正式证书）
    log_info "生成自签名证书（仅用于测试）..."
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/${DOMAIN}.key \
        -out /etc/ssl/certs/${DOMAIN}.crt \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=AI Stock Trader/CN=${DOMAIN}"
    
    # 设置权限
    sudo chmod 600 /etc/ssl/private/${DOMAIN}.key
    sudo chmod 644 /etc/ssl/certs/${DOMAIN}.crt
    
    log_success "手动SSL证书设置完成（仅测试用途）"
}

# 配置Nginx
setup_nginx() {
    log_info "配置Nginx..."
    
    # 备份原有配置
    if [ -f "/etc/nginx/sites-available/ai-stock-trader" ]; then
        sudo cp /etc/nginx/sites-available/ai-stock-trader /etc/nginx/sites-available/ai-stock-trader.backup
    fi
    
    # 复制配置文件
    sudo cp nginx.conf /etc/nginx/sites-available/ai-stock-trader
    
    # 替换域名
    sudo sed -i "s/aistocktrader.com/${DOMAIN}/g" /etc/nginx/sites-available/ai-stock-trader
    
    # 启用站点
    if [ ! -f "/etc/nginx/sites-enabled/ai-stock-trader" ]; then
        sudo ln -s /etc/nginx/sites-available/ai-stock-trader /etc/nginx/sites-enabled/
    fi
    
    # 测试配置
    if sudo nginx -t; then
        sudo systemctl reload nginx
        log_success "Nginx配置完成"
    else
        echo "❌ Nginx配置测试失败"
        exit 1
    fi
}

# 主函数
main() {
    log_info "开始SSL证书和域名配置"
    
    # 检查DNS解析
    check_dns
    
    # 选择SSL证书方案
    echo "请选择SSL证书方案:"
    echo "1. Let's Encrypt（免费，推荐）"
    echo "2. 手动设置（测试用途）"
    read -p "请输入选择 (1/2): " ssl_choice
    
    case $ssl_choice in
        1)
            setup_letsencrypt
            ;;
        2)
            setup_manual_ssl
            ;;
        *)
            echo "无效选择，使用Let's Encrypt"
            setup_letsencrypt
            ;;
    esac
    
    # 配置Nginx
    setup_nginx
    
    log_success "SSL证书和域名配置完成！"
    echo "应用地址: https://${DOMAIN}"
}

# 执行主函数
main "$@"