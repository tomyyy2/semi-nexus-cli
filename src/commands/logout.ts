import chalk from 'chalk';
import { client } from '../api/client';

export async function logout(): Promise<void> {
  console.log(chalk.blue('\nLogging out...\n'));

  const config = client.getConfig();
  
  if (!config.auth?.token) {
    console.log(chalk.yellow('⚠ You are not logged in.'));
    return;
  }

  const username = config.auth.username || 'Unknown';
  
  try {
    await client.logout();
    console.log(chalk.green(`✓ Logged out successfully.`));
    console.log(chalk.gray(`  User: ${username}`));
  } catch (error: unknown) {
    const err = error as Error;
    console.log(chalk.green(`✓ Logged out successfully.`));
    console.log(chalk.gray(`  (Server notification failed: ${err.message})`));
  }
}
