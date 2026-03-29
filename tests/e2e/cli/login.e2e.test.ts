import { testCli } from '../setup/test-cli';
import { testServer } from '../setup/test-server';

describe('CLI Login E2E Tests', () => {
  beforeEach(async () => {
    const server = testServer.getServer();
    await testCli.setup(server.url);
  });

  it('should login with valid credentials', async () => {
    const server = testServer.getServer();
    
    const result = await testCli.run([
      'login',
      '--server', server.url,
      '--apikey', 'test-api-key'
    ]);

    expect(result.exitCode).toBe(0);
  });

  it('should fail with invalid credentials', async () => {
    const result = await testCli.run([
      'login',
      '--apikey', 'invalid-key'
    ]);

    expect(result.exitCode).not.toBe(0);
  });

  it('should logout successfully', async () => {
    const result = await testCli.run(['logout']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Logged out');
  });
});
