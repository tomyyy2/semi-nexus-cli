import chalk from 'chalk';
import { client } from '../api/client';
import { registry } from '../api/registry';

export async function info(name: string): Promise<void> {
  console.log(chalk.blue(`\nℹ️  Capability Details\n`));

  let capability = null;

  try {
    capability = await client.getCapability(name);
  } catch {
    // Ignore - will try local registry
  }

  if (!capability) {
    capability = await registry.getCapability(name);
  }

  if (!capability) {
    console.log(chalk.red(`✗ Capability '${name}' not found.`));
    console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus search <query>') + chalk.blue(' to find capabilities'));
    process.exit(1);
  }

  const installed = await registry.getInstalled();
  const isInstalled = installed.some(c => c.name === name);
  const isSubscribed = await registry.isSubscribed(capability.id);

  console.log(chalk.bold(`${capability.displayName}`));
  console.log(chalk.gray('─'.repeat(50)));
  console.log();

  console.log(chalk.cyan('  Name: ') + capability.name);
  console.log(chalk.cyan('  ID: ') + capability.id);
  console.log(chalk.cyan('  Type: ') + capability.type);
  console.log(chalk.cyan('  Version: ') + capability.version);
  console.log();

  console.log(chalk.cyan('  Description:'));
  console.log(chalk.gray(`    ${capability.description}`));
  console.log();

  console.log(chalk.cyan('  Category:'));
  console.log(chalk.gray(`    Primary: ${capability.category.primary}`));
  console.log(chalk.gray(`    Secondary: ${capability.category.secondary}`));
  console.log();

  console.log(chalk.cyan('  Tags:'));
  console.log(chalk.gray(`    ${capability.tags.join(', ')}`));
  console.log();

  console.log(chalk.cyan('  Statistics:'));
  console.log(chalk.gray(`    Downloads: ${capability.statistics.downloads}`));
  console.log(chalk.gray(`    Subscribers: ${capability.statistics.subscribers}`));
  console.log(chalk.gray(`    Rating: ${'★'.repeat(Math.round(capability.statistics.rating))}${'☆'.repeat(5 - Math.round(capability.statistics.rating))} (${capability.statistics.rating}/5, ${capability.statistics.ratingCount} reviews)`));
  console.log();

  const anyCap = capability as any;
  if (anyCap.author) {
    console.log(chalk.cyan('  Author:'));
    console.log(chalk.gray(`    Name: ${anyCap.author.name || 'Unknown'}`));
    if (anyCap.author.email) {
      console.log(chalk.gray(`    Email: ${anyCap.author.email}`));
    }
    console.log();
  }

  if (anyCap.repository) {
    console.log(chalk.cyan('  Repository: ') + anyCap.repository);
  }

  if (anyCap.homepage) {
    console.log(chalk.cyan('  Homepage: ') + anyCap.homepage);
  }

  console.log();
  console.log(chalk.gray('─'.repeat(50)));
  console.log();

  console.log(chalk.cyan('  Status:'));
  console.log(chalk.gray(`    Installed: ${isInstalled ? chalk.green('Yes') : chalk.yellow('No')}`));
  console.log(chalk.gray(`    Subscribed: ${isSubscribed ? chalk.green('Yes') : chalk.yellow('No')}`));

  if (isInstalled) {
    const installedCap = installed.find(c => c.name === name);
    if (installedCap) {
      console.log(chalk.gray(`    Installed Version: ${installedCap.version}`));
      console.log(chalk.gray(`    Installed At: ${new Date(installedCap.installedAt).toLocaleString()}`));
      if (installedCap.syncedAgents.length > 0) {
        console.log(chalk.gray(`    Synced To: ${installedCap.syncedAgents.join(', ')}`));
      }
    }
  }

  console.log();

  if (!isInstalled) {
    if (!isSubscribed) {
      console.log(chalk.blue('Run: ') + chalk.yellow(`semi-nexus subscribe ${name}`) + chalk.blue(' to subscribe'));
    }
    console.log(chalk.blue('Run: ') + chalk.yellow(`semi-nexus install ${name}`) + chalk.blue(' to install'));
  } else {
    console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus sync') + chalk.blue(' to sync to Agents'));
  }

  console.log();
}
