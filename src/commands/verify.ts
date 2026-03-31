import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { registry } from '../api/registry';
import { agentDetector } from '../api/agents';

export async function verify(name: string): Promise<void> {
  console.log(chalk.blue(`\n🔍 Verifying ${name}...\n`));

  const installed = await registry.getInstalled();
  const cap = installed.find(c => c.name === name);

  if (!cap) {
    console.log(chalk.red(`✗ Capability '${name}' is not installed.`));
    console.log(chalk.blue('\nRun: ') + chalk.yellow(`semi-nexus install ${name}`));
    process.exit(1);
  }

  console.log(chalk.bold('Local Installation:'));
  
  const localPath = cap.installPath;
  if (await fs.pathExists(localPath)) {
    console.log(chalk.green('  ✓ Directory exists'));
    
    const manifestPath = path.join(localPath, 'manifest.json');
    if (await fs.pathExists(manifestPath)) {
      console.log(chalk.green('  ✓ Manifest found'));
      try {
        const manifest = await fs.readJson(manifestPath);
        console.log(chalk.gray(`    Version: ${manifest.version}`));
      } catch (error) {
        console.log(chalk.yellow('  ⚠ Manifest is invalid'));
      }
    } else {
      console.log(chalk.yellow('  ⚠ No manifest found'));
    }

    const skillFiles = ['SKILL.md', 'skill.md', 'README.md'];
    let skillFileFound = false;
    for (const file of skillFiles) {
      if (await fs.pathExists(path.join(localPath, file))) {
        console.log(chalk.green(`  ✓ ${file} found`));
        skillFileFound = true;
        break;
      }
    }
    if (!skillFileFound) {
      console.log(chalk.yellow('  ⚠ No skill file found (SKILL.md, skill.md, or README.md)'));
    }

    const files = await fs.readdir(localPath);
    console.log(chalk.gray(`  Files: ${files.length} items`));
    
  } else {
    console.log(chalk.red('  ✗ Directory not found'));
    console.log(chalk.yellow('  The installation may be corrupted.'));
    console.log(chalk.blue('\n  Run: ') + chalk.yellow(`semi-nexus install ${name} --force`));
  }

  console.log();
  console.log(chalk.bold('Agent Environments:'));

  const agents = await agentDetector.detectAll();
  const detectedAgents = agents.filter(a => a.detected);

  if (detectedAgents.length === 0) {
    console.log(chalk.yellow('  ⚠ No Agent environments detected'));
    console.log(chalk.gray('  Supported: Claude Code, OpenCode, OpenClaw'));
  } else {
    for (const agent of detectedAgents) {
      const agentPath = path.join(agent.skillPath, name);
      
      console.log(chalk.cyan(`\n  ${agent.name}:`));
      
      if (await fs.pathExists(agentPath)) {
        console.log(chalk.green('    ✓ Installed'));
        console.log(chalk.gray(`    Path: ${agentPath}`));
        
        try {
          const stat = await fs.lstat(agentPath);
          if (stat.isSymbolicLink()) {
            const linkTarget = await fs.readlink(agentPath);
            console.log(chalk.gray(`    Type: Symlink → ${linkTarget}`));
          } else {
            console.log(chalk.gray('    Type: Directory (copy)'));
          }
        } catch (error) {
          console.log(chalk.gray('    Type: Directory'));
        }

        const skillFile = await findSkillFile(agentPath);
        if (skillFile) {
          console.log(chalk.green(`    ✓ ${skillFile} accessible`));
        } else {
          console.log(chalk.yellow('    ⚠ No skill file found'));
        }

        if (cap.syncedAgents.includes(agent.id)) {
          console.log(chalk.green('    ✓ Marked as synced'));
        } else {
          console.log(chalk.yellow('    ⚠ Not marked as synced in registry'));
        }
        
      } else {
        console.log(chalk.yellow('    ⚠ Not installed'));
        console.log(chalk.gray('    Run: semi-nexus sync'));
      }
    }
  }

  console.log();
  printUsageGuide(detectedAgents, name);
}

async function findSkillFile(dir: string): Promise<string | null> {
  const files = ['SKILL.md', 'skill.md', 'README.md'];
  for (const file of files) {
    if (await fs.pathExists(path.join(dir, file))) {
      return file;
    }
  }
  return null;
}

interface AgentInfo {
  id: string;
  name: string;
  detected: boolean;
  skillPath: string;
  syncMode: 'symlink' | 'copy';
  installPath: string;
}

function printUsageGuide(agents: AgentInfo[], skillName: string): void {
  console.log(chalk.bold('💡 How to use:\n'));
  
  const claudeCode = agents.find(a => a.id === 'claude-code' && a.detected);
  if (claudeCode) {
    console.log(chalk.cyan('Claude Code:'));
    console.log(chalk.gray('  1. Restart Claude Code or start a new session'));
    console.log(chalk.gray('  2. The skill will be automatically loaded'));
    console.log(chalk.gray(`  3. Ask Claude to use "${skillName}" capabilities`));
    console.log();
  }
  
  const opencode = agents.find(a => a.id === 'opencode' && a.detected);
  if (opencode) {
    console.log(chalk.cyan('OpenCode:'));
    console.log(chalk.gray('  1. Restart OpenCode'));
    console.log(chalk.gray('  2. Skills are auto-loaded from ~/.opencode/skills/'));
    console.log();
  }
  
  const openclaw = agents.find(a => a.id === 'openclaw' && a.detected);
  if (openclaw) {
    console.log(chalk.cyan('OpenClaw:'));
    console.log(chalk.gray('  1. Edit ~/.openclaw/config.yaml'));
    console.log(chalk.gray('  2. Add to enabled plugins:'));
    console.log(chalk.gray('     plugins:'));
    console.log(chalk.gray('       enabled:'));
    console.log(chalk.gray(`         - ${skillName}`));
    console.log(chalk.gray('  3. Restart OpenClaw'));
    console.log();
  }
  
  if (!claudeCode && !opencode && !openclaw) {
    console.log(chalk.gray('  No Agent environments detected.'));
    console.log(chalk.gray('  Install Claude Code, OpenCode, or OpenClaw to use skills.'));
    console.log();
  }
}
