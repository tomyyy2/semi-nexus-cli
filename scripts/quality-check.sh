#!/bin/bash

# 质量检查完整流程脚本
# 使用方法：./scripts/quality-check.sh

set -e  # 遇到错误立即退出

echo "======================================"
echo "  SemiNexus CLI 质量检查"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 步骤计数
TOTAL_STEPS=6
CURRENT_STEP=0

# 错误计数器
ERRORS=0
WARNINGS=0

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    ERRORS=$((ERRORS + 1))
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    echo ""
    echo "--------------------------------------"
    echo "步骤 $CURRENT_STEP/$TOTAL_STEPS: $1"
    echo "--------------------------------------"
}

# 开始检查
step "清理旧的构建文件"
rm -rf dist/
success "清理完成"

step "安装依赖"
npm ci
success "依赖安装完成"

step "ESLint 代码风格检查"
if npm run lint; then
    success "ESLint 检查通过"
else
    error "ESLint 检查失败"
fi

step "TypeScript 编译检查"
if npm run typecheck; then
    success "TypeScript 编译通过"
else
    error "TypeScript 编译失败"
fi

step "单元测试"
if npm run test:unit; then
    success "单元测试通过"
else
    error "单元测试失败"
fi

step "构建验证"
if npm run build; then
    success "构建成功"
else
    error "构建失败"
fi

# 总结
echo ""
echo "======================================"
echo "  质量检查总结"
echo "======================================"
echo ""

if [ $ERRORS -eq 0 ]; then
    success "所有质量检查通过！🎉"
    echo ""
    echo "下一步建议："
    echo "  • 运行 'git commit' 提交代码"
    echo "  • 运行 'npm run test:e2e' 执行 E2E 测试"
    echo "  • 运行 'npm run build:bin' 打包发布"
    exit 0
else
    error "发现 $ERRORS 个错误，$WARNINGS 个警告"
    echo ""
    echo "请修复以上错误后重新运行检查。"
    echo ""
    echo "常见修复方法："
    echo "  • ESLint 错误：运行 'npm run lint -- --fix' 自动修复"
    echo "  • TypeScript 错误：检查类型定义和类型断言"
    echo "  • 测试失败：查看测试日志定位问题"
    exit 1
fi
