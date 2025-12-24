#!/bin/bash

# AI Stock Trader 前端交互式部署脚本

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

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "=== AI Stock Trader 前端部署 ==="
    echo ""
    echo "部署目标: 阿里云服务器"
    echo "服务器IP: 47.98.44.27"
    echo "应用类型: React单页应用"
    echo "构建产物: 792K (已优化)"
    echo ""
    echo "部署将执行以下操作:"
    echo "1. 配置服务器Nginx环境"
    echo "2. 上传前端构建产物"
    echo "3. 配置虚拟主机"
    echo "4. 测试访问功能"
    echo ""
}

# 配置SSH连接
configure_ssh() {
    echo ""
    echo "=== SSH连接配置 ==="
    echo ""
    
    # 服务器信息
    SERVER_HOST="47.98.44.27"
    DEPLOY_USER="root"
    
    echo "服务器信息:"
    echo "- IP地址: $SERVER_HOST"
    echo "- 用户名: $DEPLOY_USER"
    echo ""
    
    # 检查是否有可用的密钥文件
    local available_keys=()
    if [ -f "github-actions-key" ]; then
        available_keys+=("github-actions-key")
    fi
    if [ -f "github-actions-new" ]; then
        available_keys+=("github-actions-new")
    fi
    if [ -f "github-actions-pem" ]; then
        available_keys+=("github-actions-pem")
    fi
    
    echo "请选择认证方式:"
    echo "1. 使用SSH密码认证"
    echo "2. 使用SSH密钥文件"
    echo "3. 使用GitHub Actions配置的密钥"
    
    if [ ${#available_keys[@]} -gt 0 ]; then
        echo "4. 使用现有密钥文件 (推荐)"
        echo "   可用密钥: ${available_keys[*]}"
    fi
    echo ""
    
    while true; do
        read -p "请选择认证方式 (1-4): " auth_choice
        
        case $auth_choice in
            1)
                read -s -p "请输入SSH密码: " SSH_PASSWORD
                echo ""
                export SERVER_HOST DEPLOY_USER SSH_PASSWORD
                AUTH_METHOD="password"
                break
                ;;
            2)
                read -p "请输入SSH密钥文件路径: " SSH_KEY_FILE
                if [ -f "$SSH_KEY_FILE" ]; then
                    export SERVER_HOST DEPLOY_USER SSH_KEY_FILE
                    AUTH_METHOD="key"
                    break
                else
                    log_error "SSH密钥文件不存在: $SSH_KEY_FILE"
                fi
                ;;
            3)
                # 检查GitHub Actions配置
                if [ -f ".github/workflows/deploy.yml" ]; then
                    log_info "使用GitHub Actions配置"
                    export SERVER_HOST DEPLOY_USER
                    AUTH_METHOD="github"
                    break
                else
                    log_error "未找到GitHub Actions配置"
                fi
                ;;
            4)
                if [ ${#available_keys[@]} -gt 0 ]; then
                    echo ""
                    echo "请选择密钥文件:"
                    for i in "${!available_keys[@]}"; do
                        echo "$((i+1)). ${available_keys[$i]}"
                    done
                    read -p "请选择 (1-${#available_keys[@]}): " key_choice
                    
                    if [[ $key_choice =~ ^[0-9]+$ ]] && [ $key_choice -ge 1 ] && [ $key_choice -le ${#available_keys[@]} ]; then
                        SSH_KEY_FILE="${available_keys[$((key_choice-1))]}"
                        export SERVER_HOST DEPLOY_USER SSH_KEY_FILE
                        AUTH_METHOD="key"
                        log_info "使用密钥文件: $SSH_KEY_FILE"
                        break
                    else
                        log_error "无效的选择"
                    fi
                else
                    log_error "没有可用的密钥文件"
                fi
                ;;
            *)
                log_error "无效的选择，请重新输入"
                ;;
        esac
    done
    
    log_success "SSH配置完成"
}

# 测试服务器连接
test_connection() {
    log_info "测试服务器连接..."
    
    case $AUTH_METHOD in
        "password")
            if command -v sshpass >/dev/null 2>&1; then
                if sshpass -p "$SSH_PASSWORD" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $DEPLOY_USER@$SERVER_HOST "echo '连接测试成功'" 2>/dev/null; then
                    log_success "服务器连接测试成功"
                    return 0
                fi
            else
                log_warning "sshpass未安装，尝试手动连接测试"
            fi
            ;;
        "key")
            if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$SSH_KEY_FILE" $DEPLOY_USER@$SERVER_HOST "echo '连接测试成功'" 2>/dev/null; then
                log_success "服务器连接测试成功"
                return 0
            fi
            ;;
        "github")
            # 尝试使用默认密钥路径
            if [ -f "$HOME/.ssh/id_rsa" ]; then
                if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$HOME/.ssh/id_rsa" $DEPLOY_USER@$SERVER_HOST "echo '连接测试成功'" 2>/dev/null; then
                    log_success "服务器连接测试成功"
                    SSH_KEY_FILE="$HOME/.ssh/id_rsa"
                    export SSH_KEY_FILE
                    return 0
                fi
            fi
            ;;
    esac
    
    log_error "服务器连接测试失败"
    echo ""
    echo "连接失败的可能原因:"
    echo "1. 服务器IP地址错误"
    echo "2. SSH端口未开放(22)"
    echo "3. 认证信息错误"
    echo "4. 服务器防火墙限制"
    echo ""
    echo "请检查以上配置后重试"
    return 1
}

# 检查服务器环境
check_environment() {
    log_info "检查服务器环境..."
    
    echo ""
    echo "=== 服务器环境检查 ==="
    echo ""
    
    case $AUTH_METHOD in
        "password")
            if command -v sshpass >/dev/null 2>&1; then
                sshpass -p "$SSH_PASSWORD" ssh $DEPLOY_USER@$SERVER_HOST << 'EOF'
                    echo "操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 2>/dev/null || echo "未知")"
                    echo "内核版本: $(uname -r)"
                    echo "内存: $(free -h | grep Mem | awk '{print $2}' 2>/dev/null || echo "未知")"
                    echo "磁盘空间: $(df -h / | tail -1 | awk '{print $4}' 2>/dev/null || echo "未知")"
                    echo ""
                    
                    # 检查必要服务
                    echo "必要服务检查:"
                    if command -v nginx >/dev/null 2>&1; then
                        echo "✓ Nginx: $(nginx -v 2>&1 | head -1)"
                    else
                        echo "✗ Nginx: 未安装"
                    fi
                    
                    if command -v docker >/dev/null 2>&1; then
                        echo "✓ Docker: $(docker --version)"
                    else
                        echo "✗ Docker: 未安装"
                    fi
                    
                    # 检查端口占用
                    echo ""
                    echo "端口检查:"
                    if netstat -tuln | grep -q ":80 "; then
                        echo "✓ 80端口: 已被占用"
                    else
                        echo "✗ 80端口: 空闲"
                    fi
                    
                    if netstat -tuln | grep -q ":443 "; then
                        echo "✓ 443端口: 已被占用"
                    else
                        echo "✗ 443端口: 空闲"
                    fi
EOF
            fi
            ;;
        "key"|"github")
            ssh -i "${SSH_KEY_FILE:-$HOME/.ssh/id_rsa}" $DEPLOY_USER@$SERVER_HOST << 'EOF'
                    echo "操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 2>/dev/null || echo "未知")"
                    echo "内核版本: $(uname -r)"
                    echo "内存: $(free -h | grep Mem | awk '{print $2}' 2>/dev/null || echo "未知")"
                    echo "磁盘空间: $(df -h / | tail -1 | awk '{print $4}' 2>/dev/null || echo "未知")"
                    echo ""
                    
                    # 检查必要服务
                    echo "必要服务检查:"
                    if command -v nginx >/dev/null 2>&1; then
                        echo "✓ Nginx: $(nginx -v 2>&1 | head -1)"
                    else
                        echo "✗ Nginx: 未安装"
                    fi
                    
                    if command -v docker >/dev/null 2>&1; then
                        echo "✓ Docker: $(docker --version)"
                    else
                        echo "✗ Docker: 未安装"
                    fi
                    
                    # 检查端口占用
                    echo ""
                    echo "端口检查:"
                    if netstat -tuln | grep -q ":80 "; then
                        echo "✓ 80端口: 已被占用"
                    else
                        echo "✗ 80端口: 空闲"
                    fi
                    
                    if netstat -tuln | grep -q ":443 "; then
                        echo "✓ 443端口: 已被占用"
                    else
                        echo "✗ 443端口: 空闲"
                    fi
EOF
            ;;
    esac
    
    echo ""
    log_success "环境检查完成"
}

# 执行部署
execute_deployment() {
    log_info "开始执行前端部署..."
    
    # 确认部署
    echo ""
    read -p "确认开始部署？(y/N): " confirm_deploy
    if [[ ! $confirm_deploy =~ ^[Yy]$ ]]; then
        log_info "部署已取消"
        exit 0
    fi
    
    # 使用现有的部署脚本
    if [ -f "deploy-frontend.sh" ]; then
        log_info "使用自动化部署脚本..."
        
        # 根据认证方式执行部署
        case $AUTH_METHOD in
            "password")
                if command -v sshpass >/dev/null 2>&1; then
                    export SSHPASS="$SSH_PASSWORD"
                    ./deploy-frontend.sh production "$SERVER_HOST" "$DEPLOY_USER"
                else
                    log_error "请先安装sshpass: brew install hudochenkov/sshpass/sshpass"
                    return 1
                fi
                ;;
            "key"|"github")
                ./deploy-frontend.sh production "$SERVER_HOST" "$DEPLOY_USER"
                ;;
        esac
    else
        log_error "部署脚本不存在"
        return 1
    fi
}

# 部署后验证
verify_deployment() {
    log_info "执行部署后验证..."
    
    echo ""
    echo "=== 部署验证 ==="
    echo ""
    
    # 测试HTTP访问
    log_info "测试HTTP访问..."
    if curl -s -f http://$SERVER_HOST > /dev/null 2>&1; then
        log_success "HTTP访问正常"
    else
        log_error "HTTP访问失败"
        return 1
    fi
    
    # 测试应用功能
    log_info "测试应用功能..."
    RESPONSE=$(curl -s http://$SERVER_HOST)
    if echo "$RESPONSE" | grep -q "AI 股市操盘手"; then
        log_success "应用标题正确"
    else
        log_warning "应用标题可能不正确"
    fi
    
    if echo "$RESPONSE" | grep -q "id=\"root\""; then
        log_success "React应用结构正常"
    else
        log_error "React应用结构异常"
        return 1
    fi
    
    log_success "部署验证完成"
}

# 显示部署结果
show_results() {
    echo ""
    echo "=== 部署完成 ==="
    echo ""
    echo "✅ 前端部署成功完成"
    echo ""
    echo "📱 应用访问信息:"
    echo "   地址: http://$SERVER_HOST"
    echo "   IP: $SERVER_HOST"
    echo "   时间: $(date)"
    echo ""
    echo "🔧 下一步操作:"
    echo "   1. 在浏览器中访问 http://$SERVER_HOST"
    echo "   2. 测试所有页面功能"
    echo "   3. 检查后端API集成"
    echo "   4. 邀请测试人员进行测试"
    echo ""
    echo "📋 维护说明:"
    echo "   - 应用文件位置: /var/www/ai-stock-trader"
    echo "   - Nginx配置: /etc/nginx/sites-available/ai-stock-trader"
    echo "   - 日志文件: /var/log/nginx/ai-stock-trader.log"
    echo ""
}

# 主部署流程
main() {
    echo ""
    echo "🚀 AI Stock Trader 前端部署工具"
    echo ""
    
    # 显示部署信息
    show_deployment_info
    
    # 配置SSH连接
    configure_ssh
    
    # 测试连接
    test_connection || exit 1
    
    # 检查环境
    check_environment
    
    # 执行部署
    execute_deployment || exit 1
    
    # 验证部署
    verify_deployment || exit 1
    
    # 显示结果
    show_results
    
    log_success "前端部署流程全部完成！"
}

# 执行主函数
main "$@"