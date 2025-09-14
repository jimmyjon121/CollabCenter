// Budget Management System - Per-session caps and provider tracking
export interface BudgetConfig {
  sessionCap: number; // Total budget for session in USD
  providerCaps: {
    openai: number;
    anthropic: number;
    gemini: number;
  };
  warningThreshold: number; // Percentage (0-1) to show warning
  criticalThreshold: number; // Percentage (0-1) to show critical warning
}

export interface CostEntry {
  id: string;
  timestamp: number;
  provider: 'openai' | 'anthropic' | 'gemini';
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  requestId?: string;
  sessionId: string;
}

export interface BudgetState {
  config: BudgetConfig;
  totalSpent: number;
  spentByProvider: {
    openai: number;
    anthropic: number;
    gemini: number;
  };
  entries: CostEntry[];
  isExceeded: boolean;
  isWarning: boolean;
  isCritical: boolean;
  lastUpdated: number;
}

export class BudgetManager {
  private state: BudgetState;
  private listeners: Set<(state: BudgetState) => void> = new Set();
  private killSwitchCallbacks: Set<() => void> = new Set();

  constructor(config: BudgetConfig) {
    this.state = {
      config,
      totalSpent: 0,
      spentByProvider: {
        openai: 0,
        anthropic: 0,
        gemini: 0
      },
      entries: [],
      isExceeded: false,
      isWarning: false,
      isCritical: false,
      lastUpdated: Date.now()
    };
  }

  // Add cost entry and update state
  addCost(entry: Omit<CostEntry, 'id' | 'timestamp' | 'cost'>): boolean {
    const cost = this.calculateCost(entry);
    const fullEntry: CostEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      cost
    };

    // Check if adding this cost would exceed budget
    if (this.state.totalSpent + cost > this.state.config.sessionCap) {
      this.triggerKillSwitch('Budget exceeded');
      return false;
    }

    // Check provider-specific cap
    const providerSpent = this.state.spentByProvider[entry.provider];
    if (providerSpent + cost > this.state.config.providerCaps[entry.provider]) {
      this.triggerKillSwitch(`Provider ${entry.provider} budget exceeded`);
      return false;
    }

    // Add entry and update state
    this.state.entries.push(fullEntry);
    this.state.totalSpent += cost;
    this.state.spentByProvider[entry.provider] += cost;
    this.state.lastUpdated = Date.now();

    // Update warning states
    this.updateWarningStates();

    // Notify listeners
    this.notifyListeners();

    return true;
  }

  // Calculate cost based on provider and model
  private calculateCost(entry: Omit<CostEntry, 'id' | 'timestamp' | 'cost'>): number {
    const pricing = this.getPricing(entry.provider, entry.model);
    const inputCost = (entry.inputTokens / 1000) * pricing.inputPer1k;
    const outputCost = (entry.outputTokens / 1000) * pricing.outputPer1k;
    return inputCost + outputCost;
  }

  // Get pricing for provider/model combination
  private getPricing(provider: string, model: string): { inputPer1k: number; outputPer1k: number } {
    const pricing: Record<string, Record<string, { inputPer1k: number; outputPer1k: number }>> = {
      openai: {
        'gpt-4': { inputPer1k: 0.03, outputPer1k: 0.06 },
        'gpt-4-turbo': { inputPer1k: 0.01, outputPer1k: 0.03 },
        'gpt-3.5-turbo': { inputPer1k: 0.001, outputPer1k: 0.002 },
        'gpt-3.5-turbo-16k': { inputPer1k: 0.003, outputPer1k: 0.004 }
      },
      anthropic: {
        'claude-3-opus': { inputPer1k: 0.015, outputPer1k: 0.075 },
        'claude-3-sonnet': { inputPer1k: 0.003, outputPer1k: 0.015 },
        'claude-3-haiku': { inputPer1k: 0.00025, outputPer1k: 0.00125 }
      },
      gemini: {
        'gemini-pro': { inputPer1k: 0.0005, outputPer1k: 0.0015 },
        'gemini-pro-vision': { inputPer1k: 0.0005, outputPer1k: 0.0015 }
      }
    };

    return pricing[provider]?.[model] || { inputPer1k: 0.01, outputPer1k: 0.02 };
  }

  // Update warning states based on spending
  private updateWarningStates(): void {
    const percentage = this.state.totalSpent / this.state.config.sessionCap;
    
    this.state.isWarning = percentage >= this.state.config.warningThreshold;
    this.state.isCritical = percentage >= this.state.config.criticalThreshold;
    this.state.isExceeded = percentage >= 1.0;
  }

  // Get current budget state
  getState(): BudgetState {
    return { ...this.state };
  }

  // Subscribe to budget state changes
  subscribe(listener: (state: BudgetState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of state changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Register kill switch callback
  onKillSwitch(callback: () => void): () => void {
    this.killSwitchCallbacks.add(callback);
    return () => this.killSwitchCallbacks.delete(callback);
  }

  // Trigger kill switch
  private triggerKillSwitch(reason: string): void {
    console.warn(`Budget kill switch triggered: ${reason}`);
    this.state.isExceeded = true;
    this.killSwitchCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in kill switch callback:', error);
      }
    });
  }

  // Manual kill switch trigger
  killSession(reason: string = 'Manual kill switch'): void {
    this.triggerKillSwitch(reason);
  }

  // Reset budget for new session
  reset(newConfig?: Partial<BudgetConfig>): void {
    if (newConfig) {
      this.state.config = { ...this.state.config, ...newConfig };
    }
    
    this.state.totalSpent = 0;
    this.state.spentByProvider = {
      openai: 0,
      anthropic: 0,
      gemini: 0
    };
    this.state.entries = [];
    this.state.isExceeded = false;
    this.state.isWarning = false;
    this.state.isCritical = false;
    this.state.lastUpdated = Date.now();
    
    this.notifyListeners();
  }

  // Get spending breakdown
  getSpendingBreakdown(): {
    total: number;
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
    recentEntries: CostEntry[];
  } {
    const byModel: Record<string, number> = {};
    this.state.entries.forEach(entry => {
      byModel[entry.model] = (byModel[entry.model] || 0) + entry.cost;
    });

    return {
      total: this.state.totalSpent,
      byProvider: { ...this.state.spentByProvider },
      byModel,
      recentEntries: this.state.entries.slice(-10) // Last 10 entries
    };
  }

  // Check if session can continue
  canContinue(): boolean {
    return !this.state.isExceeded;
  }

  // Get remaining budget
  getRemainingBudget(): number {
    return Math.max(0, this.state.config.sessionCap - this.state.totalSpent);
  }

  // Get budget utilization percentage
  getUtilizationPercentage(): number {
    return Math.min(100, (this.state.totalSpent / this.state.config.sessionCap) * 100);
  }
}

// Default budget configurations
export const DEFAULT_BUDGET_CONFIGS = {
  free: {
    sessionCap: 5.00,
    providerCaps: { openai: 3.00, anthropic: 1.00, gemini: 1.00 },
    warningThreshold: 0.7,
    criticalThreshold: 0.9
  },
  pro: {
    sessionCap: 50.00,
    providerCaps: { openai: 30.00, anthropic: 10.00, gemini: 10.00 },
    warningThreshold: 0.8,
    criticalThreshold: 0.95
  },
  enterprise: {
    sessionCap: 500.00,
    providerCaps: { openai: 300.00, anthropic: 100.00, gemini: 100.00 },
    warningThreshold: 0.85,
    criticalThreshold: 0.98
  }
};

// Singleton budget manager instance
let globalBudgetManager: BudgetManager | null = null;

export function getBudgetManager(config?: BudgetConfig): BudgetManager {
  if (!globalBudgetManager) {
    const defaultConfig = config || DEFAULT_BUDGET_CONFIGS.pro;
    globalBudgetManager = new BudgetManager(defaultConfig);
  }
  return globalBudgetManager;
}

export function resetBudgetManager(config?: BudgetConfig): BudgetManager {
  globalBudgetManager = null;
  return getBudgetManager(config);
}

