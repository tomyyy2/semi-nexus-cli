import chalk from 'chalk';

export async function list(): Promise<void> {
  console.log(chalk.blue('Installed capabilities:\n'));
  console.log(chalk.yellow('No capabilities installed yet.'));
  console.log(chalk.blue('Run "semi-nexus install <name>" to install.'));
}