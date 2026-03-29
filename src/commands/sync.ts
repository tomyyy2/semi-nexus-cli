import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { registry } from '../api/registry';
import { agentDetector } from '../api/agents';

export async function sync(options: { to?: string; mode?: 'symlink' | 'copy' } = {}): Promise<void> {
  console.log(chalk.blue('\nSyncing capabilities to Agent environments...\n'));

  const installed = await registry.getInstalled();

  if (installed.length === 0) {
    console.log(chalk.yellow('No capabilities installed.'));
    console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus install <name>') + chalk.blue(' first'));
    return;
  }

  const detectedAgents = await agentDetector.detectAll();
  const availableAgents = detectedAgents.filter(a => a.detected);

  if (availableAgents.length === 0) {
    console.log(chalk.yellow('⚠ No Agent environments detected.'));
    console.log(chalk.gray('Supported: Claude Code, OpenCode, OpenClaw'));
    return;
  }

  const targetAgents = options.to
    ? availableAgents.filter(a => a.id === options.to)
    : availableAgents;

  if (targetAgents.length === 0 && options.to) {
    console.log(chalk.red(`\n✗ Agent '${options.to}' not found or not detected.`));
    return;
  }

  const isWindows = process.platform === 'win32';

  for (const agent of targetAgents) {
    console.log(chalk.bold(`\n${agent.name} (${agent.skillPath})`));
    console.log(chalk.gray('─'.repeat(40)));

    await agentDetector.ensureSkillPath(agent.id);

    for (const cap of installed) {
      const targetPath = path.join(agent.skillPath, cap.name);
      const sourcePath = cap.installPath;

      try {
        if (await fs.pathExists(targetPath)) {
          if (options.mode === 'copy') {
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

        if (options.mode === 'copy' || (agent.syncMode === 'copy' && !options.mode)) {
          await fs.copy(sourcePath, targetPath);
          console.log(chalk.green(`  ✓ ${cap.name} (copied)`));
        } else {
          if (isWindows) {
            await fs.symlink(sourcePath, targetPath, 'junction');
          } else {
            await fs.symlink(sourcePath, targetPath);
          }
          console.log(chalk.green(`  ✓ ${cap.name} (symlink)`));
        }

        if (!cap.syncedAgents.includes(agent.id)) {
          cap.syncedAgents.push(agent.id);
        }
        await registry.updateSyncStatus(cap.id, cap.syncedAgents);
      } catch (error) {
        console.log(chalk.red(`  ✗ ${cap.name}: ${error}`));
      }
    }
  }

  console.log(chalk.green('\n✓ Sync complete!\n'));
}

export async function syncStatus(): Promise<void> {
  console.log(chalk.blue('\nSync Status:\n'));

  const installed = await registry.getInstalled();
  const detectedAgents = await agentDetector.detectAll();

  if (installed.length === 0) {
    console.log(chalk.yellow('No capabilities installed.'));
    return;
  }

  for (const cap of installed) {
    console.log(chalk.bold(`${cap.name}`));
    console.log(chalk.gray(`  Local: ${cap.installPath}`));

    const syncedList = cap.syncedAgents.length > 0
      ? cap.syncedAgents.map(id => {
          const agent = detectedAgents.find(a => a.id === id);
          return agent ? `${agent.name}` : id;
        }).join(', ')
      : chalk.gray('Not synced');

    console.log(chalk.cyan(`  Synced: ${syncedList}`));
    console.log();
  }
}