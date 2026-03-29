import chalk from 'chalk';
import { Capability } from '../api/client';

const mockCapabilities: Capability[] = [
  {
    id: '1', name: 'rtl-review-copilot', displayName: 'RTL Review Copilot',
    description: 'AI-powered RTL code review for semiconductor design',
    type: 'skill', version: 'v1.4.2', tags: ['rtl', 'review', 'semiconductor'],
    category: { primary: 'EDA', secondary: 'RTL Review' },
    statistics: { downloads: 256, subscribers: 128, rating: 4.5, ratingCount: 64 }
  },
  {
    id: '2', name: 'spec-diff-explainer', displayName: 'Spec Diff Explainer',
    description: 'Automatically analyze and explain specification changes',
    type: 'skill', version: 'v0.9.6', tags: ['spec', 'diff', 'analysis'],
    category: { primary: 'Design', secondary: 'Documentation' },
    statistics: { downloads: 189, subscribers: 89, rating: 4.8, ratingCount: 42 }
  }
];

export async function search(query: string): Promise<void> {
  console.log(chalk.blue(`Searching for: "${query}"`));

  const results = mockCapabilities.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.description.toLowerCase().includes(query.toLowerCase()) ||
    c.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  );

  if (results.length === 0) {
    console.log(chalk.yellow('No capabilities found.'));
    return;
  }

  console.log(chalk.green(`\nFound ${results.length} capability(s):\n`));

  for (const cap of results) {
    console.log(chalk.bold(`${cap.displayName} [${cap.type}]`));
    console.log(`  ${cap.description}`);
    console.log(chalk.gray(`  Tags: ${cap.tags.join(', ')} | Version: ${cap.version}`));
    console.log(chalk.gray(`  Downloads: ${cap.statistics.downloads} | Rating: ${'★'.repeat(Math.round(cap.statistics.rating))}`));
    console.log();
  }
}