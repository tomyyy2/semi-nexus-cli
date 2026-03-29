import chalk from 'chalk';
import { client } from '../api/client';
import { agentDetector } from '../api/agents';
import { registry } from '../api/registry';

export async function status(): Promise<void> {
  console.log(chalk.blue('\n📊 SemiNexus CLI Status\n'));

  const config = client.getConfig();
  
  console.log(chalk.bold('Server'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(chalk.cyan('  URL: ') + config.server.url);

  let serverStatus = 'Unknown';
  let serverConnected = false;
  try {
    const statusInfo = await client.getStatus();
    serverStatus = statusInfo.connected ? chalk.green('Connected') : chalk.red('Disconnected');
    serverConnected = statusInfo.connected;
  } catch (error) {
    serverStatus = chalk.red('Disconnected');
  }
  console.log(chalk.cyan('  Status: ') + serverStatus);

  console.log();
  console.log(chalk.bold('Authentication'));
  console.log(chalk.gray('─'.repeat(40)));
  
  const isAuthenticated = client.isAuthenticated();
  if (isAuthenticated) {
    console.log(chalk.cyan('  Status: ') + chalk.green('Logged in'));
    console.log(chalk.cyan('  User: ') + (config.auth.username || 'Unknown'));
    console.log(chalk.cyan('  Expires: ') + (config.auth.expiresAt ? new Date(config.auth.expiresAt).toLocaleString() : 'Unknown'));
  } else {
    console.log(chalk.cyan('  Status: ') + chalk.yellow('Not logged in'));
  }

  console.log();
  console.log(chalk.bold('Installation'));
  console.log(chalk.gray('─'.repeat(40)));
  
  const installed = await registry.getInstalled();
  const subscriptions = await registry.getSubscriptions();
  
  console.log(chalk.cyan('  Base Dir: ') + config.install.baseDir);
  console.log(chalk.cyan('  Skills Dir: ') + config.install.skillsDir);
  console.log(chalk.cyan('  Installed: ') + `${installed.length} capability(ies)`);
  console.log(chalk.cyan('  Subscriptions: ') + `${subscriptions.length} active`);

  console.log();
  console.log(chalk.bold('Agent Environments'));
  console.log(chalk.gray('─'.repeat(40)));
  
  const agents = await agentDetector.detectAll();
  for (const agent of agents) {
    const status = agent.detected ? chalk.green('✓ Detected') : chalk.gray('✗ Not found');
    console.log(`  ${agent.name}: ${status}`);
    if (agent.detected) {
      console.log(chalk.gray(`    Path: ${agent.installPath}`));
    }
  }

  console.log();

  if (!isAuthenticated) {
    console.log(chalk.yellow('💡 Tip: Run ') + chalk.cyan('semi-nexus login') + chalk.yellow(' to authenticate.'));
  } else if (installed.length === 0) {
    console.log(chalk.yellow('💡 Tip: Run ') + chalk.cyan('semi-nexus search <query>') + chalk.yellow(' to find capabilities.'));
  } else {
    const unsynced = installed.filter(cap => cap.syncedAgents.length === 0);
    if (unsynced.length > 0) {
      console.log(chalk.yellow('💡 Tip: Run ') + chalk.cyan('semi-nexus sync') + chalk.yellow(' to sync capabilities to agents.'));
    }
  }

  console.log();
}
