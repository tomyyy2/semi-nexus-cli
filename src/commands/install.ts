import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { client, Capability, InstalledCapability } from '../api/client';
import { registry } from '../api/registry';
import { agentDetector } from '../api/agents';

export async function install(name: string, options: { 
  version?: string; 
  force?: boolean;
  autoSubscribe?: boolean;
  sync?: boolean;
} = {}): Promise<void> {
  console.log(chalk.blue(`\n📦 Installing ${name}...\n`));

  if (!client.isAuthenticated()) {
    console.log(chalk.yellow('⚠ You are not logged in. Installing from local cache only.'));
  }

  let capability: Capability | null = null;
  
  try {
    capability = await client.getCapability(name);
  } catch {
    // Ignore - will try local registry
  }

  if (!capability) {
    capability = await registry.getCapability(name) || null;
  }

  if (!capability) {
    console.log(chalk.red(`✗ Capability '${name}' not found.`));
    console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus search <query>') + chalk.blue(' to find capabilities'));
    process.exit(1);
  }

  const isSubscribed = await registry.isSubscribed(capability.id);
  
  if (!isSubscribed && client.isAuthenticated()) {
    if (options.autoSubscribe) {
      console.log(chalk.blue('📥 Auto-subscribing...'));
      try {
        await client.subscribeCapability(capability.id, capability.version);
        await registry.markSubscribed({
          capabilityId: capability.id,
          capabilityName: capability.name,
          version: capability.version,
          subscribedAt: new Date().toISOString(),
          status: 'active'
        });
        console.log(chalk.green('✓ Subscribed automatically'));
      } catch (error: any) {
        console.log(chalk.red(`✗ Auto-subscribe failed: ${error.message}`));
        process.exit(1);
      }
    } else {
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'subscribe',
          message: `You are not subscribed to '${name}'. Subscribe now?`,
          default: true
        }
      ]);
      
      if (answers.subscribe) {
        console.log(chalk.blue('📥 Subscribing...'));
        try {
          await client.subscribeCapability(capability.id, capability.version);
          await registry.markSubscribed({
            capabilityId: capability.id,
            capabilityName: capability.name,
            version: capability.version,
            subscribedAt: new Date().toISOString(),
            status: 'active'
          });
          console.log(chalk.green('✓ Subscribed successfully'));
        } catch (error: any) {
          console.log(chalk.red(`✗ Subscription failed: ${error.message}`));
          process.exit(1);
        }
      } else {
        console.log(chalk.yellow('⚠ Installation cancelled.'));
        console.log(chalk.blue('Run: ') + chalk.yellow(`semi-nexus subscribe ${name}`));
        process.exit(1);
      }
    }
  }

  const installDir = client.getSkillsDir();
  const capInstallDir = path.join(installDir, capability.name);
  const version = options.version || capability.version;

  if (await fs.pathExists(capInstallDir) && !options.force) {
    console.log(chalk.yellow(`⚠ ${capability.name} is already installed.`));
    console.log(chalk.gray('Use --force to reinstall'));
    return;
  }

  try {
    await fs.ensureDir(installDir);
    await fs.ensureDir(capInstallDir);

    let packageContent: any = null;
    
    if (client.isAuthenticated()) {
      try {
        packageContent = await client.downloadCapability(capability.id, version);
      } catch (error) {
        console.log(chalk.yellow('⚠ Could not download from server, using local cache.'));
      }
    }

    const manifest = {
      id: capability.id,
      name: capability.name,
      displayName: capability.displayName,
      version: version,
      type: capability.type,
      description: capability.description,
      installedAt: new Date().toISOString(),
      author: (capability as any).author?.name || 'Unknown',
      repository: (capability as any).repository || 'N/A',
      tags: capability.tags,
      category: capability.category
    };

    await fs.writeFile(
      path.join(capInstallDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    if (packageContent?.files) {
      for (const [fileName, content] of Object.entries(packageContent.files)) {
        await fs.writeFile(
          path.join(capInstallDir, fileName),
          content as string,
          'utf-8'
        );
      }
    } else {
      const readmeContent = `# ${capability.displayName}

${capability.description}

## Version
${version}

## Usage
This capability has been installed by SemiNexus CLI.

## Author
${(capability as any).author?.name || 'Unknown'}

## Repository
${(capability as any).repository || 'N/A'}

## Tags
${capability.tags.join(', ')}
`;

      await fs.writeFile(path.join(capInstallDir, 'README.md'), readmeContent, 'utf-8');

      const skillContent = `---
name: ${capability.name}
displayName: ${capability.displayName}
version: ${version}
description: ${capability.description}
tags: [${capability.tags.map(t => `"${t}"`).join(', ')}]
---

# ${capability.displayName}

${capability.description}

## Usage

This skill provides capabilities for ${capability.category?.primary || 'general'} tasks.
`;

      await fs.writeFile(path.join(capInstallDir, 'skill.md'), skillContent, 'utf-8');
    }

    const installedCap: InstalledCapability = {
      id: capability.id,
      name: capability.name,
      version: version,
      installedAt: new Date().toISOString(),
      installPath: capInstallDir,
      syncedAgents: []
    };

    await registry.markInstalled(installedCap);

    console.log(chalk.green(`\n✓ ${capability.displayName} installed successfully!\n`));
    console.log(chalk.cyan('  Version: ') + version);
    console.log(chalk.cyan('  Location: ') + capInstallDir);
    console.log(chalk.cyan('  Type: ') + capability.type);

    if (options.sync) {
      console.log(chalk.blue('\n🔄 Syncing to Agents...'));
      await syncToAgents(installedCap);
    } else {
      console.log(chalk.blue('\nNext steps:'));
      console.log(chalk.gray('  • ') + chalk.yellow('semi-nexus sync') + chalk.gray(' - Sync to Agent environments'));
      console.log(chalk.gray('  • ') + chalk.yellow('semi-nexus list') + chalk.gray(' - List installed capabilities'));
      console.log(chalk.gray('  • ') + chalk.yellow('semi-nexus verify ' + name) + chalk.gray(' - Check installation status'));
    }
    console.log();

  } catch (error: any) {
    console.log(chalk.red(`\n✗ Installation failed: ${error.message}`));
    process.exit(1);
  }
}

async function syncToAgents(cap: InstalledCapability): Promise<void> {
  const agents = await agentDetector.detectAll();
  const detectedAgents = agents.filter(a => a.detected);

  if (detectedAgents.length === 0) {
    console.log(chalk.yellow('⚠ No Agent environments detected.'));
    console.log(chalk.gray('Supported: Claude Code, OpenCode, OpenClaw'));
    return;
  }

  const isWindows = process.platform === 'win32';
  let successCount = 0;

  for (const agent of detectedAgents) {
    const targetPath = path.join(agent.skillPath, cap.name);
    
    try {
      await agentDetector.ensureSkillPath(agent.id);
      
      if (await fs.pathExists(targetPath)) {
        const stat = await fs.lstat(targetPath);
        if (stat.isSymbolicLink()) {
          await fs.unlink(targetPath);
        } else {
          await fs.remove(targetPath);
        }
      }

      if (agent.syncMode === 'copy') {
        await fs.copy(cap.installPath, targetPath);
      } else {
        if (isWindows) {
          await fs.symlink(cap.installPath, targetPath, 'junction');
        } else {
          await fs.symlink(cap.installPath, targetPath);
        }
      }

      if (!cap.syncedAgents.includes(agent.id)) {
        cap.syncedAgents.push(agent.id);
      }
      await registry.updateSyncStatus(cap.id, cap.syncedAgents);
      
      console.log(chalk.green(`  ✓ ${agent.name}`));
      successCount++;
    } catch (error: any) {
      console.log(chalk.red(`  ✗ ${agent.name}: ${error.message}`));
    }
  }

  if (successCount > 0) {
    console.log(chalk.green(`\n✓ Synced to ${successCount} Agent(s)\n`));
    printUsageGuide(detectedAgents);
  }
}

function printUsageGuide(agents: any[]): void {
  console.log(chalk.bold('📚 How to use:\n'));
  
  const claudeCode = agents.find(a => a.id === 'claude-code');
  if (claudeCode) {
    console.log(chalk.cyan('Claude Code:'));
    console.log(chalk.gray('  1. Start a new chat session'));
    console.log(chalk.gray('  2. Just ask Claude to use the skill\n'));
  }
  
  const opencode = agents.find(a => a.id === 'opencode');
  if (opencode) {
    console.log(chalk.cyan('OpenCode:'));
    console.log(chalk.gray('  1. Restart OpenCode'));
    console.log(chalk.gray('  2. Skills are auto-loaded\n'));
  }
  
  const openclaw = agents.find(a => a.id === 'openclaw');
  if (openclaw) {
    console.log(chalk.cyan('OpenClaw:'));
    console.log(chalk.gray('  Run: semi-nexus sync --configure\n'));
  }
}
