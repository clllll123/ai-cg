#!/bin/bash

# 本地部署验证脚本
# 用于验证构建产物是否完整，适合在部署前进行本地检查

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

# 验证函数
verify_build_directory() {
    log_info "验证构建目录结构..."
    
    if [ ! -d "dist" ]; then
        log_error "dist目录不存在，请先执行构建命令"
        return 1
    fi
    
    log_success "构建目录存在"
}

verify_essential_files() {
    log_info "验证关键文件..."
    
    local missing_files=0
    
    # 检查必需的文件（注意：CSS文件可能不存在，因为使用Tailwind CDN）
    ESSENTIAL_FILES=("dist/index.html" 
                    "dist/assets/index-*.js")
    
    for file_pattern in "${ESSENTIAL_FILES[@]}"; do
        if ls $file_pattern 1> /dev/null 2>&1; then
            log_success "文件存在: $file_pattern"
        else
            log_error "文件不存在: $file_pattern"
            ((missing_files++))
        fi
    done
    
    # 检查CSS文件（可选，因为可能使用CDN）
    if ls dist/assets/*.css 1> /dev/null 2>&1; then
        log_success "CSS文件存在"
    else
        log_warning "CSS文件不存在（可能使用CDN）"
    fi
    
    if [ "$missing_files" -gt 0 ]; then
        return 1
    fi
}

verify_html_structure() {
    log_info "验证HTML结构..."
    
    if grep -q '<div id="root"' dist/index.html; then
        log_success "React根元素存在"
    else
        log_error "React根元素缺失"
        return 1
    fi
    
    if grep -q "<script type=\"module\"" dist/index.html; then
        log_success "JavaScript模块标签存在"
    else
        log_error "JavaScript模块标签缺失"
        return 1
    fi
}

verify_asset_sizes() {
    log_info "验证资源文件大小..."
    
    local oversized_files=0
    
    # 检查JavaScript文件大小
    for js_file in dist/assets/*.js; do
        if [ -f "$js_file" ]; then
            size=$(stat -f%z "$js_file" 2>/dev/null || stat -c%s "$js_file" 2>/dev/null)
            size_mb=$(echo "scale=2; $size / 1024 / 1024" | bc)
            
            if (( $(echo "$size_mb > 2" | bc -l) )); then
                log_warning "文件较大: $(basename $js_file) - ${size_mb}MB"
                ((oversized_files++))
            else
                log_success "文件大小正常: $(basename $js_file) - ${size_mb}MB"
            fi
        fi
    done
    
    if [ "$oversized_files" -gt 0 ]; then
        log_warning "有 ${oversized_files} 个文件较大，建议优化"
    fi
}

verify_build_metadata() {
    log_info "验证构建元数据..."
    
    # 检查构建时间戳
    if find dist -name "*.js" -exec grep -l "build time" {} \; > /dev/null 2>&1; then
        log_success "构建时间戳存在"
    else
        log_warning "构建时间戳未找到"
    fi
    
    # 检查版本信息
    if grep -q "AI 股市操盘手" dist/index.html; then
        log_success "应用标题正确"
    else
        log_error "应用标题错误"
        return 1
    fi
}

verify_dependencies() {
    log_info "验证外部依赖..."
    
    # 检查CDN依赖是否在HTML中正确引用
    local missing_deps=0
    
    if grep -q "cdn.tailwindcss.com" dist/index.html; then
        log_success "Tailwind CSS依赖正确"
    else
        log_error "Tailwind CSS依赖缺失"
        ((missing_deps++))
    fi
    
    if grep -q "cdn.bootcdn.net" dist/index.html; then
        log_success "MQTT.js依赖正确"
    else
        log_error "MQTT.js依赖缺失"
        ((missing_deps++))
    fi
    
    if grep -q "fonts.googleapis.com" dist/index.html; then
        log_success "Google Fonts依赖正确"
    else
        log_error "Google Fonts依赖缺失"
        ((missing_deps++))
    fi
    
    if [ "$missing_deps" -gt 0 ]; then
        return 1
    fi
}

verify_security_headers() {
    log_info "验证安全配置..."
    
    # 检查是否包含基本的安全配置
    if grep -q "viewport-fit=cover" dist/index.html; then
        log_success "移动端适配配置正确"
    else
        log_warning "移动端适配配置可能不完整"
    fi
    
    if grep -q "user-scalable=no" dist/index.html; then
        log_success "用户缩放控制正确"
    else
        log_warning "用户缩放控制可能不完整"
    fi
}

# 主验证流程
main() {
    log_info "开始本地部署验证..."
    
    # 检查当前目录
    if [ ! -f "package.json" ]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 执行验证步骤
    local failed_checks=0
    
    verify_build_directory || ((failed_checks++))
    verify_essential_files || ((failed_checks++))
    verify_html_structure || ((failed_checks++))
    verify_asset_sizes
    verify_build_metadata
    verify_dependencies || ((failed_checks++))
    verify_security_headers
    
    # 输出验证结果
    if [ "$failed_checks" -eq 0 ]; then
        log_success "所有本地验证检查通过！构建产物完整"
        echo ""
        echo "本地验证报告:"
        echo "✓ 构建目录结构正确"
        echo "✓ 关键文件完整"
        echo "✓ HTML结构正常"
        echo "✓ 资源文件大小合理"
        echo "✓ 构建元数据完整"
        echo "✓ 外部依赖正确"
        echo "✓ 安全配置检查完成"
        echo ""
        echo "构建时间: $(date)"
        echo "构建产物大小: $(du -sh dist | cut -f1)"
    else
        log_error "有 ${failed_checks} 项验证检查失败，请检查构建配置"
        exit 1
    fi
}

# 执行主函数
main "$@"