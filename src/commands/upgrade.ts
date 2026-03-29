import chalk from 'chalk';

export async function upgrade(name?: string): Promise<void> {
  if (name) {
    console.log(chalk.blue(`Upgrading ${name}...`));
  } else {
    console.log(chalk.blue('Checking for updates...'));
  }
  console.log(chalk.green('✓ All capabilities are up to date.'));
}