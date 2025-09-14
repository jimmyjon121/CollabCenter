// Run Loop Controller with Budget Enforcement and Kill Switch
import { getBudgetManager, BudgetManager } from '../core/cost/budget';

export interface RunLoopConfig {
  maxConcurrentRuns: number;
  budgetCheckInterval: number; // ms
  gracefulShutdownTimeout: number; // ms
  enableBudgetEnforcement: boolean;
}

export interface ActiveRun {
  id: string;
  sessionId: string;
  startTime: number;
  participants: string[];
  abortController: AbortController;
  stream?: any; // SSE stream
  isActive: boolean;
}

export class RunLoopController {
  private activeRuns: Map<string, ActiveRun> = new Map();
  private budgetManager: BudgetManager;
  private config: RunLoopConfig;
  private budgetCheckInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(config: RunLoopConfig) {
    this.config = config;
    this.budgetManager = getBudgetManager();
    this.setupBudgetEnforcement();
  }

  // Start a new run
  async startRun(
    sessionId: string, 
    participants: string[], 
    stream?: any
  ): Promise<string> {
    if (this.isShuttingDown) {
      throw new Error('System is shutting down, cannot start new runs');
    }

    if (this.activeRuns.size >= this.config.maxConcurrentRuns) {
      throw new Error('Maximum concurrent runs exceeded');
    }

    // Check budget before starting
    if (this.config.enableBudgetEnforcement && !this.budgetManager.canContinue()) {
      throw new Error('Budget exceeded, cannot start new run');
    }

    const runId = crypto.randomUUID();
    const abortController = new AbortController();

    const run: ActiveRun = {
      id: runId,
      sessionId,
      startTime: Date.now(),
      participants,
      abortController,
      stream,
      isActive: true
    };

    this.activeRuns.set(runId, run);

    // Set up abort handling
    abortController.signal.addEventListener('abort', () => {
      this.handleRunAbort(runId);
    });

    console.log(`Started run ${runId} for session ${sessionId}`);
    return runId;
  }

  // End a run
  endRun(runId: string): void {
    const run = this.activeRuns.get(runId);
    if (run) {
      run.isActive = false;
      this.activeRuns.delete(runId);
      console.log(`Ended run ${runId}`);
    }
  }

  // Abort a specific run
  abortRun(runId: string, reason: string = 'Manual abort'): void {
    const run = this.activeRuns.get(runId);
    if (run && run.isActive) {
      console.log(`Aborting run ${runId}: ${reason}`);
      run.abortController.abort();
      this.endRun(runId);
    }
  }

  // Abort all runs for a session
  abortSession(sessionId: string, reason: string = 'Session abort'): void {
    const sessionRuns = Array.from(this.activeRuns.values())
      .filter(run => run.sessionId === sessionId);
    
    sessionRuns.forEach(run => {
      this.abortRun(run.id, reason);
    });
  }

  // Emergency kill switch - abort all runs
  async emergencyKill(reason: string = 'Emergency kill switch'): Promise<void> {
    console.warn(`Emergency kill switch activated: ${reason}`);
    this.isShuttingDown = true;

    const activeRuns = Array.from(this.activeRuns.values());
    
    // Abort all runs immediately
    activeRuns.forEach(run => {
      if (run.isActive) {
        run.abortController.abort();
      }
    });

    // Wait for graceful shutdown or timeout
    const shutdownPromise = this.waitForGracefulShutdown();
    const timeoutPromise = new Promise(resolve => 
      setTimeout(resolve, this.config.gracefulShutdownTimeout)
    );

    await Promise.race([shutdownPromise, timeoutPromise]);
    
    // Force cleanup
    this.activeRuns.clear();
    console.log('Emergency kill switch completed');
  }

  // Get active runs
  getActiveRuns(): ActiveRun[] {
    return Array.from(this.activeRuns.values()).filter(run => run.isActive);
  }

  // Get runs for a session
  getSessionRuns(sessionId: string): ActiveRun[] {
    return Array.from(this.activeRuns.values())
      .filter(run => run.sessionId === sessionId && run.isActive);
  }

  // Check if a run is active
  isRunActive(runId: string): boolean {
    const run = this.activeRuns.get(runId);
    return run ? run.isActive : false;
  }

  // Set up budget enforcement
  private setupBudgetEnforcement(): void {
    if (!this.config.enableBudgetEnforcement) return;

    // Subscribe to budget changes
    this.budgetManager.subscribe((budgetState) => {
      if (budgetState.isExceeded) {
        this.handleBudgetExceeded();
      }
    });

    // Periodic budget check
    this.budgetCheckInterval = setInterval(() => {
      this.checkBudgetStatus();
    }, this.config.budgetCheckInterval);
  }

  // Handle budget exceeded
  private async handleBudgetExceeded(): Promise<void> {
    console.warn('Budget exceeded, initiating emergency shutdown');
    await this.emergencyKill('Budget exceeded');
  }

  // Check budget status
  private checkBudgetStatus(): void {
    if (!this.budgetManager.canContinue()) {
      this.handleBudgetExceeded();
    }
  }

  // Handle run abort
  private handleRunAbort(runId: string): void {
    const run = this.activeRuns.get(runId);
    if (run) {
      run.isActive = false;
      
      // Notify stream if available
      if (run.stream) {
        try {
          run.stream.send('system', { 
            message: 'Run aborted due to budget constraints or manual stop',
            type: 'abort'
          });
        } catch (error) {
          console.error('Error notifying stream of abort:', error);
        }
      }

      this.activeRuns.delete(runId);
      console.log(`Run ${runId} aborted and cleaned up`);
    }
  }

  // Wait for graceful shutdown
  private async waitForGracefulShutdown(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const activeCount = Array.from(this.activeRuns.values())
          .filter(run => run.isActive).length;
        
        if (activeCount === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  // Cleanup
  destroy(): void {
    if (this.budgetCheckInterval) {
      clearInterval(this.budgetCheckInterval);
    }
    
    // Abort all remaining runs
    this.activeRuns.forEach(run => {
      if (run.isActive) {
        run.abortController.abort();
      }
    });
    
    this.activeRuns.clear();
  }
}

// Singleton instance
let globalRunLoopController: RunLoopController | null = null;

export function getRunLoopController(config?: RunLoopConfig): RunLoopController {
  if (!globalRunLoopController) {
    const defaultConfig: RunLoopConfig = {
      maxConcurrentRuns: 10,
      budgetCheckInterval: 5000, // 5 seconds
      gracefulShutdownTimeout: 10000, // 10 seconds
      enableBudgetEnforcement: true,
      ...config
    };
    globalRunLoopController = new RunLoopController(defaultConfig);
  }
  return globalRunLoopController;
}

// Utility functions for integration
export async function withBudgetCheck<T>(
  operation: () => Promise<T>,
  runId?: string
): Promise<T> {
  const runLoop = getRunLoopController();
  const budgetManager = getBudgetManager();

  // Check if run is still active
  if (runId && !runLoop.isRunActive(runId)) {
    throw new Error('Run has been aborted');
  }

  // Check budget
  if (!budgetManager.canContinue()) {
    throw new Error('Budget exceeded, operation cancelled');
  }

  return operation();
}

export function createAbortablePromise<T>(
  promise: Promise<T>,
  abortSignal: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abortHandler = () => {
      reject(new Error('Operation aborted'));
    };

    abortSignal.addEventListener('abort', abortHandler);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        abortSignal.removeEventListener('abort', abortHandler);
      });
  });
}

