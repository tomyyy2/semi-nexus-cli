import chalk from 'chalk';
import { registry } from '../api/registry';

export async function subscribe(name: string, options: { version?: string } = {}): Promise<void> {
  console.log(chalk.blue(`\nSubscribing to ${name}...\n`));

  const capability = await registry.getCapability(name);

  if (!capability) {
    console.log(chalk.red(`✗ Capability '${name}' not found in registry`));
    console.log(chalk.yellow('Run "semi-nexus search <query>" to find capabilities'));
    return;
  }

  try {
    const version = options.version || capability.version;
    const subscription = await registry.subscribe(capability.id, version);

    console.log(chalk.green(`✓ Subscribed to ${capability.displayName}!`));
    console.log(chalk.blue('  Version: ') + version);
    console.log(chalk.blue('  Status: ') + chalk.green(subscription.status));
    console.log(chalk.blue('  Subscribed at: ') + subscription.subscribedAt);
    console.log(chalk.blue('  Expires at: ') + subscription.expiresAt);
    console.log(chalk.blue('\nRun: ') + chalk.yellow(`semi-nexus install ${name}`) + chalk.blue(' to install'));

  } catch (error) {
    console.log(chalk.red(`\n✗ Subscription failed: ${error}`));
  }
}

export async function listSubscriptions(): Promise<void> {
  console.log(chalk.blue('\nYour Subscriptions:\n'));

  const subscriptions = await registry.getSubscriptions();

  if (subscriptions.length === 0) {
    console.log(chalk.yellow('No subscriptions yet.'));
    console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus search <query>') + chalk.blue(' to find capabilities'));
    return;
  }

  for (const sub of subscriptions) {
    const capability = await registry.getCapability(sub.capabilityId);
    if (capability) {
      console.log(chalk.bold(`${capability.displayName}`));
      console.log(chalk.cyan(`  [${capability.type}]`));
      console.log(chalk.gray(`  Version: ${sub.version} | Status: ${sub.status}`));
    }
  }
}