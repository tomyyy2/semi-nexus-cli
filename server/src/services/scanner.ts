import { v4 as uuidv4 } from 'uuid';
import { SecurityScan, SecurityIssue, Capability } from '../types';
import { registryService } from './registry';

export class ScannerService {
  private scanCache: Map<string, SecurityScan> = new Map();

  async scan(capabilityId: string): Promise<SecurityScan> {
    const capability = registryService.getCapability(capabilityId);
    if (!capability) {
      throw new Error('Capability not found');
    }

    const scan: SecurityScan = {
      status: 'scanning',
      startedAt: new Date().toISOString(),
      issues: [],
      scannerVersion: '1.0.0'
    };

    registryService.updateSecurityScan(capabilityId, scan);

    try {
      const issues = await this.performScan(capability);
      scan.status = issues.some(i => i.severity === 'critical' || i.severity === 'high')
        ? 'failed'
        : 'passed';
      scan.completedAt = new Date().toISOString();
      scan.issues = issues;

      this.scanCache.set(capabilityId, scan);
    } catch (error) {
      scan.status = 'failed';
      scan.completedAt = new Date().toISOString();
      scan.issues = [{
        id: `issue_${uuidv4().replace(/-/g, '').substring(0, 8)}`,
        severity: 'high',
        type: 'vulnerability',
        title: 'Scan failed',
        description: `Scanner error: ${error}`
      }];
    }

    registryService.updateSecurityScan(capabilityId, scan);
    return scan;
  }

  private async performScan(capability: Capability): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    issues.push(...this.checkSensitiveInfo(capability));
    issues.push(...this.checkDependencyRisks(capability));
    issues.push(...this.checkCompliance(capability));

    return issues;
  }

  private checkSensitiveInfo(capability: Capability): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const sensitivePatterns = [
      { pattern: /api[_-]?key["\s:=]+["\']?[a-zA-Z0-9]{20,}/gi, name: 'API Key' },
      { pattern: /password["\s:=]+["\']?[^"\s]{8,}/gi, name: 'Password' },
      { pattern: /token["\s:=]+["\']?[a-zA-Z0-9]{20,}/gi, name: 'Token' },
      { pattern: /secret["\s:=]+["\']?[^"\s]{8,}/gi, name: 'Secret' },
      { pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/g, name: 'Private Key' }
    ];

    const content = `${capability.name} ${capability.description}`;

    for (const { pattern, name } of sensitivePatterns) {
      if (pattern.test(content)) {
        issues.push({
          id: `si_${uuidv4().replace(/-/g, '').substring(0, 8)}`,
          severity: 'critical',
          type: 'sensitive_info',
          title: `Potential ${name} detected`,
          description: `Found pattern that may contain ${name.toLowerCase()}. Please review the code.`
        });
      }
    }

    return issues;
  }

  private checkDependencyRisks(capability: Capability): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    const riskyPackages = ['request', 'axios', 'node-fetch', 'got'];
    const deprecatedPackages = ['request', 'mkdirp', 'rimraf'];

    for (const pkg of capability.tags) {
      if (riskyPackages.includes(pkg.toLowerCase())) {
        issues.push({
          id: `dr_${uuidv4().replace(/-/g, '').substring(0, 8)}`,
          severity: 'medium',
          type: 'dependency',
          title: `Risky package: ${pkg}`,
          description: `${pkg} has known security issues. Consider using alternatives.`
        });
      }
      if (deprecatedPackages.includes(pkg.toLowerCase())) {
        issues.push({
          id: `dp_${uuidv4().replace(/-/g, '').substring(0, 8)}`,
          severity: 'low',
          type: 'dependency',
          title: `Deprecated package: ${pkg}`,
          description: `${pkg} is deprecated. Please use modern alternatives.`
        });
      }
    }

    return issues;
  }

  private checkCompliance(capability: Capability): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    if (!capability.author.name) {
      issues.push({
        id: `co_${uuidv4().replace(/-/g, '').substring(0, 8)}`,
        severity: 'low',
        type: 'compliance',
        title: 'Missing author information',
        description: 'Capability should have author information for accountability.'
      });
    }

    if (!capability.repository) {
      issues.push({
        id: `cr_${uuidv4().replace(/-/g, '').substring(0, 8)}`,
        severity: 'low',
        type: 'compliance',
        title: 'Missing repository URL',
        description: 'Capability should have a repository URL for code review.'
      });
    }

    if (!capability.description || capability.description.length < 20) {
      issues.push({
        id: `cd_${uuidv4().replace(/-/g, '').substring(0, 8)}`,
        severity: 'medium',
        type: 'compliance',
        title: 'Insufficient description',
        description: 'Capability description should be at least 20 characters.'
      });
    }

    return issues;
  }

  getScanStatus(capabilityId: string): SecurityScan | undefined {
    return this.scanCache.get(capabilityId);
  }
}

export const scannerService = new ScannerService();