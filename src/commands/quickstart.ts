import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { client } from '../api/client';
import { agentDetector } from '../api/agents';
import { registry } from '../api/registry';

export async function quickstart(): Promise<void> {
  console.log(chalk.blue('\n🚀 Welcome to SemiNexus CLI!\n'));
  console.log(chalk.gray('Let\'s get you started...\n'));

  const baseDir = path.join(os.homedir(), '.semi-nexus');
  const configPath = path.join(baseDir, 'config.yaml');

  const serverUrl = await askServerUrl();
  
  console.log(chalk.blue('\n📡 Connecting to server...'));
  client.setServerUrl(serverUrl);
  
  try {
    await client.getStatus();
    console.log(chalk.green('✓ Connected to server'));
  } catch (error) {
    console.log(chalk.red('✗ Cannot connect to server'));
    console.log(chalk.yellow('Please check the server URL and try again.'));
    process.exit(1);
  }

  const loginMethod = await askLoginMethod();
  
  if (loginMethod === 'apikey') {
    const apiKey = await askApiKey();
    console.log(chalk.blue('\n🔐 Logging in...'));
    
    try {
      await client.loginWithApiKey(apiKey);
      console.log(chalk.green('✓ Logged in successfully'));
    } catch (error: any) {
      console.log(chalk.red(`✗ Login failed: ${error.message}`));
      process.exit(1);
    }
  } else {
    const credentials = await askCredentials();
    console.log(chalk.blue('\n🔐 Logging in...'));
    
    try {
      await client.login(credentials.username, credentials.password, credentials.authType);
      console.log(chalk.green('✓ Logged in successfully'));
    } catch (error: any) {
      console.log(chalk.red(`✗ Login failed: ${error.message}`));
      process.exit(1);
    }
  }

  console.log(chalk.blue('\n🔍 Detecting Agent environments...'));
  const agents = await agentDetector.detectAll();
  
  console.log(chalk.bold('\nDetected Agents:'));
  for (const agent of agents) {
    const status = agent.detected 
      ? chalk.green(`✓ ${agent.name} (${agent.installPath})`)
      : chalk.gray(`✗ ${agent.name} (not installed)`);
    console.log(`  ${status}`);
  }

  const installRecommended = await askInstallRecommended();
  
  if (installRecommended) {
    console.log(chalk.blue('\n📦 Installing recommended skills...'));
    
    const recommendedSkills = await getRecommendedSkills();
    
    for (const skill of recommendedSkills) {
      try {
        console.log(chalk.gray(`  Installing ${skill.name}...`));
        await installSkill(skill);
        console.log(chalk.green(`  ✓ ${skill.displayName} (${skill.type})`));
      } catch (error: any) {
        console.log(chalk.red(`  ✗ ${skill.name}: ${error.message}`));
      }
    }
  }

  const detectedAgents = agents.filter(a => a.detected);
  
  if (detectedAgents.length > 0) {
    console.log(chalk.blue('\n🔄 Syncing to Agents...'));
    
    const installed = await registry.getInstalled();
    
    for (const agent of detectedAgents) {
      let count = 0;
      for (const cap of installed) {
        try {
          await syncToAgent(cap, agent);
          count++;
        } catch (error) {
          console.log(chalk.red(`  ✗ ${agent.name}: sync failed`));
        }
      }
      console.log(chalk.green(`  ✓ ${agent.name}: ${count} skills synced`));
    }
  }

  console.log(chalk.green('\n📚 Your skills are ready!\n'));
  
  printUsageGuide(detectedAgents);
  
  console.log(chalk.gray('\nRun ') + chalk.yellow('semi-nexus verify <skill-name>') + chalk.gray(' to check status.\n'));
}

async function askServerUrl(): Promise<string> {
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
  
  return answers.serverUrl;
}

async function askLoginMethod(): Promise<'apikey' | 'credentials'> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'method',
      message: 'Login method:',
      choices: [
        { name: 'API Key', value: 'apikey' },
        { name: 'Username & Password', value: 'credentials' }
      ]
    }
  ]);
  
  return answers.method;
}

async function askApiKey(): Promise<string> {
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'API Key:',
      mask: '*',
      validate: (input: string) => input.length > 0 || 'API Key is required'
    }
  ]);
  
  return answers.apiKey;
}

async function askCredentials(): Promise<{ username: string; password: string; authType: string }> {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'Username:',
      validate: (input: string) => input.length > 0 || 'Username is required'
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      mask: '*',
      validate: (input: string) => input.length > 0 || 'Password is required'
    },
    {
      type: 'list',
      name: 'authType',
      message: 'Authentication type:',
      choices: [
        { name: 'Local', value: 'local' },
        { name: 'LDAP', value: 'ldap' },
        { name: 'Active Directory', value: 'ad' }
      ],
      default: 'local'
    }
  ]);
}

async function askInstallRecommended(): Promise<boolean> {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'install',
      message: 'Would you like to install recommended skills?',
      default: true
    }
  ]);
  
  return answers.install;
}

async function getRecommendedSkills(): Promise<any[]> {
  try {
    const results = await client.searchCapabilities('self-improvement');
    return results.slice(0, 2);
  } catch (error) {
    return [];
  }
}

async function installSkill(skill: any): Promise<void> {
  const installDir = client.getSkillsDir();
  const skillDir = path.join(installDir, skill.name);
  
  await fs.ensureDir(skillDir);
  
  const manifest = {
    id: skill.id,
    name: skill.name,
    displayName: skill.displayName,
    version: skill.version,
    type: skill.type,
    description: skill.description,
    installedAt: new Date().toISOString()
  };
  
  await fs.writeFile(
    path.join(skillDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  const skillContent = `---
name: ${skill.name}
displayName: ${skill.displayName}
version: ${skill.version}
description: ${skill.description}
---

# ${skill.displayName}

${skill.description}
`;
  
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);
  
  await registry.markInstalled({
    id: skill.id,
    name: skill.name,
    version: skill.version,
    installedAt: new Date().toISOString(),
    installPath: skillDir,
    syncedAgents: []
  });
}

async function syncToAgent(cap: any, agent: any): Promise<void> {
  const targetPath = path.join(agent.skillPath, cap.name);
  const sourcePath = cap.installPath;
  
  await agentDetector.ensureSkillPath(agent.id);
  
  if (await fs.pathExists(targetPath)) {
    const stat = await fs.lstat(targetPath);
    if (stat.isSymbolicLink()) {
      await fs.unlink(targetPath);
    } else {
      await fs.remove(targetPath);
    }
  }
  
  const isWindows = process.platform === 'win32';
  
  if (agent.syncMode === 'copy') {
    await fs.copy(sourcePath, targetPath);
  } else {
    if (isWindows) {
      await fs.symlink(sourcePath, targetPath, 'junction');
    } else {
      await fs.symlink(sourcePath, targetPath);
    }
  }
  
  if (!cap.syncedAgents.includes(agent.id)) {
    cap.syncedAgents.push(agent.id);
  }
  await registry.updateSyncStatus(cap.id, cap.syncedAgents);
}

function printUsageGuide(agents: any[]): void {
  console.log(chalk.bold('📚 How to use your capabilities:\n'));
  
  const claudeCode = agents.find(a => a.id === 'claude-code');
  if (claudeCode) {
    console.log(chalk.cyan('Claude Code:'));
    console.log(chalk.gray('  1. Start a new chat session'));
    console.log(chalk.gray('  2. Just ask Claude to use the skill\n'));
  }
  
  const opencode = agents.find(a => a.id === 'opencode');
  if (opencode) {
    console.log(chalk.cyan('OpenCode:'));
    console.log(chalk.gray('  1. Restart OpenCode'));
    console.log(chalk.gray('  2. Skills are auto-loaded\n'));
  }
  
  const openclaw = agents.find(a => a.id === 'openclaw');
  if (openclaw) {
    console.log(chalk.cyan('OpenClaw:'));
    console.log(chalk.gray('  1. Edit ~/.openclaw/config.yaml'));
    console.log(chalk.gray('  2. Add plugin to enabled list'));
    console.log(chalk.gray('  3. Restart OpenClaw\n'));
  }
}
