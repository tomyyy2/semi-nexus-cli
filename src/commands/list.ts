import chalk from 'chalk';
import { registry } from '../api/registry';
import { client } from '../api/client';

export async function list(): Promise<void> {
  console.log(chalk.blue('\n📋 Installed Capabilities\n'));

  const installed = await registry.getInstalled();

  if (installed.length === 0) {
    console.log(chalk.yellow('No capabilities installed yet.'));
    console.log(chalk.blue('\nRun: ') + chalk.yellow('semi-nexus search <query>') + chalk.blue(' to find capabilities'));
    console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus install <name>') + chalk.blue(' to install'));
    return;
  }

  console.log(chalk.gray('─'.repeat(60)));

  for (const cap of installed) {
    const capability = await registry.getCapability(cap.name);
    
    console.log(chalk.bold `\n${capability?.displayName || cap.name}`);
    console.log(chalk.cyan `  [${capability?.type || 'unknown'}] ${chalk.gray(`v${cap.version}`)}`);
    
    if (capability?.description) {
      console.log(`  ${capability.description}`);
    }
    
    console.log(chalk.gray `  Installed: ${new Date(cap.installedAt).toLocaleDateString()}`);
    console.log(chalk.gray `  Location: ${cap.installPath}`);
    
    if (cap.syncedAgents.length > 0) {
      console.log(chalk.green `  Synced: ${cap.syncedAgents.join(', ')}`);
    } else {
      console.log(chalk.yellow `  Synced: Not synced`);
    }
    
    console.log(chalk.gray('─'.repeat(60)));
  }

  console.log(chalk.blue('\nTotal: ') + `${installed.length} capability(ies) installed`);
  console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus sync') + chalk.blue(' to sync to Agents'));
  console.log();
}
