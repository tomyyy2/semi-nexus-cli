#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { init } from './commands/init';
import { login } from './commands/login';
import { logout } from './commands/logout';
import { search } from './commands/search';
import { subscribe } from './commands/subscribe';
import { install } from './commands/install';
import { sync } from './commands/sync';
import { list } from './commands/list';
import { upgrade } from './commands/upgrade';
import { uninstall } from './commands/uninstall';
import { info } from './commands/info';
import { status } from './commands/status';

const program = new Command();

program
  .name('semi-nexus')
  .alias('snx')
  .description('Pure CLI tool for Agent capability hub - no web UI required')
  .version('0.1.0');

program.command('init').description('Initialize configuration').action(init);
program.command('login').description('Login to registry').action(login);
program.command('logout').description('Logout and clear credentials').action(logout);
program.command('search <query>').description('Search capabilities').action(search);
program.command('subscribe <name>').description('Subscribe to a capability').action(subscribe);
program.command('install <name>').description('Install a capability').action(install);
program.command('sync').description('Sync to Agent environments').action(sync);
program.command('list').description('List installed capabilities').action(list);
program.command('upgrade [name]').description('Upgrade capabilities').action(upgrade);
program.command('uninstall <name>').description('Uninstall a capability').action(uninstall);
program.command('info <name>').description('Show capability details').action(info);
program.command('status').description('Show connection status').action(status);

program.parse(process.argv);