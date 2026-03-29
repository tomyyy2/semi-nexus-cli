import { testCli } from '../setup/test-cli';
import { testServer } from '../setup/test-server';

describe('CLI Search E2E Tests', () => {
  beforeEach(async () => {
    const server = testServer.getServer();
    await testCli.setup(server.url);
  });

  it('should search for capabilities', async () => {
    const result = await testCli.run(['search', 'rtl']);

    expect(result.exitCode).toBe(0);
  });

  it('should show no results message for non-matching query', async () => {
    const result = await testCli.run(['search', 'nonexistentcapabilityxyz']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No capabilities found');
  });

  it('should filter by type', async () => {
    const result = await testCli.run(['search', 'test', '--type', 'skill']);

    expect(result.exitCode).toBe(0);
  });

  it('should filter by tag', async () => {
    const result = await testCli.run(['search', 'test', '--tag', 'rtl']);

    expect(result.exitCode).toBe(0);
  });
});
