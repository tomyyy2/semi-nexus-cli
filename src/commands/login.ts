import chalk from 'chalk';
import inquirer from 'inquirer';
import { client } from '../api/client';

export async function login(options: { server?: string; apikey?: string; authType?: string } = {}): Promise<void> {
  console.log(chalk.blue('\n🔐 SemiNexus CLI Login\n'));

  if (options.server) {
    client.setServerUrl(options.server);
    console.log(chalk.gray(`Server: ${options.server}`));
  }

  const config = client.getConfig();
  console.log(chalk.gray(`Server URL: ${config.server.url}\n`));

  if (options.apikey) {
    console.log(chalk.blue('Logging in with API Key...'));
    try {
      await client.loginWithApiKey(options.apikey);
      console.log(chalk.green('\n✓ Login successful with API Key!'));
      console.log(chalk.blue('  Run: ') + chalk.yellow('semi-nexus status') + chalk.blue(' to verify'));
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: string } } };
      console.log(chalk.red(`\n✗ Login failed: ${err.response?.data?.error || err.message}`));
      process.exit(1);
    }
    return;
  }

  const questions = [
    {
      type: 'input',
      name: 'username',
      message: 'Username:',
      validate: (input: string) => input.length > 0 || 'Username is required'
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      mask: '*',
      validate: (input: string) => input.length > 0 || 'Password is required'
    },
    {
      type: 'list',
      name: 'authType',
      message: 'Authentication type:',
      choices: [
        { name: 'Local', value: 'local' },
        { name: 'LDAP', value: 'ldap' },
        { name: 'Active Directory', value: 'ad' }
      ],
      default: options.authType || 'local'
    }
  ];

  try {
    const answers = await inquirer.prompt(questions);
    
    console.log(chalk.blue('\nLogging in as ') + chalk.yellow(answers.username) + '...');
    
    const tokens = await client.login(answers.username, answers.password, answers.authType);
    
    console.log(chalk.green('\n✓ Login successful!'));
    console.log(chalk.cyan('  Username: ') + answers.username);
    console.log(chalk.cyan('  Auth Type: ') + answers.authType);
    console.log(chalk.cyan('  Token expires in: ') + `${Math.floor(tokens.expiresIn / 60)} minutes`);
    console.log(chalk.blue('\nRun: ') + chalk.yellow('semi-nexus status') + chalk.blue(' to verify'));
    console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus search <query>') + chalk.blue(' to find capabilities'));
    
  } catch (error: unknown) {
    const err = error as Error & { response?: { data?: { error?: string } } };
    const errorMessage = err.response?.data?.error || err.message;
    console.log(chalk.red(`\n✗ Login failed: ${errorMessage}`));
    
    if (errorMessage.includes('locked')) {
      console.log(chalk.yellow('  Please wait a few minutes before trying again.'));
    } else if (errorMessage.includes('Invalid credentials')) {
      console.log(chalk.yellow('  Please check your username and password.'));
    }
    
    process.exit(1);
  }
}
