import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { registry } from '../api/registry';
import { client } from '../api/client';

export async function upgrade(name?: string, options: { all?: boolean } = {}): Promise<void> {
  console.log(chalk.blue('\n⬆️  Upgrading capabilities...\n'));

  const installed = await registry.getInstalled();

  if (installed.length === 0) {
    console.log(chalk.yellow('No capabilities installed.'));
    return;
  }

  if (options.all) {
    console.log(chalk.cyan('Upgrading all capabilities...\n'));
    
    for (const cap of installed) {
      await upgradeCapability(cap.name);
    }
    
    console.log(chalk.green('\n✓ All capabilities upgraded!'));
    return;
  }

  if (name) {
    await upgradeCapability(name);
  } else {
    const { selected } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selected',
        message: 'Select capabilities to upgrade:',
        choices: installed.map(cap => ({
          name: `${cap.name} (v${cap.version})`,
          value: cap.name
        }))
      }
    ]);

    if (selected.length === 0) {
      console.log(chalk.yellow('No capabilities selected.'));
      return;
    }

    for (const capName of selected) {
      await upgradeCapability(capName);
    }
  }

  console.log(chalk.green('\n✓ Upgrade complete!'));
}

async function upgradeCapability(name: string): Promise<void> {
  const installed = await registry.getInstalled();
  const cap = installed.find(c => c.name === name);

  if (!cap) {
    console.log(chalk.red(`✗ '${name}' is not installed.`));
    return;
  }

  console.log(chalk.cyan(`Checking ${name}...`));

  try {
    const latest = await client.getCapability(name);
    
    if (!latest) {
      console.log(chalk.yellow(`  ⚠ Could not fetch latest version info for ${name}`));
      return;
    }

    if (latest.version === cap.version) {
      console.log(chalk.gray(`  ✓ ${name} is already up to date (v${cap.version})`));
      return;
    }

    console.log(chalk.blue(`  Upgrading ${name}: v${cap.version} → v${latest.version}`));

    const installDir = client.getSkillsDir();
    const capInstallDir = path.join(installDir, name);

    await fs.remove(capInstallDir);
    await fs.ensureDir(capInstallDir);

    const manifest = {
      id: latest.id,
      name: latest.name,
      displayName: latest.displayName,
      version: latest.version,
      type: latest.type,
      description: latest.description,
      installedAt: new Date().toISOString(),
      upgradedFrom: cap.version,
      author: latest.author?.name || 'Unknown',
      repository: latest.repository || 'N/A',
      tags: latest.tags,
      category: latest.category
    };

    await fs.writeFile(
      path.join(capInstallDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    cap.version = latest.version;
    cap.installedAt = new Date().toISOString();
    cap.syncedAgents = [];
    await registry.markInstalled(cap);

    console.log(chalk.green(`  ✓ Upgraded ${name} to v${latest.version}`));

  } catch (error: unknown) {
    const err = error as Error;
    console.log(chalk.red(`  ✗ Failed to upgrade ${name}: ${err.message}`));
  }
}
