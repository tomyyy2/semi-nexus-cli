import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { client, Capability, InstalledCapability } from '../api/client';
import { registry } from '../api/registry';

export async function install(name: string, options: { version?: string; force?: boolean } = {}): Promise<void> {
  console.log(chalk.blue(`\n📦 Installing ${name}...\n`));

  if (!client.isAuthenticated()) {
    console.log(chalk.yellow('⚠ You are not logged in. Installing from local cache only.'));
  }

  let capability: Capability | null = null;
  
  try {
    capability = await client.getCapability(name);
  } catch (error) {
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
    console.log(chalk.yellow(`⚠ You are not subscribed to '${name}'.`));
    console.log(chalk.blue('Run: ') + chalk.yellow(`semi-nexus subscribe ${name}`));
    process.exit(1);
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
    
    console.log(chalk.blue('\nNext steps:'));
    console.log(chalk.gray('  • ') + chalk.yellow('semi-nexus sync') + chalk.gray(' - Sync to Agent environments'));
    console.log(chalk.gray('  • ') + chalk.yellow('semi-nexus list') + chalk.gray(' - List installed capabilities'));
    console.log();

  } catch (error: any) {
    console.log(chalk.red(`\n✗ Installation failed: ${error.message}`));
    process.exit(1);
  }
}
