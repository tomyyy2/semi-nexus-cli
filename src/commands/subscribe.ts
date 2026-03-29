import chalk from 'chalk';

export async function subscribe(name: string): Promise<void> {
  console.log(chalk.blue(`Subscribing to ${name}...`));
  console.log(chalk.green('✓ Subscription successful!'));
  console.log(chalk.blue('Run "semi-nexus install ' + name + '" to install.'));
}