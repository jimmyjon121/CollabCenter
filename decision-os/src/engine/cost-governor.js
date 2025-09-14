// Cost Governor - Budget enforcement and token tracking
import EventEmitter from 'events';

export class CostGovernor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      defaultBudgetUSD: 5.00,
      killSwitchThreshold: 0.95,
      warningThreshold: 0.75,
      tokenPricing: {
        // OpenAI pricing per 1K tokens
        'gpt-4o': { prompt: 0.005, completion: 0.015 },
        'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
        'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
        'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
        // Anthropic pricing
        'claude-3-opus': { prompt: 0.015, completion: 0.075 },
        'claude-3-sonnet': { prompt: 0.003, completion: 0.015 },
        'claude-3-haiku': { prompt: 0.00025, completion: 0.00125 },
        // Google pricing
        'gemini-pro': { prompt: 0.00025, completion: 0.0005 },
        'gemini-ultra': { prompt: 0.007, completion: 0.021 }
      },
      ...config
    };
    
    this.budgets = new Map(); // sessionId -> budget state
    this.usage = new Map(); // sessionId -> usage history
  }

  createBudget(sessionId, config = {}) {
    const budget = {
      total: config.usd || this.config.defaultBudgetUSD,
      spent: 0,
      remaining: config.usd || this.config.defaultBudgetUSD,
      warningIssued: false,
      killSwitchArmed: false,
      limits: {
        perAgent: config.perAgent || null,
        perRound: config.perRound || null,
        perModel: config.perModel || {}
      },
      created: Date.now(),
      history: []
    };
    
    this.budgets.set(sessionId, budget);
    this.usage.set(sessionId, []);
    
    this.emit('budget:created', { sessionId, budget });
    return budget;
  }

  async checkBudget(sessionId, estimatedCost = 0) {
    const budget = this.budgets.get(sessionId);
    if (!budget) {
      throw new Error(`No budget found for session ${sessionId}`);
    }

    const projectedSpend = budget.spent + estimatedCost;
    const utilizationRate = projectedSpend / budget.total;

    // Check kill switch threshold
    if (utilizationRate >= this.config.killSwitchThreshold) {
      if (!budget.killSwitchArmed) {
        budget.killSwitchArmed = true;
        this.emit('budget:killswitch', { 
          sessionId, 
          spent: budget.spent,
          total: budget.total,
          utilization: utilizationRate 
        });
      }
      return false;
    }

    // Check warning threshold
    if (utilizationRate >= this.config.warningThreshold && !budget.warningIssued) {
      budget.warningIssued = true;
      this.emit('budget:warning', { 
        sessionId, 
        spent: budget.spent,
        total: budget.total,
        utilization: utilizationRate 
      });
    }

    return true;
  }

  async trackUsage(sessionId, usage) {
    const budget = this.budgets.get(sessionId);
    if (!budget) {
      throw new Error(`No budget found for session ${sessionId}`);
    }

    // Calculate cost
    const pricing = this.config.tokenPricing[usage.model];
    if (!pricing) {
      throw new Error(`No pricing found for model ${usage.model}`);
    }

    const promptCost = (usage.promptTokens / 1000) * pricing.prompt;
    const completionCost = (usage.completionTokens / 1000) * pricing.completion;
    const totalCost = promptCost + completionCost;

    // Update budget
    budget.spent += totalCost;
    budget.remaining = budget.total - budget.spent;
    
    // Record usage
    const usageRecord = {
      timestamp: Date.now(),
      model: usage.model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.promptTokens + usage.completionTokens,
      promptCost,
      completionCost,
      totalCost
    };
    
    budget.history.push(usageRecord);
    this.usage.get(sessionId).push(usageRecord);

    // Check per-model limits
    if (budget.limits.perModel[usage.model]) {
      const modelSpend = budget.history
        .filter(h => h.model === usage.model)
        .reduce((sum, h) => sum + h.totalCost, 0);
      
      if (modelSpend > budget.limits.perModel[usage.model]) {
        this.emit('budget:model-limit', { 
          sessionId, 
          model: usage.model,
          spent: modelSpend,
          limit: budget.limits.perModel[usage.model]
        });
      }
    }

    this.emit('usage:tracked', { 
      sessionId, 
      usage: usageRecord,
      budget: {
        spent: budget.spent,
        remaining: budget.remaining,
        utilization: budget.spent / budget.total
      }
    });

    return {
      callCost: totalCost,
      totalCost: budget.spent,
      remaining: budget.remaining,
      utilization: budget.spent / budget.total
    };
  }

  shouldKill(sessionId) {
    const budget = this.budgets.get(sessionId);
    if (!budget) return true;
    
    return budget.killSwitchArmed || 
           (budget.spent / budget.total) >= this.config.killSwitchThreshold;
  }

  getBudgetStatus(sessionId) {
    const budget = this.budgets.get(sessionId);
    if (!budget) return null;

    const utilization = budget.spent / budget.total;
    
    return {
      total: budget.total,
      spent: budget.spent,
      remaining: budget.remaining,
      utilization,
      utilizationPercent: Math.round(utilization * 100),
      status: this.getStatus(utilization),
      warningIssued: budget.warningIssued,
      killSwitchArmed: budget.killSwitchArmed,
      projectedOverrun: this.projectOverrun(sessionId)
    };
  }

  getStatus(utilization) {
    if (utilization >= this.config.killSwitchThreshold) return 'critical';
    if (utilization >= this.config.warningThreshold) return 'warning';
    if (utilization >= 0.5) return 'moderate';
    return 'healthy';
  }

  projectOverrun(sessionId) {
    const usage = this.usage.get(sessionId);
    if (!usage || usage.length < 2) return null;

    // Calculate burn rate
    const recentUsage = usage.slice(-5);
    const avgCostPerCall = recentUsage.reduce((sum, u) => sum + u.totalCost, 0) / recentUsage.length;
    
    const budget = this.budgets.get(sessionId);
    const remainingCalls = Math.floor(budget.remaining / avgCostPerCall);
    
    return {
      avgCostPerCall,
      remainingCalls,
      projectedTotal: budget.spent + (avgCostPerCall * 10), // Project 10 more calls
      willExceed: budget.spent + (avgCostPerCall * 10) > budget.total
    };
  }

  getUsageReport(sessionId) {
    const budget = this.budgets.get(sessionId);
    const usage = this.usage.get(sessionId);
    
    if (!budget || !usage) return null;

    // Aggregate by model
    const byModel = {};
    usage.forEach(u => {
      if (!byModel[u.model]) {
        byModel[u.model] = {
          calls: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          totalCost: 0
        };
      }
      byModel[u.model].calls++;
      byModel[u.model].promptTokens += u.promptTokens;
      byModel[u.model].completionTokens += u.completionTokens;
      byModel[u.model].totalTokens += u.totalTokens;
      byModel[u.model].totalCost += u.totalCost;
    });

    // Time-based analysis
    const startTime = usage[0]?.timestamp || Date.now();
    const endTime = usage[usage.length - 1]?.timestamp || Date.now();
    const duration = endTime - startTime;
    
    return {
      summary: {
        totalCalls: usage.length,
        totalTokens: usage.reduce((sum, u) => sum + u.totalTokens, 0),
        totalCost: budget.spent,
        avgCostPerCall: budget.spent / usage.length,
        duration: duration,
        tokensPerSecond: usage.reduce((sum, u) => sum + u.totalTokens, 0) / (duration / 1000)
      },
      byModel,
      timeline: usage.map(u => ({
        timestamp: u.timestamp,
        model: u.model,
        cost: u.totalCost,
        cumulativeCost: usage.slice(0, usage.indexOf(u) + 1)
          .reduce((sum, u2) => sum + u2.totalCost, 0)
      })),
      budget: this.getBudgetStatus(sessionId)
    };
  }

  // Admin controls
  adjustBudget(sessionId, newBudget) {
    const budget = this.budgets.get(sessionId);
    if (!budget) throw new Error(`No budget found for session ${sessionId}`);
    
    const oldBudget = budget.total;
    budget.total = newBudget;
    budget.remaining = newBudget - budget.spent;
    
    // Reset warnings if budget increased
    if (newBudget > oldBudget) {
      budget.warningIssued = false;
      budget.killSwitchArmed = false;
    }
    
    this.emit('budget:adjusted', { 
      sessionId, 
      oldBudget, 
      newBudget,
      spent: budget.spent
    });
    
    return this.getBudgetStatus(sessionId);
  }

  enforceHardStop(sessionId) {
    const budget = this.budgets.get(sessionId);
    if (budget) {
      budget.killSwitchArmed = true;
      this.emit('budget:hardstop', { sessionId });
    }
  }

  reset(sessionId) {
    this.budgets.delete(sessionId);
    this.usage.delete(sessionId);
    this.emit('budget:reset', { sessionId });
  }

  // Export for billing
  exportUsage(sessionId, format = 'json') {
    const report = this.getUsageReport(sessionId);
    if (!report) return null;

    switch (format) {
      case 'csv':
        return this.toCSV(report);
      case 'json':
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  toCSV(report) {
    const rows = [
      ['Timestamp', 'Model', 'Prompt Tokens', 'Completion Tokens', 'Total Tokens', 'Cost']
    ];
    
    report.timeline.forEach(entry => {
      const usage = this.usage.get(entry.sessionId)?.find(u => u.timestamp === entry.timestamp);
      if (usage) {
        rows.push([
          new Date(usage.timestamp).toISOString(),
          usage.model,
          usage.promptTokens,
          usage.completionTokens,
          usage.totalTokens,
          usage.totalCost.toFixed(6)
        ]);
      }
    });
    
    return rows.map(row => row.join(',')).join('\n');
  }
}

