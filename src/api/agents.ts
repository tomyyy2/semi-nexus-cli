import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { AgentConfig } from './registry';

export class AgentDetector {
  private agents: Map<string, AgentConfig> = new Map();

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents(): void {
    this.agents.set('claude-code', {
      id: 'claude-code',
      name: 'Claude Code',
      installPath: path.join(os.homedir(), '.claude'),
      skillPath: path.join(os.homedir(), '.claude', 'skills'),
      supported: true,
      syncMode: 'symlink',
      detected: false
    });

    this.agents.set('opencode', {
      id: 'opencode',
      name: 'OpenCode',
      installPath: path.join(os.homedir(), '.opencode'),
      skillPath: path.join(os.homedir(), '.opencode', 'skills'),
      supported: true,
      syncMode: 'symlink',
      detected: false
    });

    this.agents.set('openclaw', {
      id: 'openclaw',
      name: 'OpenClaw',
      installPath: path.join(os.homedir(), '.openclaw'),
      skillPath: path.join(os.homedir(), '.openclaw', 'plugins'),
      supported: true,
      syncMode: 'copy',
      detected: false
    });
  }

  async detectAll(): Promise<AgentConfig[]> {
    for (const agent of this.agents.values()) {
      agent.detected = await this.checkAgentInstalled(agent);
    }
    return Array.from(this.agents.values());
  }

  async detect(agentId: string): Promise<AgentConfig | undefined> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.detected = await this.checkAgentInstalled(agent);
    }
    return agent;
  }

  private async checkAgentInstalled(agent: AgentConfig): Promise<boolean> {
    try {
      return await fs.pathExists(agent.installPath);
    } catch {
      return false;
    }
  }

  getAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  getAgent(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  getDetectedAgents(): AgentConfig[] {
    return Array.from(this.agents.values()).filter(a => a.detected);
  }

  getSupportedAgents(): AgentConfig[] {
    return Array.from(this.agents.values()).filter(a => a.supported);
  }

  async ensureSkillPath(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      await fs.ensureDir(agent.skillPath);
    }
  }
}

export const agentDetector = new AgentDetector();