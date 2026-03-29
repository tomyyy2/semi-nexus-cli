import { testServer } from './test-server';
import { testCli } from './test-cli';

jest.setTimeout(60000);

beforeAll(async () => {
  await testServer.start();
});

afterAll(async () => {
  await testServer.stop();
  await testCli.cleanup();
});

afterEach(async () => {
  await testCli.cleanup();
});

declare global {
  var __TEST_SERVER__: any;
  var __TEST_CLI__: any;
}
