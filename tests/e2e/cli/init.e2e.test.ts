import { testCli } from '../setup/test-cli';
import { testServer } from '../setup/test-server';

describe('CLI Init E2E Tests', () => {
  it('should initialize CLI with default config', async () => {
    const server = testServer.getServer();
    await testCli.setup(server.url);

    const result = await testCli.run(['init', '--server', server.url, '--force']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Initialized successfully');
  });

  it('should show already initialized message without force', async () => {
    const server = testServer.getServer();
    await testCli.setup(server.url);

    await testCli.run(['init', '--server', server.url]);
    const result = await testCli.run(['init', '--server', server.url]);

    expect(result.stdout).toContain('already initialized');
  });

  it('should force reinitialize', async () => {
    const server = testServer.getServer();
    await testCli.setup(server.url);

    await testCli.run(['init', '--server', server.url]);
    const result = await testCli.run(['init', '--server', server.url, '--force']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Initialized successfully');
  });
});
