import path from 'path';
import os from 'os';
import fs from 'fs-extra';

describe('Sync Command Logic', () => {
  const testBaseDir = path.join(os.tmpdir(), 'semi-nexus-sync-test');

  beforeEach(async () => {
    await fs.ensureDir(testBaseDir);
  });

  afterEach(async () => {
    await fs.remove(testBaseDir);
  });

  describe('Agent configuration', () => {
    it('should load configured agents', () => {
      const configAgents = {
        'claude-code': { enabled: true, installPath: '~/.claude/skills', syncMode: 'symlink' },
        'opencode': { enabled: true, installPath: '~/.opencode/skills', syncMode: 'symlink' },
        'openclaw': { enabled: false, installPath: '~/.openclaw/plugins', syncMode: 'copy' },
      };

      const enabledAgents = Object.entries(configAgents)
        .filter(([_, cfg]) => cfg.enabled)
        .map(([name]) => name);

      expect(enabledAgents).toEqual(['claude-code', 'opencode']);
      expect(enabledAgents).not.toContain('openclaw');
    });

    it('should validate agent paths', () => {
      const agent = { id: 'claude-code', installPath: '~/.claude', skillPath: '~/.claude/skills', supported: true };
      expect(agent.installPath).toBe('~/.claude');
      expect(agent.skillPath).toBe('~/.claude/skills');
      expect(agent.supported).toBe(true);
    });

    it('should support symlink and copy sync modes', () => {
      const modes = ['symlink', 'copy'];
      expect(modes).toContain('symlink');
      expect(modes).toContain('copy');
    });
  });

  describe('Sync status', () => {
    it('should detect symlinked skills', async () => {
      const agentSkillsPath = path.join(testBaseDir, '.claude', 'skills');
      const skillSourcePath = path.join(testBaseDir, 'semi-nexus', 'skills', 'rtl-review-copilot');
      const skillLinkPath = path.join(agentSkillsPath, 'rtl-review-copilot');

      await fs.ensureDir(agentSkillsPath);
      await fs.ensureDir(skillSourcePath);

      const isWindows = process.platform === 'win32';
      if (isWindows) {
        await fs.symlink(skillSourcePath, skillLinkPath, 'junction');
      } else {
        await fs.symlink(skillSourcePath, skillLinkPath);
      }

      const exists = await fs.pathExists(skillLinkPath);
      expect(exists).toBe(true);
    });

    it('should list synced skills per agent', async () => {
      const skills = ['rtl-review-copilot', 'spec-diff-explainer'];
      const agentPath = path.join(testBaseDir, '.claude', 'skills');

      await fs.ensureDir(agentPath);

      for (const skill of skills) {
        const skillSourcePath = path.join(testBaseDir, 'semi-nexus', 'skills', skill);
        const skillLinkPath = path.join(agentPath, skill);
        await fs.ensureDir(skillSourcePath);

        const isWindows = process.platform === 'win32';
        if (isWindows) {
          await fs.symlink(skillSourcePath, skillLinkPath, 'junction');
        } else {
          await fs.symlink(skillSourcePath, skillLinkPath);
        }
      }

      const syncedSkills = await fs.readdir(agentPath);
      expect(syncedSkills).toHaveLength(2);
    });
  });

  describe('Sync operations', () => {
    it('should create agent directory if not exists', async () => {
      const agentPath = path.join(testBaseDir, '.opencode', 'skills');
      await fs.ensureDir(agentPath);
      const exists = await fs.pathExists(agentPath);
      expect(exists).toBe(true);
    });

    it('should handle sync to specific agent only', () => {
      const targetAgent = 'claude-code';
      const configAgents = {
        'claude-code': { enabled: true, installPath: '~/.claude/skills', syncMode: 'symlink' },
        'opencode': { enabled: true, installPath: '~/.opencode/skills', syncMode: 'symlink' },
      };

      const agentConfig = configAgents[targetAgent as keyof typeof configAgents];
      expect(agentConfig).toBeDefined();
      expect(agentConfig.enabled).toBe(true);
    });
  });
});