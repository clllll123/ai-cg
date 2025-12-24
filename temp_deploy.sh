#!/bin/bash

# 前端部署执行脚本
# 使用GitHub Actions配置的SSH密钥进行部署

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
SERVER_HOST="47.98.44.27"
DEPLOY_USER="root"

# 检查SSH密钥配置
check_ssh_config() {
    log_info "检查SSH密钥配置..."
    
    # 检查是否有GitHub Actions的SSH密钥配置
    if [ -f ".github/workflows/deploy.yml" ]; then
        log_success "找到GitHub Actions部署配置"
        
        # 从GitHub Actions配置中提取SSH密钥信息
        SSH_CONFIG=$(grep -A5 "Setup SSH" .github/workflows/deploy.yml | grep "SSH_PRIVATE_KEY" || echo "")
        if [ -n "$SSH_CONFIG" ]; then
            log_info "检测到SSH密钥配置，需要手动输入SSH密钥"
            return 1
        else
            log_warning "未找到SSH密钥配置，需要手动配置"
            return 1
        fi
    else
        log_error "未找到GitHub Actions部署配置"
        return 1
    fi
}

# 手动配置SSH连接
setup_ssh_manual() {
    log_info "请手动配置SSH连接信息..."
    
    echo ""
    echo "=== SSH连接配置 ==="
    echo "服务器IP: $SERVER_HOST"
    echo "用户名: $DEPLOY_USER"
    echo ""
    echo "请选择认证方式:"
    echo "1. 使用密码认证"
    echo "2. 使用SSH密钥文件"
    echo "3. 退出"
    echo ""
    
    read -p "请选择 (1-3): " auth_choice
    
    case $auth_choice in
        1)
            read -s -p "请输入SSH密码: " SSH_PASSWORD
            echo ""
            export SSH_PASSWORD
            AUTH_METHOD="password"
            ;;
        2)
            read -p "请输入SSH密钥文件路径: " SSH_KEY_FILE
            if [ -f "$SSH_KEY_FILE" ]; then
                export SSH_KEY_FILE
                AUTH_METHOD="key"
            else
                log_error "SSH密钥文件不存在: $SSH_KEY_FILE"
                return 1
            fi
            ;;
        3)
            log_info "退出部署流程"
            exit 0
            ;;
        *)
            log_error "无效的选择"
            return 1
            ;;
    esac
    
    log_success "SSH配置完成"
}

# 测试服务器连接
test_server_connection() {
    log_info "测试服务器连接..."
    
    case $AUTH_METHOD in
        "password")
            if sshpass -p "$SSH_PASSWORD" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $DEPLOY_USER@$SERVER_HOST "echo '连接测试成功'"; then
                log_success "服务器连接测试成功"
                return 0
            else
                log_error "服务器连接测试失败"
                return 1
            fi
            ;;
        "key")
            if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$SSH_KEY_FILE" $DEPLOY_USER@$SERVER_HOST "echo '连接测试成功'"; then
                log_success "服务器连接测试成功"
                return 0
            else
                log_error "服务器连接测试失败"
                return 1
            fi
            ;;
        *)
            log_error "未配置认证方式"
            return 1
            ;;
    esac
}

# 检查服务器环境
check_server_environment() {
    log_info "检查服务器环境..."
    
    case $AUTH_METHOD in
        "password")
            sshpass -p "$SSH_PASSWORD" ssh $DEPLOY_USER@$SERVER_HOST << 'EOF'
                echo "=== 服务器环境信息 ==="
                echo "操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)"
                echo "内核版本: $(uname -r)"
                echo "内存信息: $(free -h | grep Mem | awk '{print $2}')"
                echo "磁盘空间: $(df -h / | tail -1 | awk '{print $4}')"
                echo ""
                echo "=== 已安装服务 ==="
                if command -v nginx >/dev/null 2>&1; then
                    echo "✓ Nginx 已安装"
                    nginx -v
                else
                    echo "✗ Nginx 未安装"
                fi
                
                if command -v docker >/dev/null 2>&1; then
                    echo "✓ Docker 已安装"
                    docker --version
                else
                    echo "✗ Docker 未安装"
                fi
                
                if command -v node >/dev/null 2>&1; then
                    echo "✓ Node.js 已安装"
                    node --version
                else
                    echo "✗ Node.js 未安装"
                fi
EOF
            ;;
        "key")
            ssh -i "$SSH_KEY_FILE" $DEPLOY_USER@$SERVER_HOST << 'EOF'
                echo "=== 服务器环境信息 ==="
                echo "操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)"
                echo "内核版本: $(uname -r)"
                echo "内存信息: $(free -h | grep Mem | awk '{print $2}')"
                echo "磁盘空间: $(df -h / | tail -1 | awk '{print $4}')"
                echo ""
                echo "=== 已安装服务 ==="
                if command -v nginx >/dev/null 2>&1; then
                    echo "✓ Nginx 已安装"
                    nginx -v
                else
                    echo "✗ Nginx 未安装"
                fi
                
                if command -v docker >/dev/null 2>&1; then
                    echo "✓ Docker 已安装"
                    docker --version
                else
                    echo "✗ Docker 未安装"
                fi
                
                if command -v node >/dev/null 2>&1; then
                    echo "✓ Node.js 已安装"
                    node --version
                else
                    echo "✗ Node.js 未安装"
                fi
EOF
            ;;
    esac
    
    log_success "服务器环境检查完成"
}

# 执行部署
execute_deployment() {
    log_info "开始执行前端部署..."
    
    # 使用现有的部署脚本
    if [ -f "deploy-frontend.sh" ]; then
        log_info "使用现有的部署脚本..."
        
        # 设置环境变量
        export SERVER_HOST="47.98.44.27"
        export DEPLOY_USER="root"
        
        # 根据认证方式执行部署
        case $AUTH_METHOD in
            "password")
                # 安装sshpass（如果需要）
                if ! command -v sshpass &> /dev/null; then
                    log_info "安装sshpass..."
                    if command -v brew &> /dev/null; then
                        brew install hudochenkov/sshpass/sshpass
                    else
                        log_error "请手动安装sshpass: brew install hudochenkov/sshpass/sshpass"
                        return 1
                    fi
                fi
                
                # 设置密码环境变量
                export SSHPASS="$SSH_PASSWORD"
                
                # 执行部署
                ./deploy-frontend.sh "$SERVER_HOST" "password"
                ;;
            "key")
                # 使用密钥文件部署
                ./deploy-frontend.sh "$SERVER_HOST" "key" "$SSH_KEY_FILE"
                ;;
        esac
    else
        log_error "部署脚本不存在"
        return 1
    fi
}

# 主部署流程
main() {
    log_info "开始AI Stock Trader前端部署流程..."
    
    # 检查SSH配置
    check_ssh_config || setup_ssh_manual
    
    # 测试服务器连接
    test_server_connection || exit 1
    
    # 检查服务器环境
    check_server_environment
    
    # 执行部署
    execute_deployment
    
    log_success "前端部署流程完成！"
    echo ""
    echo "=== 部署完成信息 ==="
    echo "应用地址: http://$SERVER_HOST"
    echo "服务器IP: $SERVER_HOST"
    echo "部署时间: $(date)"
    echo ""
    echo "下一步操作:"
    echo "1. 在浏览器中访问 http://$SERVER_HOST 测试应用"
    echo "2. 检查后端API是否正常运行"
    echo "3. 进行功能完整性测试"
}

# 执行主函数
main "$@"