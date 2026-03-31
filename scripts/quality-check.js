#!/usr/bin/env node

/**
 * 质量检查完整流程脚本
 * 使用方法：npm run quality 或 node scripts/quality-check.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色定义
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function step(message) {
  log('', 'reset');
  log('--------------------------------------', 'cyan');
  log(message, 'cyan');
  log('--------------------------------------', 'cyan');
}

function runCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  }
}

// 主流程
const steps = [
  {
    name: '清理旧的构建文件',
    command: () => {
      const distPath = path.join(__dirname, '..', 'dist');
      if (fs.existsSync(distPath)) {
        fs.rmSync(distPath, { recursive: true, force: true });
      }
      return true;
    }
  },
  {
    name: '安装依赖',
    command: () => runCommand('npm ci')
  },
  {
    name: 'ESLint 代码风格检查',
    command: () => runCommand('npm run lint')
  },
  {
    name: 'TypeScript 编译检查',
    command: () => runCommand('npm run typecheck')
  },
  {
    name: '单元测试',
    command: () => runCommand('npm run test:unit')
  },
  {
    name: '构建验证',
    command: () => runCommand('npm run build')
  }
];

async function main() {
  log('======================================', 'bold');
  log('  SemiNexus CLI 质量检查', 'bold');
  log('======================================', 'bold');
  log('');

  let errors = 0;
  let warnings = 0;

  for (let i = 0; i < steps.length; i++) {
    const stepInfo = steps[i];
    step(`步骤 ${i + 1}/${steps.length}: ${stepInfo.name}`);
    
    const success = await Promise.resolve(stepInfo.command());
    
    if (success) {
      success(`${stepInfo.name}通过`);
    } else {
      error(`${stepInfo.name}失败`);
      errors++;
    }
  }

  // 总结
  log('', 'reset');
  log('======================================', 'bold');
  log('  质量检查总结', 'bold');
  log('======================================', 'bold');
  log('');

  if (errors === 0) {
    success('所有质量检查通过！🎉');
    log('');
    log('下一步建议：', 'cyan');
    log('  • 运行 \'git commit\' 提交代码');
    log('  • 运行 \'npm run test:e2e\' 执行 E2E 测试');
    log('  • 运行 \'npm run build:bin\' 打包发布');
    process.exit(0);
  } else {
    error(`发现 ${errors} 个错误，${warnings} 个警告`);
    log('');
    log('请修复以上错误后重新运行检查。', 'yellow');
    log('');
    log('常见修复方法：', 'cyan');
    log('  • ESLint 错误：运行 \'npm run lint:fix\' 自动修复');
    log('  • TypeScript 错误：检查类型定义和类型断言');
    log('  • 测试失败：查看测试日志定位问题');
    process.exit(1);
  }
}

main().catch(err => {
  error(`脚本执行失败：${err.message}`);
  process.exit(1);
});
