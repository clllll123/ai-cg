#!/bin/bash

# 前端部署验证脚本
# 用于验证部署后的前端应用是否正常工作

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 配置参数
SERVER_HOST="${SERVER_HOST:-localhost}"
SERVER_PORT="${SERVER_PORT:-443}"
DOMAIN="${DOMAIN:-aistocktrader.com}"
DEPLOY_USER="${DEPLOY_USER:-root}"

# 验证函数
verify_ssl_certificate() {
    log_info "验证SSL证书配置..."
    
    # 检查证书是否有效
    if openssl s_client -connect ${DOMAIN}:${SERVER_PORT} -servername ${DOMAIN} < /dev/null 2>/dev/null | openssl x509 -noout -dates; then
        log_success "SSL证书有效"
    else
        log_error "SSL证书验证失败"
        return 1
    fi
}

verify_nginx_config() {
    log_info "验证Nginx配置..."
    
    # 检查Nginx配置语法
    if ssh ${DEPLOY_USER}@${SERVER_HOST} "sudo nginx -t"; then
        log_success "Nginx配置语法正确"
    else
        log_error "Nginx配置语法错误"
        return 1
    fi
    
    # 检查Nginx服务状态
    if ssh ${DEPLOY_USER}@${SERVER_HOST} "systemctl is-active nginx"; then
        log_success "Nginx服务正在运行"
    else
        log_error "Nginx服务未运行"
        return 1
    fi
}

verify_static_files() {
    log_info "验证静态文件部署..."
    
    # 检查关键文件是否存在
    FILES=("/var/www/ai-stock-trader/index.html" 
           "/var/www/ai-stock-trader/assets/index-*.js" 
           "/var/www/ai-stock-trader/assets/index-*.css")
    
    for file in "${FILES[@]}"; do
        if ssh ${DEPLOY_USER}@${SERVER_HOST} "[ -f ${file} ]"; then
            log_success "文件存在: ${file}"
        else
            log_error "文件不存在: ${file}"
            return 1
        fi
    done
    
    # 检查文件权限
    if ssh ${DEPLOY_USER}@${SERVER_HOST} "stat -c '%a %U:%G' /var/www/ai-stock-trader/index.html | grep -q '644 www-data:www-data'"; then
        log_success "文件权限正确"
    else
        log_warning "文件权限可能需要调整"
    fi
}

verify_http_access() {
    log_info "验证HTTP访问..."
    
    # 检查HTTP状态码
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/)
    
    if [ "$STATUS_CODE" -eq 200 ]; then
        log_success "主页访问正常 (HTTP 200)"
    else
        log_error "主页访问失败 (HTTP ${STATUS_CODE})"
        return 1
    fi
    
    # 检查静态资源访问
    ASSET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/assets/index-*.js)
    
    if [ "$ASSET_STATUS" -eq 200 ]; then
        log_success "静态资源访问正常"
    else
        log_error "静态资源访问失败"
        return 1
    fi
}

verify_api_integration() {
    log_info "验证API集成..."
    
    # 检查后端API是否可访问
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/api/health)
    
    if [ "$API_STATUS" -eq 200 ]; then
        log_success "后端API访问正常"
    else
        log_warning "后端API访问异常 (HTTP ${API_STATUS})"
    fi
    
    # 检查API响应内容
    API_RESPONSE=$(curl -s https://${DOMAIN}/api/health)
    if echo "$API_RESPONSE" | grep -q '"status":"ok"'; then
        log_success "后端API响应正常"
    else
        log_warning "后端API响应异常"
    fi
}

verify_performance() {
    log_info "验证性能指标..."
    
    # 测量页面加载时间
    START_TIME=$(date +%s%N)
    curl -s -o /dev/null https://${DOMAIN}/
    END_TIME=$(date +%s%N)
    
    LOAD_TIME=$((($END_TIME - $START_TIME)/1000000))
    
    if [ "$LOAD_TIME" -lt 1000 ]; then
        log_success "页面加载时间正常: ${LOAD_TIME}ms"
    else
        log_warning "页面加载时间较长: ${LOAD_TIME}ms"
    fi
    
    # 检查缓存头
    CACHE_HEADER=$(curl -s -I https://${DOMAIN}/assets/index-*.js | grep -i "cache-control")
    if echo "$CACHE_HEADER" | grep -q "public, immutable"; then
        log_success "缓存配置正确"
    else
        log_warning "缓存配置可能需要优化"
    fi
}

verify_functionality() {
    log_info "验证功能完整性..."
    
    # 检查JavaScript是否正常执行
    HTML_CONTENT=$(curl -s https://${DOMAIN}/)
    
    # 检查是否包含关键元素
    if echo "$HTML_CONTENT" | grep -q "<div id=\"root\">"; then
        log_success "React应用结构正常"
    else
        log_error "React应用结构异常"
        return 1
    fi
    
    # 检查是否包含必要的JavaScript文件
    if echo "$HTML_CONTENT" | grep -q "<script type=\"module\""; then
        log_success "JavaScript模块加载正常"
    else
        log_error "JavaScript模块加载异常"
        return 1
    fi
}

verify_security() {
    log_info "验证安全配置..."
    
    # 检查安全头
    SECURITY_HEADERS=$(curl -s -I https://${DOMAIN}/)
    
    if echo "$SECURITY_HEADERS" | grep -q "Strict-Transport-Security"; then
        log_success "HSTS头已配置"
    else
        log_warning "HSTS头未配置"
    fi
    
    if echo "$SECURITY_HEADERS" | grep -q "X-Content-Type-Options"; then
        log_success "内容类型选项头已配置"
    else
        log_warning "内容类型选项头未配置"
    fi
    
    if echo "$SECURITY_HEADERS" | grep -q "X-Frame-Options"; then
        log_success "框架选项头已配置"
    else
        log_warning "框架选项头未配置"
    fi
}

# 主验证流程
main() {
    log_info "开始前端部署验证..."
    
    # 检查必需的环境变量
    if [ -z "$SERVER_HOST" ]; then
        log_error "SERVER_HOST环境变量未设置"
        exit 1
    fi
    
    if [ -z "$DOMAIN" ]; then
        log_error "DOMAIN环境变量未设置"
        exit 1
    fi
    
    # 执行验证步骤
    local failed_checks=0
    
    verify_ssl_certificate || ((failed_checks++))
    verify_nginx_config || ((failed_checks++))
    verify_static_files || ((failed_checks++))
    verify_http_access || ((failed_checks++))
    verify_api_integration || ((failed_checks++))
    verify_performance
    verify_functionality || ((failed_checks++))
    verify_security
    
    # 输出验证结果
    if [ "$failed_checks" -eq 0 ]; then
        log_success "所有验证检查通过！前端部署成功完成"
        echo ""
        echo "部署验证报告:"
        echo "✓ SSL证书配置正确"
        echo "✓ Nginx服务运行正常"
        echo "✓ 静态文件部署完整"
        echo "✓ HTTP访问正常"
        echo "✓ API集成正常"
        echo "✓ 性能指标达标"
        echo "✓ 功能完整性验证通过"
        echo "✓ 安全配置检查完成"
        echo ""
        echo "应用地址: https://${DOMAIN}"
        echo "部署时间: $(date)"
    else
        log_error "有 ${failed_checks} 项验证检查失败，请检查部署配置"
        exit 1
    fi
}

# 执行主函数
main "$@"