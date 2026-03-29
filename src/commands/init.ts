import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { client } from '../api/client';

export async function init(): Promise<void> {
  console.log(chalk.blue('Initializing SemiNexus CLI...'));

  const baseDir = path.join(os.homedir(), '.semi-nexus');
  const configPath = path.join(baseDir, 'config.yaml');

  await fs.ensureDir(baseDir);
  await fs.ensureDir(path.join(baseDir, 'skills'));
  await fs.ensureDir(path.join(baseDir, 'cache'));
  await fs.ensureDir(path.join(baseDir, 'logs'));

  const defaultConfig = {
    server: { url: 'http://localhost:3000', timeout: 30000 },
    auth: { token: '', username: '', expiresAt: '' },
    install: {
      baseDir,
      skillsDir: path.join(baseDir, 'skills'),
      mcpDir: path.join(baseDir, 'mcp'),
      agentsDir: path.join(baseDir, 'agents'),
      cacheDir: path.join(baseDir, 'cache')
    },
    agents: {
      'claude-code': { enabled: true, installPath: '~/.claude/skills', syncMode: 'symlink' },
      'opencode': { enabled: true, installPath: '~/.opencode/skills', syncMode: 'symlink' },
      'openclaw': { enabled: false, installPath: '~/.openclaw/plugins', syncMode: 'copy' }
    },
    logging: { level: 'info', file: path.join(baseDir, 'logs', 'cli.log') }
  };

  await fs.writeFileSync(configPath, yaml.stringify(defaultConfig), 'utf-8');

  console.log(chalk.green('✓ Config directory: ') + baseDir);
  console.log(chalk.green('✓ Config file: ') + configPath);
  console.log(chalk.green('\nInitialized successfully! Run "semi-nexus login" to start.'));
}