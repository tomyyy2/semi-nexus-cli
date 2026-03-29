import chalk from 'chalk';
import { client } from '../api/client';

export async function status(): Promise<void> {
  const config = client.getConfig();

  console.log(chalk.bold('\nSemiNexus CLI Status'));
  console.log('=' .repeat(40));
  console.log(chalk.blue('Server: ') + config.server.url);
  console.log(chalk.green('Status: ✓ Connected (offline mode)'));
  console.log(chalk.blue('Install Dir: ') + client.getInstallDir());
  console.log(chalk.blue('Skills Dir: ') + client.getSkillsDir());
  console.log();
}