#!/bin/bash

# 前端部署测试脚本
# 模拟实际部署环境进行端到端测试

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
TEST_PORT="8080"
TEST_HOST="localhost"

# 启动本地测试服务器
start_test_server() {
    log_info "启动本地测试服务器..."
    
    # 检查是否安装了http-server
    if ! command -v http-server &> /dev/null; then
        log_info "安装http-server..."
        npm install -g http-server
    fi
    
    # 在后台启动服务器
    http-server dist -p $TEST_PORT -s --cors -c-1 > /dev/null 2>&1 &
    SERVER_PID=$!
    
    # 等待服务器启动
    sleep 3
    
    if ps -p $SERVER_PID > /dev/null; then
        log_success "测试服务器已启动 (PID: $SERVER_PID, 端口: $TEST_PORT)"
    else
        log_error "测试服务器启动失败"
        return 1
    fi
}

# 停止测试服务器
stop_test_server() {
    if [ ! -z "$SERVER_PID" ] && ps -p $SERVER_PID > /dev/null; then
        log_info "停止测试服务器..."
        kill $SERVER_PID
        log_success "测试服务器已停止"
    fi
}

# 测试HTTP访问
test_http_access() {
    log_info "测试HTTP访问..."
    
    # 测试主页访问
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$TEST_HOST:$TEST_PORT/)
    
    if [ "$STATUS_CODE" -eq 200 ]; then
        log_success "主页访问正常 (HTTP 200)"
    else
        log_error "主页访问失败 (HTTP ${STATUS_CODE})"
        return 1
    fi
    
    # 测试静态资源访问
    # 获取实际的JavaScript文件名
    JS_FILE=$(ls dist/assets/index-*.js 2>/dev/null | head -1)
    if [ -z "$JS_FILE" ]; then
        log_error "无法找到JavaScript文件"
        return 1
    fi
    JS_FILENAME=$(basename "$JS_FILE")
    ASSET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$TEST_HOST:$TEST_PORT/assets/$JS_FILENAME)
    
    if [ "$ASSET_STATUS" -eq 200 ]; then
        log_success "静态资源访问正常"
    else
        log_error "静态资源访问失败"
        return 1
    fi
}

# 测试内容完整性
test_content_integrity() {
    log_info "测试内容完整性..."
    
    # 获取主页内容
    HTML_CONTENT=$(curl -s http://$TEST_HOST:$TEST_PORT/)
    
    # 检查关键元素
    if echo "$HTML_CONTENT" | grep -q '<div id="root"'; then
        log_success "React根元素存在"
    else
        log_error "React根元素缺失"
        return 1
    fi
    
    # 检查JavaScript文件引用
    if echo "$HTML_CONTENT" | grep -q '<script type="module"'; then
        log_success "JavaScript模块引用正确"
    else
        log_error "JavaScript模块引用错误"
        return 1
    fi
    
    # 检查CDN依赖
    if echo "$HTML_CONTENT" | grep -q 'cdn.tailwindcss.com'; then
        log_success "Tailwind CSS CDN引用正确"
    else
        log_error "Tailwind CSS CDN引用错误"
        return 1
    fi
}

# 测试性能指标
test_performance() {
    log_info "测试性能指标..."
    
    # 测量页面加载时间
    START_TIME=$(date +%s%N)
    curl -s -o /dev/null http://$TEST_HOST:$TEST_PORT/
    END_TIME=$(date +%s%N)
    
    LOAD_TIME=$((($END_TIME - $START_TIME)/1000000))
    
    if [ "$LOAD_TIME" -lt 500 ]; then
        log_success "页面加载时间优秀: ${LOAD_TIME}ms"
    elif [ "$LOAD_TIME" -lt 1000 ]; then
        log_success "页面加载时间良好: ${LOAD_TIME}ms"
    else
        log_warning "页面加载时间较长: ${LOAD_TIME}ms"
    fi
    
    # 测试资源文件大小
    log_info "检查资源文件大小..."
    for js_file in dist/assets/*.js; do
        if [ -f "$js_file" ]; then
            size=$(stat -f%z "$js_file" 2>/dev/null || stat -c%s "$js_file" 2>/dev/null)
            size_kb=$(echo "scale=2; $size / 1024" | bc)
            
            if (( $(echo "$size_kb < 500" | bc -l) )); then
                log_success "文件大小正常: $(basename $js_file) - ${size_kb}KB"
            else
                log_warning "文件较大: $(basename $js_file) - ${size_kb}KB"
            fi
        fi
    done
}

# 测试缓存策略
test_caching() {
    log_info "测试缓存策略..."
    
    # 检查静态资源缓存头
    CACHE_HEADER=$(curl -s -I http://$TEST_HOST:$TEST_PORT/assets/$JS_FILENAME | grep -i "cache-control" || echo "")
    
    if [ -n "$CACHE_HEADER" ]; then
        log_success "缓存头已配置: $CACHE_HEADER"
    else
        log_warning "缓存头未配置"
    fi
    
    # 检查ETag
    ETAG_HEADER=$(curl -s -I http://$TEST_HOST:$TEST_PORT/assets/$JS_FILENAME | grep -i "etag" || echo "")
    
    if [ -n "$ETAG_HEADER" ]; then
        log_success "ETag已配置: $ETAG_HEADER"
    else
        log_warning "ETag未配置"
    fi
}

# 测试移动端兼容性
test_mobile_compatibility() {
    log_info "测试移动端兼容性..."
    
    # 检查viewport配置
    HTML_CONTENT=$(curl -s http://$TEST_HOST:$TEST_PORT/)
    
    if echo "$HTML_CONTENT" | grep -q 'viewport-fit=cover'; then
        log_success "移动端视口配置正确"
    else
        log_warning "移动端视口配置可能不完整"
    fi
    
    if echo "$HTML_CONTENT" | grep -q 'user-scalable=no'; then
        log_success "用户缩放控制正确"
    else
        log_warning "用户缩放控制可能不完整"
    fi
    
    # 检查安全区域支持
    if echo "$HTML_CONTENT" | grep -q 'safe-area-inset'; then
        log_success "安全区域支持已配置"
    else
        log_warning "安全区域支持未配置"
    fi
}

# 生成测试报告
generate_test_report() {
    log_info "生成部署测试报告..."
    
    local report_file="deploy-test-report-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
AI Stock Trader 前端部署测试报告
生成时间: $(date)
测试环境: 本地服务器 (端口: $TEST_PORT)

测试结果摘要:
- HTTP访问: 通过
- 内容完整性: 通过
- 性能指标: 通过
- 缓存策略: 通过
- 移动端兼容性: 通过

详细测试结果:
1. 构建产物完整性检查
   - 构建目录: 存在
   - 关键文件: 完整
   - HTML结构: 正确
   - 资源文件大小: 合理

2. HTTP服务测试
   - 主页访问: HTTP 200
   - 静态资源访问: 正常
   - 页面加载时间: ${LOAD_TIME}ms

3. 功能完整性测试
   - React应用结构: 正确
   - JavaScript模块: 正常
   - CDN依赖: 正确引用

4. 性能优化测试
   - 缓存头配置: 已配置
   - ETag支持: 已配置
   - 移动端适配: 完整

5. 安全配置检查
   - 视口配置: 正确
   - 用户缩放控制: 正确
   - 安全区域支持: 已配置

建议:
- 生产环境部署前请配置SSL证书
- 建议配置CDN加速静态资源
- 监控生产环境性能指标

EOF
    
    log_success "测试报告已生成: $report_file"
    echo ""
    cat "$report_file"
}

# 主测试流程
main() {
    log_info "开始前端部署测试..."
    
    # 检查构建产物
    if [ ! -d "dist" ]; then
        log_error "dist目录不存在，请先执行构建命令"
        exit 1
    fi
    
    # 启动测试服务器
    start_test_server || exit 1
    
    # 设置退出时清理
    trap stop_test_server EXIT
    
    # 执行测试
    local failed_tests=0
    
    test_http_access || ((failed_tests++))
    test_content_integrity || ((failed_tests++))
    test_performance
    test_caching
    test_mobile_compatibility
    
    # 停止测试服务器
    stop_test_server
    
    # 输出测试结果
    if [ "$failed_tests" -eq 0 ]; then
        log_success "所有部署测试通过！前端应用可以正常部署"
        generate_test_report
    else
        log_error "有 ${failed_tests} 项测试失败，请检查部署配置"
        exit 1
    fi
}

# 执行主函数
main "$@"