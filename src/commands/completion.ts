import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const COMMANDS = [
  'init', 'quickstart', 'discover', 'login', 'logout', 'search', 
  'subscribe', 'install', 'sync', 'list', 'upgrade', 'uninstall', 
  'info', 'status', 'verify', 'completion', 'config'
];

const OPTIONS: Record<string, string[]> = {
  init: ['--server', '-s', '--force', '-f'],
  login: ['--server', '--apikey', '--username', '--password'],
  install: ['--version', '-v', '--force', '-f', '--auto-subscribe', '-a', '--sync', '-s'],
  search: ['--type', '--tag', '--limit'],
  subscribe: ['--version'],
  sync: ['--configure', '--status'],
  list: ['--installed', '--subscriptions'],
  uninstall: ['--yes'],
  upgrade: ['--all'],
  config: ['--set', '--get', '--list']
};

export async function completion(shell?: string, options: { install?: boolean } = {}): Promise<void> {
  if (options.install) {
    await installCompletion();
    return;
  }

  const targetShell = shell || detectShell();
  
  switch (targetShell) {
    case 'bash':
      printBashCompletion();
      break;
    case 'zsh':
      printZshCompletion();
      break;
    case 'fish':
      printFishCompletion();
      break;
    case 'csh':
      printCshCompletion();
      break;
    default:
      console.log(chalk.yellow(`Unknown shell: ${targetShell}`));
      console.log(chalk.gray('Supported shells: bash, zsh, fish, csh'));
  }
}

function detectShell(): string {
  const shell = process.env.SHELL || '';
  if (shell.includes('bash')) return 'bash';
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('fish')) return 'fish';
  if (shell.includes('csh') || shell.includes('tcsh')) return 'csh';
  return 'bash';
}

async function installCompletion(): Promise<void> {
  const shell = detectShell();
  const home = os.homedir();
  
  console.log(chalk.blue(`\n🔧 Installing completion for ${shell}...\n`));

  let targetFile = '';
  let completionScript = '';

  switch (shell) {
    case 'bash':
      targetFile = path.join(home, '.bash_completion.d', 'semi-nexus');
      completionScript = generateBashCompletion();
      break;
    case 'zsh':
      targetFile = path.join(home, '.zsh', 'completions', '_semi-nexus');
      completionScript = generateZshCompletion();
      break;
    case 'fish':
      targetFile = path.join(home, '.config', 'fish', 'completions', 'semi-nexus.fish');
      completionScript = generateFishCompletion();
      break;
    case 'csh':
      targetFile = path.join(home, '.semi-nexus-completion.csh');
      completionScript = generateCshCompletion();
      break;
  }

  try {
    await fs.ensureDir(path.dirname(targetFile));
    await fs.writeFile(targetFile, completionScript);
    
    console.log(chalk.green('✓ Completion script installed'));
    console.log(chalk.cyan('  Location: ') + targetFile);
    console.log();
    
    if (shell === 'csh') {
      console.log(chalk.yellow('To enable, add to your ~/.cshrc:'));
      console.log(chalk.gray(`  source ${targetFile}`));
      console.log();
      console.log(chalk.gray('Then run: source ~/.cshrc'));
    } else if (shell === 'bash') {
      console.log(chalk.gray('Restart your shell or run: source ~/.bashrc'));
    } else if (shell === 'zsh') {
      console.log(chalk.gray('Restart your shell or run: exec zsh'));
    } else if (shell === 'fish') {
      console.log(chalk.gray('Completion will be available in new fish sessions'));
    }
    console.log();
    
  } catch (error: any) {
    console.log(chalk.red(`✗ Failed to install: ${error.message}`));
    console.log(chalk.yellow('\nYou can manually add the completion script:'));
    console.log(chalk.gray(`  semi-nexus completion ${shell} >> <completion-file>`));
  }
}

function printBashCompletion(): void {
  console.log(generateBashCompletion());
}

function printZshCompletion(): void {
  console.log(generateZshCompletion());
}

function printFishCompletion(): void {
  console.log(generateFishCompletion());
}

function printCshCompletion(): void {
  console.log(generateCshCompletion());
}

function generateBashCompletion(): string {
  return `# semi-nexus completion for bash
_semi_nexus_completion() {
  local cur prev words cword
  _init_completion || return

  if [[ \${cword} -eq 1 ]]; then
    COMPREPLY=($(compgen -W "${COMMANDS.join(' ')}" -- "\${cur}"))
    return
  fi

  local command="\${words[1]}"
  case "\${command}" in
    install)
      if [[ "\${cur}" == -* ]]; then
        COMPREPLY=($(compgen -W "${OPTIONS.install?.join(' ') || ''}" -- "\${cur}"))
      fi
      ;;
    search)
      if [[ "\${cur}" == -* ]]; then
        COMPREPLY=($(compgen -W "${OPTIONS.search?.join(' ') || ''}" -- "\${cur}"))
      fi
      ;;
    sync)
      if [[ "\${cur}" == -* ]]; then
        COMPREPLY=($(compgen -W "${OPTIONS.sync?.join(' ') || ''}" -- "\${cur}"))
      fi
      ;;
  esac
}

complete -F _semi_nexus_completion semi-nexus
`;
}

function generateZshCompletion(): string {
  return `#compdef semi-nexus

_semi_nexus() {
  local -a commands
  commands=(
    'init:Initialize configuration'
    'quickstart:Interactive quick start guide'
    'discover:Discover and browse capabilities'
    'login:Login to registry'
    'logout:Logout from registry'
    'search:Search for capabilities'
    'subscribe:Subscribe to a capability'
    'install:Install a capability'
    'sync:Sync capabilities to agent environments'
    'list:List installed capabilities'
    'upgrade:Upgrade a capability'
    'uninstall:Uninstall a capability'
    'info:Show capability details'
    'status:Show system status'
    'verify:Verify capability installation'
    'completion:Generate shell completion'
    'config:Manage configuration'
  )

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi

  case "\${words[2]}" in
    install)
      _arguments \\
        '--version[Specific version]:version' \\
        '--force[Force reinstall]' \\
        '--auto-subscribe[Auto-subscribe if not subscribed]' \\
        '--sync[Sync to Agents after install]'
      ;;
    search)
      _arguments \\
        '--type[Filter by type]:type:(skill mcp agent)' \\
        '--tag[Filter by tag]:tag' \\
        '--limit[Limit results]:number'
      ;;
    sync)
      _arguments \\
        '--configure[Auto-configure agents]' \\
        '--status[Show sync status]'
      ;;
  esac
}

_semi_nexus
`;
}

function generateFishCompletion(): string {
  return `# semi-nexus completion for fish

complete -c semi-nexus -f

complete -c semi-nexus -n __fish_use_subcommand -a 'init' -d 'Initialize configuration'
complete -c semi-nexus -n __fish_use_subcommand -a 'quickstart' -d 'Interactive quick start guide'
complete -c semi-nexus -n __fish_use_subcommand -a 'discover' -d 'Discover and browse capabilities'
complete -c semi-nexus -n __fish_use_subcommand -a 'login' -d 'Login to registry'
complete -c semi-nexus -n __fish_use_subcommand -a 'logout' -d 'Logout from registry'
complete -c semi-nexus -n __fish_use_subcommand -a 'search' -d 'Search for capabilities'
complete -c semi-nexus -n __fish_use_subcommand -a 'subscribe' -d 'Subscribe to a capability'
complete -c semi-nexus -n __fish_use_subcommand -a 'install' -d 'Install a capability'
complete -c semi-nexus -n __fish_use_subcommand -a 'sync' -d 'Sync capabilities to agents'
complete -c semi-nexus -n __fish_use_subcommand -a 'list' -d 'List installed capabilities'
complete -c semi-nexus -n __fish_use_subcommand -a 'upgrade' -d 'Upgrade a capability'
complete -c semi-nexus -n __fish_use_subcommand -a 'uninstall' -d 'Uninstall a capability'
complete -c semi-nexus -n __fish_use_subcommand -a 'info' -d 'Show capability details'
complete -c semi-nexus -n __fish_use_subcommand -a 'status' -d 'Show system status'
complete -c semi-nexus -n __fish_use_subcommand -a 'verify' -d 'Verify installation'
complete -c semi-nexus -n __fish_use_subcommand -a 'completion' -d 'Generate shell completion'

complete -c semi-nexus -n '__fish_seen_subcommand_from install' -l version -d 'Specific version'
complete -c semi-nexus -n '__fish_seen_subcommand_from install' -l force -d 'Force reinstall'
complete -c semi-nexus -n '__fish_seen_subcommand_from install' -l auto-subscribe -d 'Auto-subscribe'
complete -c semi-nexus -n '__fish_seen_subcommand_from install' -l sync -d 'Sync after install'

complete -c semi-nexus -n '__fish_seen_subcommand_from search' -l type -d 'Filter by type'
complete -c semi-nexus -n '__fish_seen_subcommand_from search' -l tag -d 'Filter by tag'
complete -c semi-nexus -n '__fish_seen_subcommand_from search' -l limit -d 'Limit results'

complete -c semi-nexus -n '__fish_seen_subcommand_from sync' -l configure -d 'Auto-configure'
complete -c semi-nexus -n '__fish_seen_subcommand_from sync' -l status -d 'Show status'
`;
}

function generateCshCompletion(): string {
  return `# semi-nexus completion for csh/tcsh
# Add to ~/.cshrc and run: source ~/.cshrc

set complete=enhance

complete semi-nexus 'p/1/(init quickstart discover login logout search subscribe install sync list upgrade uninstall info status verify completion config)/'

complete semi-nexus 'p/2/(--version --force --auto-subscribe --sync)/' 'n/install/'

complete semi-nexus 'p/2/(--type --tag --limit)/' 'n/search/'

complete semi-nexus 'p/2/(--configure --status)/' 'n/sync/'

# For bash-style completion (if using tcsh)
if ($?tcsh) then
  set complete=enhance
endif

# Alternative: simple alias-based completion
# alias semi-nexus 'semi-nexus !*'
`;
}
