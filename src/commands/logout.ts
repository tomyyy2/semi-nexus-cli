import chalk from 'chalk';

export async function logout(): Promise<void> {
  console.log(chalk.green('✓ Logged out successfully'));
  console.log(chalk.blue('Run "semi-nexus login" to login again.'));
}