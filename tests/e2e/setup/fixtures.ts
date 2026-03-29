import { testServer, TestUser, TestServer } from './test-server';

export type { TestServer, TestUser };

export interface TestCapability {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: 'skill' | 'mcp' | 'agent';
  version: string;
  tags: string[];
  category: { primary: string; secondary: string };
  author: { name: string; email?: string };
  repository?: string;
}

export const testCapabilities: TestCapability[] = [
  {
    id: 'cap_test_skill_001',
    name: 'rtl-review',
    displayName: 'RTL Code Review',
    description: 'A comprehensive RTL code review skill that analyzes Verilog, VHDL, and SystemVerilog code for best practices, potential bugs, and optimization opportunities.',
    type: 'skill',
    version: '1.0.0',
    tags: ['rtl', 'verilog', 'vhdl', 'code-review', 'hardware'],
    category: { primary: 'code-review', secondary: 'hardware' },
    author: { name: 'Test Author', email: 'test@example.com' },
    repository: 'https://github.com/test/rtl-review'
  },
  {
    id: 'cap_test_skill_002',
    name: 'python-analyzer',
    displayName: 'Python Code Analyzer',
    description: 'Analyzes Python code for quality, security vulnerabilities, and performance issues. Provides detailed reports with suggested fixes.',
    type: 'skill',
    version: '2.1.0',
    tags: ['python', 'analysis', 'security', 'performance'],
    category: { primary: 'analysis', secondary: 'security' },
    author: { name: 'Test Author' }
  },
  {
    id: 'cap_test_mcp_001',
    name: 'database-tools',
    displayName: 'Database Tools MCP',
    description: 'MCP server providing database connectivity and query tools for PostgreSQL, MySQL, and SQLite.',
    type: 'mcp',
    version: '1.2.0',
    tags: ['database', 'postgresql', 'mysql', 'sqlite', 'mcp'],
    category: { primary: 'database', secondary: 'tools' },
    author: { name: 'Test Author' }
  },
  {
    id: 'cap_test_agent_001',
    name: 'code-assistant',
    displayName: 'Code Assistant Agent',
    description: 'An AI agent that helps with code generation, refactoring, and documentation across multiple programming languages.',
    type: 'agent',
    version: '3.0.0',
    tags: ['agent', 'code-generation', 'refactoring', 'documentation'],
    category: { primary: 'assistant', secondary: 'code' },
    author: { name: 'Test Author' }
  }
];

export function generateTestCapability(overrides: Partial<TestCapability> = {}): TestCapability {
  const id = `cap_test_${Date.now()}`;
  return {
    id,
    name: `test-capability-${id.substring(0, 8)}`,
    displayName: `Test Capability ${id.substring(0, 8)}`,
    description: 'A test capability for E2E testing purposes. This is a comprehensive description that meets the minimum length requirement.',
    type: 'skill',
    version: '1.0.0',
    tags: ['test', 'e2e'],
    category: { primary: 'test', secondary: 'e2e' },
    author: { name: 'E2E Test' },
    ...overrides
  };
}

export function generateTestPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = 'Aa1!';
  for (let i = 0; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

export function generateTestUsername(): string {
  return `testuser_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
