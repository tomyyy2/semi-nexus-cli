import chalk from 'chalk';
import { registry } from '../api/registry';

export async function list(options: { installed?: boolean; subscriptions?: boolean } = {}): Promise<void> {
  console.log(chalk.blue('\nInstalled Capabilities:\n'));

  const installed = await registry.getInstalled();

  if (installed.length === 0) {
    console.log(chalk.yellow('No capabilities installed yet.'));
    console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus search <query>') + chalk.blue(' to find capabilities'));
    return;
  }

  for (const cap of installed) {
    const syncedAgents = cap.syncedAgents.length > 0
      ? cap.syncedAgents.join(', ')
      : chalk.gray('Not synced');

    console.log(chalk.bold(`${cap.name}`));
    console.log(chalk.cyan(`  Version: ${cap.version}`));
    console.log(chalk.gray(`  Installed: ${new Date(cap.installedAt).toLocaleDateString()}`));
    console.log(chalk.gray(`  Synced to: ${syncedAgents}`));
    console.log(chalk.gray(`  Location: ${cap.installPath}`));
    console.log();
  }
}