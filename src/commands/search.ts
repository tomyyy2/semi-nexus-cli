import chalk from 'chalk';
import { client } from '../api/client';
import { Capability } from '../api/client';

export async function search(
  query: string,
  options: { type?: string; tag?: string; offline?: boolean } = {}
): Promise<void> {
  console.log(chalk.blue(`\n🔍 Searching for: "${query}"\n`));

  if (!client.isAuthenticated()) {
    console.log(chalk.yellow('⚠ You are not logged in. Some results may be limited.'));
    console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus login') + chalk.blue(' to access all features\n'));
  }

  let results: Capability[] = [];

  try {
    results = await client.searchCapabilities(query, { type: options.type, tag: options.tag });
  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      console.log(chalk.yellow('⚠ Cannot connect to server. Use --offline for local cache.'));
      return;
    }
    throw err;
  }

  if (results.length === 0) {
    console.log(chalk.yellow('No capabilities found.'));
    console.log(chalk.gray('Try different keywords or remove filters.'));
    return;
  }

  console.log(chalk.green(`Found ${results.length} capability(s):\n`));
  console.log('─'.repeat(60));

  for (const cap of results) {
    const stars = '★'.repeat(Math.round(cap.statistics.rating));
    const emptyStars = '☆'.repeat(5 - Math.round(cap.statistics.rating));

    console.log(chalk.bold `\n${cap.displayName}`);
    console.log(chalk.cyan `  [${cap.type}] ${chalk.gray(`v${cap.version}`)}`);
    console.log(`  ${cap.description}`);
    console.log(chalk.gray `  Tags: ${cap.tags.join(', ')}`);
    console.log(chalk.gray `  Downloads: ${cap.statistics.downloads} | Subscribers: ${cap.statistics.subscribers}`);
    console.log(chalk.yellow `  Rating: ${stars}${emptyStars} (${cap.statistics.ratingCount})`);
    console.log('─'.repeat(60));
  }

  console.log(chalk.blue('\nRun: ') + chalk.yellow('semi-nexus subscribe <name>') + chalk.blue(' to subscribe'));
  console.log(chalk.blue('Run: ') + chalk.yellow('semi-nexus info <name>') + chalk.blue(' for more details\n'));
}
