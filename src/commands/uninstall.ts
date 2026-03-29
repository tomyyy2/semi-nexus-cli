import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { registry } from '../api/registry';
import { agentDetector } from '../api/agents';

export async function uninstall(name: string, options: { yes?: boolean } = {}): Promise<void> {
  console.log(chalk.blue(`\n🗑️  Uninstalling ${name}...\n`));

  const installed = await registry.getInstalled();
  const cap = installed.find(c => c.name === name);

  if (!cap) {
    console.log(chalk.red(`✗ '${name}' is not installed.`));
    return;
  }

  const capability = await registry.getCapability(name);

  if (!options.yes) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to uninstall ${capability?.displayName || name}?`,
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Cancelled.'));
      return;
    }
  }

  try {
    const installDir = client.getSkillsDir();
    const capInstallDir = path.join(installDir, name);

    if (await fs.pathExists(capInstallDir)) {
      await fs.remove(capInstallDir);
    }

    for (const agentId of cap.syncedAgents) {
      const agent = agentDetector.getAgent(agentId);
      if (agent) {
        const syncPath = path.join(agent.skillPath, name);
        if (await fs.pathExists(syncPath)) {
          const stat = await fs.lstat(syncPath);
          if (stat.isSymbolicLink()) {
            await fs.unlink(syncPath);
          } else {
            await fs.remove(syncPath);
          }
        }
      }
    }

    await registry.unmarkInstalled(cap.id);

    console.log(chalk.green(`\n✓ ${capability?.displayName || name} uninstalled successfully!`));
    console.log(chalk.gray(`  Removed: ${capInstallDir}`));
    
    if (cap.syncedAgents.length > 0) {
      console.log(chalk.gray(`  Cleaned up syncs from: ${cap.syncedAgents.join(', ')}`));
    }

  } catch (error: any) {
    console.log(chalk.red(`\n✗ Uninstall failed: ${error.message}`));
    process.exit(1);
  }
}

import { client } from '../api/client';
