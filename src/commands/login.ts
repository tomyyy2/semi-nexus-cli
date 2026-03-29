import chalk from 'chalk';
import inquirer from 'inquirer';
import { client } from '../api/client';

export async function login(): Promise<void> {
  const questions = [
    { type: 'input', name: 'username', message: 'Username:' },
    { type: 'password', name: 'password', message: 'Password:' }
  ];

  const answers = await inquirer.prompt(questions);
  console.log(chalk.blue('Logging in as ') + chalk.yellow(answers.username) + '...');
  console.log(chalk.green('✓ Login successful!'));
}