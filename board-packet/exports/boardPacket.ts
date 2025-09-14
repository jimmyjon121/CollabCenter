// Board Packet Composer - Generates structured board packets from DecisionOS data
import * as fs from 'fs/promises';
import * as path from 'path';
import { DecisionOSData } from '../../decision-os-panel/core/decisionOS';
import { renderBoardPacketHTML } from '../templates/boardPacketRenderer';
import { generatePDF } from '../server/export/pdf';

export interface BoardPacketData {
  metadata: {
    generatedAt: string;
    sessionId: string;
    workspaceId: string;
    period: string;
    preparedBy: string;
  };
  sections: {
    executiveSummary: ExecutiveSummarySection;
    ninetyDayPlan: NinetyDayPlanSection;
    financials: FinancialsSection;
    risks: RiskSection;
    actions: ActionSection;
  };
  appendix?: {
    discussionHighlights?: string[];
    keyMetrics?: Record<string, any>;
    references?: string[];
  };
}

interface ExecutiveSummarySection {
  overview: string;
  keyHighlights: string[];
  criticalDecisions: {
    decision: string;
    rationale: string;
    impact: string;
  }[];
  performanceSnapshot: {
    metric: string;
    value: string;
    trend: 'up' | 'down' | 'flat';
  }[];
}

interface NinetyDayPlanSection {
  objectives: {
    title: string;
    description: string;
    keyResults: string[];
    owner: string;
    status: 'not-started' | 'in-progress' | 'at-risk' | 'on-track';
  }[];
  milestones: {
    date: string;
    milestone: string;
    dependencies: string[];
    owner: string;
  }[];
  resourceRequirements: {
    type: string;
    amount: string;
    justification: string;
  }[];
}

interface FinancialsSection {
  summary: string;
  currentQuarter: {
    revenue: number;
    expenses: number;
    burnRate: number;
    runway: string;
  };
  projections: {
    quarter: string;
    revenue: number;
    expenses: number;
    netIncome: number;
  }[];
  keyMetrics: {
    metric: string;
    current: string;
    target: string;
    status: 'on-track' | 'at-risk' | 'off-track';
  }[];
}

interface RiskSection {
  summary: string;
  topRisks: {
    risk: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    likelihood: 'unlikely' | 'possible' | 'likely' | 'certain';
    impact: string;
    mitigation: string;
    owner: string;
    status: 'identified' | 'mitigating' | 'monitoring' | 'resolved';
  }[];
  riskMatrix: {
    highImpactHighLikelihood: string[];
    highImpactLowLikelihood: string[];
    lowImpactHighLikelihood: string[];
    lowImpactLowLikelihood: string[];
  };
}

interface ActionSection {
  immediateActions: {
    action: string;
    owner: string;
    dueDate: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
    blockers?: string[];
  }[];
  followUps: {
    item: string;
    owner: string;
    nextStep: string;
    timeline: string;
  }[];
}

export class BoardPacketComposer {
  constructor(
    private dataPath: string = './roundtable_data',
    private outputPath: string = './roundtable_data/exports'
  ) {}

  async composeBoardPacket(
    sessionId: string,
    workspaceId: string,
    options: {
      preparedBy?: string;
      period?: string;
      includeAppendix?: boolean;
      customSections?: Partial<BoardPacketData['sections']>;
    } = {}
  ): Promise<BoardPacketData> {
    // Load DecisionOS data
    const decisionOSData = await this.loadDecisionOSData(sessionId);
    
    // Load session data for additional context
    const sessionData = await this.loadSessionData(sessionId);
    
    // Compose board packet
    const boardPacket: BoardPacketData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        sessionId,
        workspaceId,
        period: options.period || this.getCurrentPeriod(),
        preparedBy: options.preparedBy || 'Roundtable AI Advisory Board'
      },
      sections: {
        executiveSummary: this.composeExecutiveSummary(decisionOSData, sessionData),
        ninetyDayPlan: this.composeNinetyDayPlan(decisionOSData, sessionData),
        financials: this.composeFinancials(sessionData),
        risks: this.composeRisks(decisionOSData),
        actions: this.composeActions(decisionOSData),
        ...options.customSections
      }
    };
    
    // Add appendix if requested
    if (options.includeAppendix) {
      boardPacket.appendix = this.composeAppendix(decisionOSData, sessionData);
    }
    
    return boardPacket;
  }

  private async loadDecisionOSData(sessionId: string): Promise<DecisionOSData | null> {
    try {
      const decisionsPath = path.join(this.dataPath, 'decisions', `${sessionId}.json`);
      const data = await fs.readFile(decisionsPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.log('No DecisionOS data found, using defaults');
      return null;
    }
  }

  private async loadSessionData(sessionId: string): Promise<any> {
    try {
      // Find the session file
      const sessionsDir = path.join(this.dataPath, 'sessions');
      const files = await fs.readdir(sessionsDir);
      const sessionFile = files.find(f => f.includes(sessionId));
      
      if (sessionFile) {
        const data = await fs.readFile(path.join(sessionsDir, sessionFile), 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.log('No session data found');
    }
    return null;
  }

  private composeExecutiveSummary(
    decisionOS: DecisionOSData | null,
    session: any
  ): ExecutiveSummarySection {
    const decisions = decisionOS?.decisions || [];
    const risks = decisionOS?.risks || [];
    const tasks = decisionOS?.nextTwoWeeksPlan || [];
    
    const criticalRisks = risks.filter(r => 
      r.severity === 'critical' || r.severity === 'high'
    );
    
    const urgentTasks = tasks.filter(t => t.priority === 'urgent');
    
    return {
      overview: `This board packet summarizes key decisions, risks, and actions from ${new Date().toLocaleDateString()}. The advisory board has identified ${decisions.length} critical decisions, ${risks.length} risks (${criticalRisks.length} high/critical), and ${tasks.length} action items for the next two weeks.`,
      keyHighlights: [
        `${decisions.filter(d => d.status === 'completed').length} decisions completed`,
        `${criticalRisks.length} critical risks requiring immediate attention`,
        `${urgentTasks.length} urgent action items for next 2 weeks`,
        `${session?.estimatedCost ? `Session cost: $${session.estimatedCost.toFixed(2)}` : 'Cost tracking enabled'}`
      ],
      criticalDecisions: decisions.slice(0, 3).map(d => ({
        decision: d.title,
        rationale: d.context || 'Based on advisory board consensus',
        impact: 'High - affects strategic direction'
      })),
      performanceSnapshot: [
        {
          metric: 'Decision Velocity',
          value: `${decisions.length} decisions`,
          trend: 'up'
        },
        {
          metric: 'Risk Mitigation',
          value: `${risks.filter(r => r.mitigation).length}/${risks.length}`,
          trend: 'flat'
        },
        {
          metric: 'Action Completion',
          value: `${tasks.filter(t => t.status === 'completed').length}/${tasks.length}`,
          trend: tasks.length > 0 ? 'up' : 'flat'
        }
      ]
    };
  }

  private composeNinetyDayPlan(
    decisionOS: DecisionOSData | null,
    session: any
  ): NinetyDayPlanSection {
    const tasks = decisionOS?.nextTwoWeeksPlan || [];
    const decisions = decisionOS?.decisions || [];
    
    // Group tasks by owner and priority
    const tasksByOwner = this.groupBy(tasks, 'owner');
    
    // Create objectives from decisions and tasks
    const objectives = Object.entries(tasksByOwner).slice(0, 3).map(([owner, ownerTasks]: [string, any[]]) => ({
      title: `${owner}'s Key Deliverables`,
      description: `Critical tasks and decisions owned by ${owner}`,
      keyResults: ownerTasks.slice(0, 3).map(t => t.task),
      owner,
      status: ownerTasks.some(t => t.status === 'blocked') ? 'at-risk' : 
              ownerTasks.every(t => t.status === 'completed') ? 'on-track' : 'in-progress'
    }));
    
    // Create milestones from decisions with due dates
    const milestones = decisions
      .filter(d => d.dueDate)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)
      .map(d => ({
        date: new Date(d.dueDate).toLocaleDateString(),
        milestone: d.title,
        dependencies: [],
        owner: d.owner
      }));
    
    return {
      objectives: objectives.length > 0 ? objectives : [
        {
          title: 'Q1 Strategic Initiatives',
          description: 'Key initiatives for the quarter',
          keyResults: ['Define product roadmap', 'Launch MVP', 'Secure funding'],
          owner: 'Leadership Team',
          status: 'in-progress'
        }
      ],
      milestones: milestones.length > 0 ? milestones : [
        {
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          milestone: '30-Day Checkpoint',
          dependencies: [],
          owner: 'CEO'
        }
      ],
      resourceRequirements: [
        {
          type: 'Budget',
          amount: '$50,000',
          justification: 'Product development and marketing'
        },
        {
          type: 'Headcount',
          amount: '2 engineers',
          justification: 'Accelerate development timeline'
        }
      ]
    };
  }

  private composeFinancials(session: any): FinancialsSection {
    // Placeholder financials - in production, pull from financial engine
    return {
      summary: 'Financial performance is tracking to plan with runway of 18 months at current burn rate.',
      currentQuarter: {
        revenue: 150000,
        expenses: 200000,
        burnRate: 50000,
        runway: '18 months'
      },
      projections: [
        {
          quarter: 'Q1 2024',
          revenue: 150000,
          expenses: 200000,
          netIncome: -50000
        },
        {
          quarter: 'Q2 2024',
          revenue: 250000,
          expenses: 220000,
          netIncome: 30000
        },
        {
          quarter: 'Q3 2024',
          revenue: 400000,
          expenses: 250000,
          netIncome: 150000
        }
      ],
      keyMetrics: [
        {
          metric: 'Monthly Recurring Revenue',
          current: '$50,000',
          target: '$100,000',
          status: 'on-track'
        },
        {
          metric: 'Customer Acquisition Cost',
          current: '$500',
          target: '$300',
          status: 'at-risk'
        },
        {
          metric: 'Lifetime Value',
          current: '$5,000',
          target: '$6,000',
          status: 'on-track'
        }
      ]
    };
  }

  private composeRisks(decisionOS: DecisionOSData | null): RiskSection {
    const risks = decisionOS?.risks || [];
    
    // Create risk matrix
    const riskMatrix = {
      highImpactHighLikelihood: [],
      highImpactLowLikelihood: [],
      lowImpactHighLikelihood: [],
      lowImpactLowLikelihood: []
    };
    
    risks.forEach(r => {
      const isHighImpact = r.severity === 'critical' || r.severity === 'high';
      const isHighLikelihood = r.likelihood === 'likely' || r.likelihood === 'certain';
      
      if (isHighImpact && isHighLikelihood) {
        riskMatrix.highImpactHighLikelihood.push(r.risk);
      } else if (isHighImpact && !isHighLikelihood) {
        riskMatrix.highImpactLowLikelihood.push(r.risk);
      } else if (!isHighImpact && isHighLikelihood) {
        riskMatrix.lowImpactHighLikelihood.push(r.risk);
      } else {
        riskMatrix.lowImpactLowLikelihood.push(r.risk);
      }
    });
    
    return {
      summary: `${risks.length} risks identified with ${risks.filter(r => r.severity === 'critical' || r.severity === 'high').length} requiring immediate attention.`,
      topRisks: risks.map(r => ({
        risk: r.risk,
        severity: r.severity,
        likelihood: r.likelihood,
        impact: r.impact || 'Potential business disruption',
        mitigation: r.mitigation,
        owner: r.owner || 'Risk Committee',
        status: 'mitigating'
      })),
      riskMatrix
    };
  }

  private composeActions(decisionOS: DecisionOSData | null): ActionSection {
    const tasks = decisionOS?.nextTwoWeeksPlan || [];
    const decisions = decisionOS?.decisions || [];
    
    // Sort tasks by priority and date
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return {
      immediateActions: sortedTasks.map(t => ({
        action: t.task,
        owner: t.owner,
        dueDate: new Date(t.dueDate).toLocaleDateString(),
        priority: t.priority,
        status: t.status,
        blockers: t.dependencies
      })),
      followUps: decisions
        .filter(d => d.status === 'pending' || d.status === 'in-progress')
        .slice(0, 5)
        .map(d => ({
          item: d.title,
          owner: d.owner,
          nextStep: 'Review and finalize decision',
          timeline: new Date(d.dueDate).toLocaleDateString()
        }))
    };
  }

  private composeAppendix(decisionOS: DecisionOSData | null, session: any): BoardPacketData['appendix'] {
    return {
      discussionHighlights: session?.messages?.slice(-5).map((m: any) => 
        `${m.author}: ${m.text.substring(0, 100)}...`
      ) || [],
      keyMetrics: {
        totalMessages: session?.messages?.length || 0,
        totalTokens: session?.tokensUsed || 0,
        sessionDuration: session?.duration || 0,
        consensusScore: session?.consensusScore || 0
      },
      references: [
        'DecisionOS Data Export',
        'Roundtable Advisory Session',
        'AI-Generated Insights'
      ]
    };
  }

  async exportBoardPacket(
    sessionId: string,
    workspaceId: string,
    format: 'html' | 'pdf' | 'both' = 'html',
    options: any = {}
  ): Promise<{ html?: string; pdf?: Buffer; path?: string }> {
    // Compose the board packet data
    const boardPacket = await this.composeBoardPacket(sessionId, workspaceId, options);
    
    // Generate HTML
    const html = renderBoardPacketHTML(boardPacket);
    
    // Save HTML
    const timestamp = Date.now();
    const htmlPath = path.join(this.outputPath, `board-packet-${sessionId}-${timestamp}.html`);
    await fs.writeFile(htmlPath, html);
    
    const result: any = { html, path: htmlPath };
    
    // Generate PDF if requested and puppeteer is available
    if (format === 'pdf' || format === 'both') {
      try {
        const pdfBuffer = await generatePDF(html);
        if (pdfBuffer) {
          const pdfPath = path.join(this.outputPath, `board-packet-${sessionId}-${timestamp}.pdf`);
          await fs.writeFile(pdfPath, pdfBuffer);
          result.pdf = pdfBuffer;
          result.pdfPath = pdfPath;
        }
      } catch (error) {
        console.log('PDF generation not available:', error.message);
      }
    }
    
    return result;
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `Q${quarter} ${now.getFullYear()}`;
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
      const group = String(item[key]);
      if (!result[group]) result[group] = [];
      result[group].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }
}

// Export singleton instance
export const boardPacketComposer = new BoardPacketComposer();

