import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { registry } from '../api/registry';
import { agentDetector } from '../api/agents';

export async function sync(options: { 
  to?: string; 
  mode?: 'symlink' | 'copy';
  configure?: boolean;
  status?: boolean;
} = {}): Promise<void> {
  if (options.status) {
    await syncStatus();
    return;
  }

  console.log(chalk.blue('\n🔄 Syncing capabilities to Agent environments...\n'));

  const installed = await registry.getInstalled();

  if (installed.length === 0) {
    console.log(chalk.yellow('⚠ No capabilities installed.'));
    console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus install <name>') + chalk.blue(' first'));
    return;
  }

  const detectedAgents = await agentDetector.detectAll();
  const availableAgents = detectedAgents.filter(a => a.detected);

  if (availableAgents.length === 0) {
    console.log(chalk.yellow('⚠ No Agent environments detected.'));
    console.log(chalk.gray('Supported: Claude Code, OpenCode, OpenClaw'));
    console.log(chalk.gray('Make sure the Agent is installed and has been run at least once.'));
    return;
  }

  const targetAgents = options.to
    ? availableAgents.filter(a => a.id === options.to)
    : availableAgents;

  if (targetAgents.length === 0 && options.to) {
    console.log(chalk.red(`\n✗ Agent '${options.to}' not found or not detected.`));
    console.log(chalk.gray('Available agents:'));
    for (const agent of availableAgents) {
      console.log(chalk.gray(`  - ${agent.name} (${agent.id})`));
    }
    return;
  }

  const isWindows = process.platform === 'win32';
  let successCount = 0;
  let failCount = 0;
  const syncedToAgents: string[] = [];

  for (const agent of targetAgents) {
    console.log(chalk.bold `\n${agent.name}`);
    console.log(chalk.gray (`  Path: ${agent.skillPath}`));
    console.log(chalk.gray ('─'.repeat(50)));

    await agentDetector.ensureSkillPath(agent.id);

    for (const cap of installed) {
      const targetPath = path.join(agent.skillPath, cap.name);
      const sourcePath = cap.installPath;

      try {
        if (await fs.pathExists(targetPath)) {
          if (options.mode === 'copy' || agent.syncMode === 'copy') {
            await fs.remove(targetPath);
          } else {
            const stat = await fs.lstat(targetPath);
            if (stat.isSymbolicLink()) {
              await fs.unlink(targetPath);
            } else {
              await fs.remove(targetPath);
            }
          }
        }

        const useCopy = options.mode === 'copy' || (agent.syncMode === 'copy' && !options.mode);

        if (useCopy) {
          await fs.copy(sourcePath, targetPath);
          console.log(chalk.green `  ✓ ${cap.name} (copied)`);
        } else {
          if (isWindows) {
            await fs.symlink(sourcePath, targetPath, 'junction');
          } else {
            await fs.symlink(sourcePath, targetPath);
          }
          console.log(chalk.green `  ✓ ${cap.name} (symlink)`);
        }

        const skillFile = await verifySkillFile(targetPath);
        if (!skillFile) {
          console.log(chalk.yellow `    ⚠ No skill file found (SKILL.md/skill.md)`);
        }

        if (!cap.syncedAgents.includes(agent.id)) {
          cap.syncedAgents.push(agent.id);
        }
        await registry.updateSyncStatus(cap.id, cap.syncedAgents);
        successCount++;
        if (!syncedToAgents.includes(agent.id)) {
          syncedToAgents.push(agent.id);
        }

      } catch (error: any) {
        console.log(chalk.red `  ✗ ${cap.name}: ${error.message}`);
        failCount++;
      }
    }

    if (options.configure && agent.id === 'openclaw') {
      await configureOpenClaw(installed);
    }
  }

  console.log(chalk.bold `\n${'─'.repeat(50)}`);
  console.log(chalk.green `✓ Sync complete!`);
  console.log(chalk.gray `  Success: ${successCount} | Failed: ${failCount}`);
  console.log();

  if (successCount > 0) {
    printUsageGuide(targetAgents.filter(a => syncedToAgents.includes(a.id)));
  }
}

async function verifySkillFile(dir: string): Promise<string | null> {
  const files = ['SKILL.md', 'skill.md', 'README.md'];
  for (const file of files) {
    if (await fs.pathExists(path.join(dir, file))) {
      return file;
    }
  }
  return null;
}

async function configureOpenClaw(capabilities: any[]): Promise<void> {
  const configPath = path.join(os.homedir(), '.openclaw', 'config.yaml');
  
  try {
    let config: any = {};
    
    if (await fs.pathExists(configPath)) {
      const content = await fs.readFile(configPath, 'utf-8');
      config = yaml.parse(content) || {};
    }

    config.plugins = config.plugins || {};
    config.plugins.enabled = config.plugins.enabled || [];

    let added = 0;
    for (const cap of capabilities) {
      if (!config.plugins.enabled.includes(cap.name)) {
        config.plugins.enabled.push(cap.name);
        added++;
      }
    }

    if (added > 0) {
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeFile(configPath, yaml.stringify(config), 'utf-8');
      console.log(chalk.green `\n✓ OpenClaw configuration updated`);
      console.log(chalk.gray `  Added ${added} plugin(s) to enabled list`);
      console.log(chalk.gray `  Config: ${configPath}`);
    }
  } catch (error: any) {
    console.log(chalk.yellow `\n⚠ Could not configure OpenClaw: ${error.message}`);
  }
}

function printUsageGuide(agents: any[]): void {
  console.log(chalk.bold('📚 How to use your capabilities:\n'));
  
  const claudeCode = agents.find(a => a.id === 'claude-code');
  if (claudeCode) {
    console.log(chalk.cyan('Claude Code:'));
    console.log(chalk.gray('  1. Restart Claude Code or start a new chat session'));
    console.log(chalk.gray('  2. Skills are auto-loaded from ~/.claude/skills/'));
    console.log(chalk.gray('  3. Just ask Claude to use the skill'));
    console.log();
  }
  
  const opencode = agents.find(a => a.id === 'opencode');
  if (opencode) {
    console.log(chalk.cyan('OpenCode:'));
    console.log(chalk.gray('  1. Restart OpenCode'));
    console.log(chalk.gray('  2. Skills are auto-loaded from ~/.opencode/skills/'));
    console.log();
  }
  
  const openclaw = agents.find(a => a.id === 'openclaw');
  if (openclaw) {
    console.log(chalk.cyan('OpenClaw:'));
    console.log(chalk.gray('  1. Edit ~/.openclaw/config.yaml'));
    console.log(chalk.gray('  2. Add plugins to enabled list:'));
    console.log(chalk.gray('     plugins:'));
    console.log(chalk.gray('       enabled:'));
    console.log(chalk.gray('         - <skill-name>'));
    console.log(chalk.gray('  3. Restart OpenClaw'));
    console.log();
    console.log(chalk.blue('  Run: ') + chalk.yellow('semi-nexus sync --configure') + chalk.blue(' to auto-configure'));
    console.log();
  }
}

export async function syncStatus(): Promise<void> {
  console.log(chalk.blue('\n📊 Sync Status\n'));

  const installed = await registry.getInstalled();
  const detectedAgents = await agentDetector.detectAll();

  if (installed.length === 0) {
    console.log(chalk.yellow('No capabilities installed.'));
    return;
  }

  for (const cap of installed) {
    console.log(chalk.bold `${cap.name}`);
    console.log(chalk.gray `  Local: ${cap.installPath}`);
    console.log(chalk.gray `  Version: ${cap.version}`);

    const skillFile = await verifySkillFile(cap.installPath);
    if (skillFile) {
      console.log(chalk.green `  Skill File: ${skillFile}`);
    } else {
      console.log(chalk.yellow `  Skill File: Not found`);
    }

    if (cap.syncedAgents.length > 0) {
      console.log(chalk.cyan `  Synced to:`);
      for (const agentId of cap.syncedAgents) {
        const agent = detectedAgents.find(a => a.id === agentId);
        if (agent) {
          const agentPath = path.join(agent.skillPath, cap.name);
          const exists = await fs.pathExists(agentPath);
          const status = exists ? chalk.green('✓') : chalk.red('✗');
          console.log(chalk.gray `    ${status} ${agent.name} (${agentPath})`);
        }
      }
    } else {
      console.log(chalk.yellow `  Synced: Not synced to any Agent`);
    }
    console.log();
  }

  console.log(chalk.bold('Detected Agents:'));
  for (const agent of detectedAgents) {
    const status = agent.detected ? chalk.green('✓') : chalk.gray('✗');
    console.log(chalk.gray `  ${status} ${agent.name}: ${agent.skillPath}`);
  }
  console.log();
}
