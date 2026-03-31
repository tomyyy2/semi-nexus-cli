@echo off
REM 质量检查完整流程脚本（Windows 版本）
REM 使用方法：scripts\quality-check.bat

echo ======================================
echo   SemiNexus CLI 质量检查
echo ======================================
echo.

set ERRORS=0
set WARNINGS=0

echo --------------------------------------
echo 步骤 1/6: 清理旧的构建文件
echo --------------------------------------
if exist dist rmdir /s /q dist
echo ✅ 清理完成
echo.

echo --------------------------------------
echo 步骤 2/6: 安装依赖
echo --------------------------------------
call npm ci
if errorlevel 1 (
    echo ❌ 依赖安装失败
    set /a ERRORS+=1
    goto summary
)
echo ✅ 依赖安装完成
echo.

echo --------------------------------------
echo 步骤 3/6: ESLint 代码风格检查
echo --------------------------------------
call npm run lint
if errorlevel 1 (
    echo ❌ ESLint 检查失败
    set /a ERRORS+=1
) else (
    echo ✅ ESLint 检查通过
)
echo.

echo --------------------------------------
echo 步骤 4/6: TypeScript 编译检查
echo --------------------------------------
call npm run typecheck
if errorlevel 1 (
    echo ❌ TypeScript 编译失败
    set /a ERRORS+=1
) else (
    echo ✅ TypeScript 编译通过
)
echo.

echo --------------------------------------
echo 步骤 5/6: 单元测试
echo --------------------------------------
call npm run test:unit
if errorlevel 1 (
    echo ❌ 单元测试失败
    set /a ERRORS+=1
) else (
    echo ✅ 单元测试通过
)
echo.

echo --------------------------------------
echo 步骤 6/6: 构建验证
echo --------------------------------------
call npm run build
if errorlevel 1 (
    echo ❌ 构建失败
    set /a ERRORS+=1
) else (
    echo ✅ 构建成功
)
echo.

:summary
echo ======================================
echo   质量检查总结
echo ======================================
echo.

if %ERRORS% equ 0 (
    echo ✅ 所有质量检查通过！🎉
    echo.
    echo 下一步建议：
    echo   • 运行 'git commit' 提交代码
    echo   • 运行 'npm run test:e2e' 执行 E2E 测试
    echo   • 运行 'npm run build:bin' 打包发布
    exit /b 0
) else (
    echo ❌ 发现 %ERRORS% 个错误
    echo.
    echo 请修复以上错误后重新运行检查。
    echo.
    echo 常见修复方法：
    echo   • ESLint 错误：运行 'npm run lint -- --fix' 自动修复
    echo   • TypeScript 错误：检查类型定义和类型断言
    echo   • 测试失败：查看测试日志定位问题
    exit /b 1
)
