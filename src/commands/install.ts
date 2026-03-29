import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { registry, Capability, InstalledCapability } from '../api/registry';
import { client } from '../api/client';

export async function install(name: string, options: { version?: string; force?: boolean } = {}): Promise<void> {
  console.log(chalk.blue(`\nInstalling ${name}...`));

  const capability = await registry.getCapability(name);

  if (!capability) {
    console.log(chalk.red(`\n✗ Capability '${name}' not found in registry`));
    console.log(chalk.yellow('Run "semi-nexus search <query>" to find capabilities'));
    return;
  }

  const isSubscribed = await registry.isSubscribed(capability.id);

  if (!isSubscribed) {
    console.log(chalk.red(`\n✗ You must subscribe to '${name}' before installing`));
    console.log(chalk.blue('Run: ') + chalk.yellow(`semi-nexus subscribe ${name}`));
    return;
  }

  const installDir = client.getSkillsDir();
  const capInstallDir = path.join(installDir, capability.name);
  const version = options.version || capability.version;

  if (await fs.pathExists(capInstallDir) && !options.force) {
    console.log(chalk.yellow(`\n⚠ ${capability.name} is already installed`));
    console.log(chalk.gray('Use --force to reinstall'));
    return;
  }

  try {
    await fs.ensureDir(installDir);
    await fs.ensureDir(capInstallDir);

    const manifest = {
      id: capability.id,
      name: capability.name,
      displayName: capability.displayName,
      version: version,
      type: capability.type,
      description: capability.description,
      installedAt: new Date().toISOString(),
      author: capability.author,
      repository: capability.repository
    };

    await fs.writeFile(
      path.join(capInstallDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    const readmeContent = `# ${capability.displayName}

${capability.description}

## Version
${version}

## Usage
This capability has been installed by SemiNexus CLI.

## Author
${capability.author || 'Unknown'}

## Repository
${capability.repository || 'N/A'}
`;

    await fs.writeFile(path.join(capInstallDir, 'README.md'), readmeContent, 'utf-8');

    const installedCap: InstalledCapability = {
      id: capability.id,
      name: capability.name,
      version: version,
      installedAt: new Date().toISOString(),
      installPath: capInstallDir,
      syncedAgents: []
    };

    await registry.markInstalled(installedCap);

    console.log(chalk.green(`\n✓ ${capability.displayName} installed successfully!`));
    console.log(chalk.blue('  Version: ') + version);
    console.log(chalk.blue('  Location: ') + capInstallDir);
    console.log(chalk.blue('\nRun: ') + chalk.yellow(`semi-nexus sync`) + chalk.blue(' to sync to Agent environments'));

  } catch (error) {
    console.log(chalk.red(`\n✗ Installation failed: ${error}`));
  }
}