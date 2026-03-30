#!/usr/bin/env node

import { Command } from 'commander';
import { init } from './commands/init';
import { login } from './commands/login';
import { logout } from './commands/logout';
import { search } from './commands/search';
import { subscribe, listSubscriptions } from './commands/subscribe';
import { install } from './commands/install';
import { sync, syncStatus } from './commands/sync';
import { list } from './commands/list';
import { upgrade } from './commands/upgrade';
import { uninstall } from './commands/uninstall';
import { info } from './commands/info';
import { status } from './commands/status';
import { quickstart } from './commands/quickstart';
import { discover } from './commands/discover';
import { verify } from './commands/verify';
import { completion } from './commands/completion';

const program = new Command();

program
  .name('semi-nexus')
  .alias('snx')
  .description('Pure CLI tool for Agent capability hub - no web UI required')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize configuration')
  .option('-s, --server <url>', 'Server URL')
  .option('-f, --force', 'Force reinitialization')
  .action(init);

program
  .command('quickstart')
  .description('Interactive quick start guide')
  .action(quickstart);

program
  .command('discover')
  .description('Discover and browse capabilities')
  .action(discover);

program
  .command('login')
  .description('Login to registry')
  .option('-s, --server <url>', 'Server URL')
  .option('-k, --apikey <key>', 'Login with API Key')
  .option('-t, --auth-type <type>', 'Authentication type (local, ldap, ad)')
  .action(login);

program
  .command('logout')
  .description('Logout and clear credentials')
  .action(logout);

program
  .command('search <query>')
  .description('Search capabilities')
  .option('-t, --type <type>', 'Filter by type (skill, mcp, agent)')
  .option('-g, --tag <tag>', 'Filter by tag')
  .option('-o, --offline', 'Search in local cache only')
  .action(search);

program
  .command('subscribe <name>')
  .description('Subscribe to a capability')
  .option('-v, --version <version>', 'Specific version')
  .action(subscribe);

program
  .command('subscriptions')
  .description('List your subscriptions')
  .action(listSubscriptions);

program
  .command('install <name>')
  .description('Install a capability')
  .option('-v, --version <version>', 'Specific version')
  .option('-f, --force', 'Force reinstall')
  .option('-a, --auto-subscribe', 'Auto-subscribe if not subscribed')
  .option('-s, --sync', 'Sync to Agents after install')
  .action(install);

program
  .command('sync')
  .description('Sync capabilities to Agent environments')
  .option('-t, --to <agent>', 'Sync to specific agent')
  .option('-m, --mode <mode>', 'Sync mode: symlink or copy')
  .option('-c, --configure', 'Auto-configure agents (OpenClaw)')
  .option('-s, --status', 'Show sync status')
  .action(sync);

program
  .command('sync-status')
  .description('Show sync status')
  .action(syncStatus);

program
  .command('list')
  .description('List installed capabilities')
  .action(list);

program
  .command('upgrade [name]')
  .description('Upgrade capabilities')
  .option('-a, --all', 'Upgrade all capabilities')
  .action(upgrade);

program
  .command('uninstall <name>')
  .description('Uninstall a capability')
  .option('-y, --yes', 'Skip confirmation')
  .action(uninstall);

program
  .command('info <name>')
  .description('Show capability details')
  .action(info);

program
  .command('status')
  .description('Show connection status')
  .action(status);

program
  .command('verify <name>')
  .description('Verify capability installation')
  .action(verify);

program
  .command('completion [shell]')
  .description('Generate shell completion script')
  .option('-i, --install', 'Install completion script')
  .action(completion);

program.parse(process.argv);
