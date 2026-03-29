import chalk from 'chalk';
import { registry } from '../api/registry';

export async function search(
  query: string,
  options: { type?: string; tag?: string } = {}
): Promise<void> {
  console.log(chalk.blue(`\nSearching for: "${query}"\n`));

  const results = await registry.searchCapabilities(query, options);

  if (results.length === 0) {
    console.log(chalk.yellow('No capabilities found.'));
    console.log(chalk.gray('Try different keywords or remove filters.'));
    return;
  }

  console.log(chalk.green(`Found ${results.length} capability(s):\n`));
  console.log('─'.repeat(60));

  for (const cap of results) {
    const stars = '★'.repeat(Math.round(cap.statistics.rating));

    console.log(chalk.bold `\n${cap.displayName}`);
    console.log(chalk.cyan `  [${cap.type}]`);
    console.log(`  ${cap.description}`);
    console.log(chalk.gray `  Tags: ${cap.tags.join(', ')}`);
    console.log(chalk.gray `  Version: ${cap.version} | Downloads: ${cap.statistics.downloads}`);
    console.log(chalk.yellow `  Rating: ${stars} (${cap.statistics.ratingCount})`);
    console.log('─'.repeat(60));
  }

  console.log(chalk.blue('\nRun: ') + chalk.yellow('semi-nexus subscribe <name>') + chalk.blue(' to subscribe'));
  console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus install <name>') + chalk.blue(' to install\n'));
}