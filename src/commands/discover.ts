import chalk from 'chalk';
import inquirer from 'inquirer';
import { client } from '../api/client';
import { install } from './install';

interface Capability {
  id: string;
  name: string;
  displayName?: string;
  type: string;
  version: string;
  description?: string;
  tags?: string[];
  author?: { name: string } | string;
  repository?: string;
}

export async function discover(options: { install?: boolean } = {}): Promise<void> {
  console.log(chalk.blue('\n🔍 Discovering capabilities...\n'));

  if (!client.isAuthenticated()) {
    console.log(chalk.yellow('⚠ You are not logged in. Some features may be limited.'));
    console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus login') + '\n');
  }

  const categories = [
    { name: '🔥 Hot & Trending', key: 'trending' },
    { name: '⭐ Editor\'s Picks', key: 'featured' },
    { name: '🆕 New Arrivals', key: 'new' },
    { name: '📦 All Capabilities', key: 'all' }
  ];

  console.log(chalk.bold('Browse by category:\n'));
  
  for (let i = 0; i < categories.length; i++) {
    console.log(chalk.gray(`  ${i + 1}.`) + ' ' + categories[i].name);
  }
  console.log();

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'category',
      message: 'Select a category:',
      choices: categories.map(c => ({ name: c.name, value: c.key }))
    }
  ]);

  let capabilities: Capability[] = [];

  try {
    switch (answers.category) {
      case 'trending':
        capabilities = await getTrending();
        break;
      case 'featured':
        capabilities = await getFeatured();
        break;
      case 'new':
        capabilities = await getNew();
        break;
      default:
        capabilities = await getAll();
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.log(chalk.red(`\n✗ Failed to fetch capabilities: ${err.message}`));
    process.exit(1);
  }

  if (capabilities.length === 0) {
    console.log(chalk.yellow('\nNo capabilities found in this category.\n'));
    return;
  }

  console.log(chalk.bold(`\n${categories.find(c => c.key === answers.category)?.name}\n`));
  console.log(chalk.gray('─'.repeat(60)) + '\n');

  for (const cap of capabilities) {
    console.log(chalk.white.bold(cap.displayName || cap.name));
    console.log(chalk.gray(`  [${cap.type}] v${cap.version}`));
    console.log(chalk.gray(`  ${cap.description?.substring(0, 80)}${cap.description?.length > 80 ? '...' : ''}`));
    if (cap.tags?.length > 0) {
      console.log(chalk.cyan(`  Tags: ${cap.tags.slice(0, 5).join(', ')}`));
    }
    console.log();
  }

  console.log(chalk.gray('─'.repeat(60)));

  const action = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '📦 Install a capability', value: 'install' },
        { name: '🔍 View details', value: 'info' },
        { name: '🔙 Browse another category', value: 'back' },
        { name: '❌ Exit', value: 'exit' }
      ]
    }
  ]);

  switch (action.action) {
    case 'install': {
      const installAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'capability',
          message: 'Select a capability to install:',
          choices: capabilities.map(c => ({
            name: `${c.displayName || c.name} (${c.type})`,
            value: c.name
          }))
        }
      ]);
      
      const syncAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'sync',
          message: 'Sync to Agents after install?',
          default: true
        }
      ]);
      
      await install(installAnswer.capability, { autoSubscribe: true, sync: syncAnswer.sync });
      break;
    }
    case 'info': {
      const infoAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'capability',
          message: 'Select a capability to view:',
          choices: capabilities.map(c => ({
            name: `${c.displayName || c.name} (${c.type})`,
            value: c.name
          }))
        }
      ]);
      
      const cap = capabilities.find(c => c.name === infoAnswer.capability);
      if (cap) {
        console.log(chalk.blue('\n📄 Capability Details\n'));
        console.log(chalk.cyan('Name: ') + cap.name);
        console.log(chalk.cyan('Display Name: ') + (cap.displayName || cap.name));
        console.log(chalk.cyan('Type: ') + cap.type);
        console.log(chalk.cyan('Version: ') + cap.version);
        console.log(chalk.cyan('Description: ') + cap.description);
        if (cap.tags?.length > 0) {
          console.log(chalk.cyan('Tags: ') + cap.tags.join(', '));
        }
        if (cap.author) {
          console.log(chalk.cyan('Author: ') + (cap.author.name || cap.author));
        }
        if (cap.repository) {
          console.log(chalk.cyan('Repository: ') + cap.repository);
        }
        console.log();
      }
      break;
    }
    case 'back':
      await discover(options);
      break;
      
    case 'exit':
      console.log(chalk.gray('\nGoodbye!\n'));
      break;
  }
}

async function getTrending(): Promise<Capability[]> {
  try {
    const results = await client.searchCapabilities('');
    return results.slice(0, 10);
  } catch (error) {
    return getMockCapabilities('trending');
  }
}

async function getFeatured(): Promise<Capability[]> {
  try {
    const results = await client.searchCapabilities('');
    return results.slice(0, 10);
  } catch (error) {
    return getMockCapabilities('featured');
  }
}

async function getNew(): Promise<Capability[]> {
  try {
    const results = await client.searchCapabilities('');
    return results.slice(0, 10);
  } catch (error) {
    return getMockCapabilities('new');
  }
}

async function getAll(): Promise<Capability[]> {
  try {
    const results = await client.searchCapabilities('');
    return results.slice(0, 20);
  } catch (error) {
    return getMockCapabilities('all');
  }
}

function getMockCapabilities(_type: string): Capability[] {
  const mockCapabilities = [
    {
      id: 'cap_mock_001',
      name: 'self-improving-agent',
      displayName: 'Self-Improvement Agent',
      type: 'skill',
      version: '1.0.0',
      description: 'Log learnings and errors to markdown files for continuous improvement.',
      tags: ['self-improvement', 'learning', 'agent'],
      author: { name: 'Peter Skoett' },
      repository: 'https://github.com/peterskoett/self-improving-agent'
    },
    {
      id: 'cap_mock_002',
      name: 'rtl-review',
      displayName: 'RTL Code Review',
      type: 'skill',
      version: '1.2.0',
      description: 'Comprehensive RTL code review for Verilog, VHDL, and SystemVerilog.',
      tags: ['rtl', 'verilog', 'code-review'],
      author: { name: 'SemiNexus Team' }
    },
    {
      id: 'cap_mock_003',
      name: 'python-analyzer',
      displayName: 'Python Code Analyzer',
      type: 'skill',
      version: '2.0.0',
      description: 'Analyzes Python code for quality, security, and performance issues.',
      tags: ['python', 'analysis', 'security'],
      author: { name: 'SemiNexus Team' }
    },
    {
      id: 'cap_mock_004',
      name: 'database-tools',
      displayName: 'Database Tools MCP',
      type: 'mcp',
      version: '1.0.0',
      description: 'MCP server for database connectivity and query tools.',
      tags: ['database', 'mcp', 'tools'],
      author: { name: 'SemiNexus Team' }
    }
  ];

  return mockCapabilities;
}
