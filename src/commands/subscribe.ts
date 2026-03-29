import chalk from 'chalk';
import { client } from '../api/client';

export async function subscribe(name: string, options: { version?: string } = {}): Promise<void> {
  console.log(chalk.blue(`\n📥 Subscribing to ${name}...\n`));

  if (!client.isAuthenticated()) {
    console.log(chalk.red('✗ You must be logged in to subscribe.'));
    console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus login'));
    process.exit(1);
  }

  try {
    const capability = await client.getCapability(name);
    
    if (!capability) {
      console.log(chalk.red(`✗ Capability '${name}' not found.`));
      console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus search <query>') + chalk.blue(' to find capabilities'));
      process.exit(1);
    }

    const version = options.version || capability.version;
    
    console.log(chalk.cyan('Capability: ') + capability.displayName);
    console.log(chalk.cyan('Type: ') + capability.type);
    console.log(chalk.cyan('Version: ') + version);
    console.log();

    const subscription = await client.subscribeCapability(capability.id, version);

    console.log(chalk.green('✓ Subscribed successfully!\n'));
    console.log(chalk.cyan('  Subscription ID: ') + subscription.id);
    console.log(chalk.cyan('  Status: ') + chalk.green(subscription.status));
    console.log(chalk.cyan('  Subscribed at: ') + new Date(subscription.subscribedAt).toLocaleString());
    
    if (subscription.expiresAt) {
      console.log(chalk.cyan('  Expires at: ') + new Date(subscription.expiresAt).toLocaleString());
    }

    console.log(chalk.blue('\nNext steps:'));
    console.log(chalk.gray('  • ') + chalk.yellow(`semi-nexus install ${name}`) + chalk.gray(' - Install the capability'));
    console.log(chalk.gray('  • ') + chalk.yellow(`semi-nexus info ${name}`) + chalk.gray(' - View details'));
    console.log();

  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message;
    console.log(chalk.red(`\n✗ Subscription failed: ${errorMessage}`));
    process.exit(1);
  }
}

export async function listSubscriptions(): Promise<void> {
  console.log(chalk.blue('\n📋 Your Subscriptions\n'));

  if (!client.isAuthenticated()) {
    console.log(chalk.yellow('⚠ You are not logged in.'));
    console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus login'));
    return;
  }

  try {
    const subscriptions = await client.getSubscriptions();

    if (subscriptions.length === 0) {
      console.log(chalk.yellow('No subscriptions yet.'));
      console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus search <query>') + chalk.blue(' to find capabilities'));
      return;
    }

    for (const sub of subscriptions) {
      const cap = sub.capability;
      if (cap) {
        console.log(chalk.bold `${cap.displayName}`);
        console.log(chalk.cyan `  [${cap.type}] ${chalk.gray(`v${sub.version}`)}`);
        console.log(chalk.gray `  Status: ${sub.status} | Subscribed: ${new Date(sub.subscribedAt).toLocaleDateString()}`);
        console.log();
      }
    }
  } catch (error: any) {
    console.log(chalk.red(`Failed to list subscriptions: ${error.message}`));
  }
}
