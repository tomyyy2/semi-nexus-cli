import chalk from 'chalk';

export async function info(name: string): Promise<void> {
  console.log(chalk.blue(`Capability: ${name}\n`));
  console.log(chalk.yellow('Capability details not available offline.'));
}