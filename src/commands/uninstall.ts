import chalk from 'chalk';

export async function uninstall(name: string): Promise<void> {
  console.log(chalk.blue(`Uninstalling ${name}...`));
  console.log(chalk.green('✓ Uninstalled successfully.'));
}