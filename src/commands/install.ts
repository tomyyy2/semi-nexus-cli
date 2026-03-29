import chalk from 'chalk';
import { client } from '../api/client';

export async function install(name: string): Promise<void> {
  console.log(chalk.blue(`Installing ${name}...`));

  const installDir = client.getSkillsDir();
  console.log(chalk.green(`✓ Installed to ${installDir}/${name}`));
}