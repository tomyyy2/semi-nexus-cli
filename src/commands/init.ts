import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import inquirer from 'inquirer';

export async function init(options: { server?: string; force?: boolean } = {}): Promise<void> {
  console.log(chalk.blue('\n🚀 Initializing SemiNexus CLI...\n'));

  const baseDir = path.join(os.homedir(), '.semi-nexus');
  const configPath = path.join(baseDir, 'config.yaml');

  if (await fs.pathExists(configPath) && !options.force) {
    console.log(chalk.yellow('⚠ SemiNexus is already initialized.'));
    console.log(chalk.gray(`  Config: ${configPath}`));
    console.log(chalk.blue('\nUse ') + chalk.yellow('--force') + chalk.blue(' to reinitialize.'));
    return;
  }

  let serverUrl = options.server || 'http://localhost:3000';

  if (!options.server) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'serverUrl',
        message: 'Server URL:',
        default: 'http://localhost:3000',
        validate: (input: string) => {
          if (!input) return 'Server URL is required';
          if (!input.startsWith('http://') && !input.startsWith('https://')) {
            return 'Server URL must start with http:// or https://';
          }
          return true;
        }
      }
    ]);
    serverUrl = answers.serverUrl;
  }

  await fs.ensureDir(baseDir);
  await fs.ensureDir(path.join(baseDir, 'skills'));
  await fs.ensureDir(path.join(baseDir, 'mcp'));
  await fs.ensureDir(path.join(baseDir, 'agents'));
  await fs.ensureDir(path.join(baseDir, 'cache'));
  await fs.ensureDir(path.join(baseDir, 'logs'));

  const defaultConfig = {
    server: { 
      url: serverUrl, 
      timeout: 30000 
    },
    auth: { 
      token: '', 
      refreshToken: '', 
      username: '', 
      expiresAt: '' 
    },
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
    logging: { 
      level: 'info', 
      file: path.join(baseDir, 'logs', 'cli.log') 
    }
  };

  await fs.writeFile(configPath, yaml.stringify(defaultConfig), 'utf-8');

  console.log(chalk.green('\n✓ Initialized successfully!\n'));
  console.log(chalk.cyan('  Config directory: ') + baseDir);
  console.log(chalk.cyan('  Config file: ') + configPath);
  console.log(chalk.cyan('  Server URL: ') + serverUrl);
  
  console.log(chalk.blue('\nNext steps:'));
  console.log(chalk.gray('  1. ') + chalk.yellow('semi-nexus login') + chalk.gray(' - Login to the server'));
  console.log(chalk.gray('  2. ') + chalk.yellow('semi-nexus search <query>') + chalk.gray(' - Search for capabilities'));
  console.log(chalk.gray('  3. ') + chalk.yellow('semi-nexus subscribe <name>') + chalk.gray(' - Subscribe to a capability'));
  console.log(chalk.gray('  4. ') + chalk.yellow('semi-nexus install <name>') + chalk.gray(' - Install a capability'));
  console.log();
}
