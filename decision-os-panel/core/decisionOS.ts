// DecisionOS Core Types and Validators

export interface Decision {
  id: string;
  title: string;
  owner: string;
  dueDate: string; // ISO 8601 date string
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  context?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Risk {
  id: string;
  risk: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
  owner?: string;
  likelihood: 'unlikely' | 'possible' | 'likely' | 'certain';
  impact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NextTwoWeeksTask {
  id: string;
  task: string;
  owner: string;
  dueDate: string; // ISO 8601 date string
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dependencies?: string[];
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  createdAt: string;
  updatedAt: string;
}

export interface DecisionOSData {
  sessionId: string;
  workspaceId: string;
  decisions: Decision[];
  risks: Risk[];
  nextTwoWeeksPlan: NextTwoWeeksTask[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    lastModifiedBy?: string;
    sessionDuration?: number;
    totalCost?: number;
    consensusScore?: number;
  };
}

// Validators
export class DecisionOSValidator {
  static validateDecision(decision: Partial<Decision>): string[] {
    const errors: string[] = [];
    
    if (!decision.title || decision.title.trim().length === 0) {
      errors.push('Decision title is required');
    }
    
    if (!decision.owner || decision.owner.trim().length === 0) {
      errors.push('Decision owner is required');
    }
    
    if (!decision.dueDate) {
      errors.push('Decision due date is required');
    } else if (!this.isValidDate(decision.dueDate)) {
      errors.push('Decision due date must be a valid ISO 8601 date');
    }
    
    if (decision.status && !['pending', 'in-progress', 'completed', 'blocked'].includes(decision.status)) {
      errors.push('Invalid decision status');
    }
    
    return errors;
  }
  
  static validateRisk(risk: Partial<Risk>): string[] {
    const errors: string[] = [];
    
    if (!risk.risk || risk.risk.trim().length === 0) {
      errors.push('Risk description is required');
    }
    
    if (!risk.severity || !['low', 'medium', 'high', 'critical'].includes(risk.severity)) {
      errors.push('Valid risk severity is required (low, medium, high, critical)');
    }
    
    if (!risk.mitigation || risk.mitigation.trim().length === 0) {
      errors.push('Risk mitigation strategy is required');
    }
    
    if (risk.likelihood && !['unlikely', 'possible', 'likely', 'certain'].includes(risk.likelihood)) {
      errors.push('Invalid risk likelihood');
    }
    
    return errors;
  }
  
  static validateTask(task: Partial<NextTwoWeeksTask>): string[] {
    const errors: string[] = [];
    
    if (!task.task || task.task.trim().length === 0) {
      errors.push('Task description is required');
    }
    
    if (!task.owner || task.owner.trim().length === 0) {
      errors.push('Task owner is required');
    }
    
    if (!task.dueDate) {
      errors.push('Task due date is required');
    } else if (!this.isValidDate(task.dueDate)) {
      errors.push('Task due date must be a valid ISO 8601 date');
    } else if (!this.isWithinTwoWeeks(task.dueDate)) {
      errors.push('Task due date must be within the next two weeks');
    }
    
    if (!task.priority || !['low', 'medium', 'high', 'urgent'].includes(task.priority)) {
      errors.push('Valid task priority is required (low, medium, high, urgent)');
    }
    
    if (task.status && !['not-started', 'in-progress', 'completed', 'blocked'].includes(task.status)) {
      errors.push('Invalid task status');
    }
    
    return errors;
  }
  
  static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
  
  static isWithinTwoWeeks(dateString: string): boolean {
    const date = new Date(dateString);
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
    return date >= now && date <= twoWeeksFromNow;
  }
  
  static validateDecisionOSData(data: Partial<DecisionOSData>): string[] {
    const errors: string[] = [];
    
    if (!data.sessionId) {
      errors.push('Session ID is required');
    }
    
    if (!data.workspaceId) {
      errors.push('Workspace ID is required');
    }
    
    // Validate all decisions
    if (data.decisions) {
      data.decisions.forEach((decision, index) => {
        const decisionErrors = this.validateDecision(decision);
        decisionErrors.forEach(error => {
          errors.push(`Decision ${index + 1}: ${error}`);
        });
      });
    }
    
    // Validate all risks
    if (data.risks) {
      data.risks.forEach((risk, index) => {
        const riskErrors = this.validateRisk(risk);
        riskErrors.forEach(error => {
          errors.push(`Risk ${index + 1}: ${error}`);
        });
      });
    }
    
    // Validate all tasks
    if (data.nextTwoWeeksPlan) {
      data.nextTwoWeeksPlan.forEach((task, index) => {
        const taskErrors = this.validateTask(task);
        taskErrors.forEach(error => {
          errors.push(`Task ${index + 1}: ${error}`);
        });
      });
    }
    
    return errors;
  }
}

// Helper functions
export function createDecision(partial: Partial<Decision>): Decision {
  return {
    id: partial.id || generateId(),
    title: partial.title || '',
    owner: partial.owner || '',
    dueDate: partial.dueDate || getDefaultDueDate(),
    status: partial.status || 'pending',
    context: partial.context,
    createdAt: partial.createdAt || new Date().toISOString(),
    updatedAt: partial.updatedAt || new Date().toISOString()
  };
}

export function createRisk(partial: Partial<Risk>): Risk {
  return {
    id: partial.id || generateId(),
    risk: partial.risk || '',
    severity: partial.severity || 'medium',
    mitigation: partial.mitigation || '',
    owner: partial.owner,
    likelihood: partial.likelihood || 'possible',
    impact: partial.impact,
    createdAt: partial.createdAt || new Date().toISOString(),
    updatedAt: partial.updatedAt || new Date().toISOString()
  };
}

export function createTask(partial: Partial<NextTwoWeeksTask>): NextTwoWeeksTask {
  return {
    id: partial.id || generateId(),
    task: partial.task || '',
    owner: partial.owner || '',
    dueDate: partial.dueDate || getDefaultDueDate(7), // Default to 1 week
    priority: partial.priority || 'medium',
    dependencies: partial.dependencies || [],
    status: partial.status || 'not-started',
    createdAt: partial.createdAt || new Date().toISOString(),
    updatedAt: partial.updatedAt || new Date().toISOString()
  };
}

export function createDecisionOSData(sessionId: string, workspaceId: string): DecisionOSData {
  return {
    sessionId,
    workspaceId,
    decisions: [],
    risks: [],
    nextTwoWeeksPlan: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultDueDate(daysFromNow: number = 14): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

// Severity and Priority mappings for UI
export const SEVERITY_COLORS = {
  low: '#10b981',      // green
  medium: '#f59e0b',   // yellow
  high: '#ef4444',     // red
  critical: '#7c3aed'  // purple
};

export const PRIORITY_COLORS = {
  low: '#6b7280',      // gray
  medium: '#3b82f6',   // blue
  high: '#f59e0b',     // yellow
  urgent: '#ef4444'    // red
};

export const STATUS_COLORS = {
  'pending': '#6b7280',       // gray
  'not-started': '#6b7280',   // gray
  'in-progress': '#3b82f6',   // blue
  'completed': '#10b981',     // green
  'blocked': '#ef4444'        // red
};

