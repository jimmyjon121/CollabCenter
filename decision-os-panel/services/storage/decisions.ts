// Storage Service for DecisionOS Data Persistence
import * as fs from 'fs/promises';
import * as path from 'path';
import { DecisionOSData, DecisionOSValidator } from '../../core/decisionOS';

export class DecisionStorageService {
  private basePath: string;
  
  constructor(basePath: string = './data/sessions') {
    this.basePath = basePath;
  }
  
  /**
   * Get the file path for a session's decisions
   */
  private getFilePath(sessionId: string): string {
    return path.join(this.basePath, sessionId, 'decisions.json');
  }
  
  /**
   * Ensure the directory structure exists
   */
  private async ensureDirectory(sessionId: string): Promise<void> {
    const dirPath = path.join(this.basePath, sessionId);
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error('Error creating directory:', error);
      throw new Error(`Failed to create directory for session ${sessionId}`);
    }
  }
  
  /**
   * Save DecisionOS data for a session
   */
  async save(sessionId: string, data: DecisionOSData): Promise<void> {
    // Validate data before saving
    const errors = DecisionOSValidator.validateDecisionOSData(data);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    // Ensure directory exists
    await this.ensureDirectory(sessionId);
    
    // Update metadata
    data.metadata.updatedAt = new Date().toISOString();
    
    // Save to file
    const filePath = this.getFilePath(sessionId);
    try {
      await fs.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      console.log(`Saved decisions for session ${sessionId}`);
    } catch (error) {
      console.error('Error saving decisions:', error);
      throw new Error(`Failed to save decisions for session ${sessionId}`);
    }
  }
  
  /**
   * Load DecisionOS data for a session
   */
  async load(sessionId: string): Promise<DecisionOSData | null> {
    const filePath = this.getFilePath(sessionId);
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent) as DecisionOSData;
      
      // Validate loaded data
      const errors = DecisionOSValidator.validateDecisionOSData(data);
      if (errors.length > 0) {
        console.warn(`Loaded data has validation errors: ${errors.join(', ')}`);
      }
      
      return data;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet
        return null;
      }
      console.error('Error loading decisions:', error);
      throw new Error(`Failed to load decisions for session ${sessionId}`);
    }
  }
  
  /**
   * Check if decisions exist for a session
   */
  async exists(sessionId: string): Promise<boolean> {
    const filePath = this.getFilePath(sessionId);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Delete decisions for a session
   */
  async delete(sessionId: string): Promise<void> {
    const filePath = this.getFilePath(sessionId);
    try {
      await fs.unlink(filePath);
      console.log(`Deleted decisions for session ${sessionId}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Error deleting decisions:', error);
        throw new Error(`Failed to delete decisions for session ${sessionId}`);
      }
    }
  }
  
  /**
   * List all sessions with saved decisions
   */
  async listSessions(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.basePath, { withFileTypes: true });
      const sessions: string[] = [];
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const decisionsPath = path.join(this.basePath, entry.name, 'decisions.json');
          try {
            await fs.access(decisionsPath);
            sessions.push(entry.name);
          } catch {
            // No decisions file in this directory
          }
        }
      }
      
      return sessions;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Base directory doesn't exist yet
        return [];
      }
      console.error('Error listing sessions:', error);
      throw new Error('Failed to list sessions');
    }
  }
  
  /**
   * Auto-save with debouncing
   */
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  
  async autoSave(sessionId: string, data: DecisionOSData, debounceMs: number = 5000): Promise<void> {
    // Clear existing timer
    const existingTimer = this.autoSaveTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(async () => {
      try {
        await this.save(sessionId, data);
        this.autoSaveTimers.delete(sessionId);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, debounceMs);
    
    this.autoSaveTimers.set(sessionId, timer);
  }
  
  /**
   * Export decisions for board packet
   */
  async exportForBoardPacket(sessionId: string): Promise<BoardPacketExport | null> {
    const data = await this.load(sessionId);
    if (!data) return null;
    
    return {
      executiveSummary: this.generateExecutiveSummary(data),
      decisions: this.formatDecisionsForExport(data.decisions),
      risks: this.formatRisksForExport(data.risks),
      actionPlan: this.formatActionPlanForExport(data.nextTwoWeeksPlan),
      metadata: {
        sessionId: data.sessionId,
        workspaceId: data.workspaceId,
        generatedAt: new Date().toISOString(),
        totalDecisions: data.decisions.length,
        totalRisks: data.risks.length,
        totalTasks: data.nextTwoWeeksPlan.length
      }
    };
  }
  
  private generateExecutiveSummary(data: DecisionOSData): string {
    const criticalRisks = data.risks.filter(r => r.severity === 'critical').length;
    const highPriorityTasks = data.nextTwoWeeksPlan.filter(t => t.priority === 'urgent').length;
    const completedDecisions = data.decisions.filter(d => d.status === 'completed').length;
    
    return `
## Executive Summary

### Key Metrics
- **Decisions Made**: ${data.decisions.length} (${completedDecisions} completed)
- **Risks Identified**: ${data.risks.length} (${criticalRisks} critical)
- **Action Items**: ${data.nextTwoWeeksPlan.length} (${highPriorityTasks} urgent)

### Critical Focus Areas
${data.risks
  .filter(r => r.severity === 'critical' || r.severity === 'high')
  .map(r => `- **${r.risk}**: ${r.mitigation}`)
  .join('\n')}

### Immediate Actions Required
${data.nextTwoWeeksPlan
  .filter(t => t.priority === 'urgent')
  .map(t => `- ${t.task} (Owner: ${t.owner}, Due: ${new Date(t.dueDate).toLocaleDateString()})`)
  .join('\n')}
    `.trim();
  }
  
  private formatDecisionsForExport(decisions: DecisionOSData['decisions']): string {
    if (decisions.length === 0) {
      return '## Decisions\n\n*No decisions recorded*';
    }
    
    return `## Decisions

${decisions.map((d, i) => `
### ${i + 1}. ${d.title}
- **Owner**: ${d.owner}
- **Due Date**: ${new Date(d.dueDate).toLocaleDateString()}
- **Status**: ${d.status}
${d.context ? `- **Context**: ${d.context}` : ''}
`).join('\n')}`;
  }
  
  private formatRisksForExport(risks: DecisionOSData['risks']): string {
    if (risks.length === 0) {
      return '## Risk Assessment\n\n*No risks identified*';
    }
    
    // Group by severity
    const grouped = {
      critical: risks.filter(r => r.severity === 'critical'),
      high: risks.filter(r => r.severity === 'high'),
      medium: risks.filter(r => r.severity === 'medium'),
      low: risks.filter(r => r.severity === 'low')
    };
    
    return `## Risk Assessment

${Object.entries(grouped)
  .filter(([_, risks]) => risks.length > 0)
  .map(([severity, risks]) => `
### ${severity.charAt(0).toUpperCase() + severity.slice(1)} Severity

${risks.map(r => `
**${r.risk}**
- Likelihood: ${r.likelihood}
- Mitigation: ${r.mitigation}
${r.owner ? `- Owner: ${r.owner}` : ''}
${r.impact ? `- Impact: ${r.impact}` : ''}
`).join('\n')}
`).join('\n')}`;
  }
  
  private formatActionPlanForExport(tasks: DecisionOSData['nextTwoWeeksPlan']): string {
    if (tasks.length === 0) {
      return '## Next Two Weeks Action Plan\n\n*No tasks scheduled*';
    }
    
    // Sort by due date
    const sorted = [...tasks].sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    
    // Group by week
    const week1: typeof tasks = [];
    const week2: typeof tasks = [];
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    sorted.forEach(task => {
      const dueDate = new Date(task.dueDate);
      if (dueDate <= oneWeekFromNow) {
        week1.push(task);
      } else {
        week2.push(task);
      }
    });
    
    return `## Next Two Weeks Action Plan

### Week 1 (${now.toLocaleDateString()} - ${oneWeekFromNow.toLocaleDateString()})

${week1.length > 0 ? week1.map(t => `
**${t.task}**
- Owner: ${t.owner}
- Due: ${new Date(t.dueDate).toLocaleDateString()}
- Priority: ${t.priority}
- Status: ${t.status}
${t.dependencies && t.dependencies.length > 0 ? `- Dependencies: ${t.dependencies.join(', ')}` : ''}
`).join('\n') : '*No tasks scheduled for Week 1*'}

### Week 2 (${new Date(oneWeekFromNow.getTime() + 1).toLocaleDateString()} - ${new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()})

${week2.length > 0 ? week2.map(t => `
**${t.task}**
- Owner: ${t.owner}
- Due: ${new Date(t.dueDate).toLocaleDateString()}
- Priority: ${t.priority}
- Status: ${t.status}
${t.dependencies && t.dependencies.length > 0 ? `- Dependencies: ${t.dependencies.join(', ')}` : ''}
`).join('\n') : '*No tasks scheduled for Week 2*'}`;
  }
}

// Export type for board packet integration
export interface BoardPacketExport {
  executiveSummary: string;
  decisions: string;
  risks: string;
  actionPlan: string;
  metadata: {
    sessionId: string;
    workspaceId: string;
    generatedAt: string;
    totalDecisions: number;
    totalRisks: number;
    totalTasks: number;
  };
}

// Singleton instance for convenience
export const decisionStorage = new DecisionStorageService();

