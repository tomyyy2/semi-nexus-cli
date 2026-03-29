import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { registry } from '../api/registry';
import { agentDetector } from '../api/agents';
import { client } from '../api/client';

export async function sync(options: { to?: string; mode?: 'symlink' | 'copy' } = {}): Promise<void> {
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

        if (!cap.syncedAgents.includes(agent.id)) {
          cap.syncedAgents.push(agent.id);
        }
        await registry.updateSyncStatus(cap.id, cap.syncedAgents);
        successCount++;

      } catch (error: any) {
        console.log(chalk.red `  ✗ ${cap.name}: ${error.message}`);
        failCount++;
      }
    }
  }

  console.log(chalk.bold `\n${'─'.repeat(50)}`);
  console.log(chalk.green `✓ Sync complete!`);
  console.log(chalk.gray `  Success: ${successCount} | Failed: ${failCount}`);
  console.log();
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

    if (cap.syncedAgents.length > 0) {
      const syncedList = cap.syncedAgents.map(id => {
        const agent = detectedAgents.find(a => a.id === id);
        return agent ? chalk.green(agent.name) : chalk.gray(id);
      }).join(', ');
      console.log(chalk.cyan `  Synced: ${syncedList}`);
    } else {
      console.log(chalk.yellow `  Synced: Not synced`);
    }
    console.log();
  }
}
