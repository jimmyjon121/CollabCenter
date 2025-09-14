// Live Cost Meter UI Component
import React, { useState, useEffect } from 'react';
import { BudgetState, getBudgetManager } from '../core/cost/budget';

interface CostMeterProps {
  className?: string;
  showDetails?: boolean;
  onKillSession?: () => void;
}

export const CostMeter: React.FC<CostMeterProps> = ({ 
  className = '', 
  showDetails = false,
  onKillSession 
}) => {
  const [budgetState, setBudgetState] = useState<BudgetState | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const budgetManager = getBudgetManager();
    
    // Subscribe to budget updates
    const unsubscribe = budgetManager.subscribe(setBudgetState);
    
    // Get initial state
    setBudgetState(budgetManager.getState());

    return unsubscribe;
  }, []);

  if (!budgetState) {
    return <div className="cost-meter loading">Loading budget...</div>;
  }

  const utilization = budgetManager.getUtilizationPercentage();
  const remaining = budgetManager.getRemainingBudget();
  const isNearLimit = budgetState.isWarning || budgetState.isCritical;

  const getStatusColor = () => {
    if (budgetState.isExceeded) return 'text-red-600 bg-red-100';
    if (budgetState.isCritical) return 'text-red-600 bg-red-50';
    if (budgetState.isWarning) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getProgressColor = () => {
    if (budgetState.isExceeded) return 'bg-red-500';
    if (budgetState.isCritical) return 'bg-red-400';
    if (budgetState.isWarning) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  return (
    <div className={`cost-meter ${className}`}>
      {/* Main Meter */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor()}`}>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
            </svg>
            <span className="font-semibold text-sm">Session Budget</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm font-mono">
              ${budgetState.totalSpent.toFixed(2)} / ${budgetState.config.sessionCap.toFixed(2)}
            </span>
            <span className="text-xs opacity-75">
              ({utilization.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Progress Bar */}
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${Math.min(100, utilization)}%` }}
            />
          </div>

          {/* Kill Switch Button */}
          {isNearLimit && (
            <button
              onClick={onKillSession}
              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
              title="Stop session immediately"
            >
              Stop Now
            </button>
          )}

          {/* Details Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
            title={isExpanded ? 'Hide details' : 'Show details'}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-3 p-4 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Provider Breakdown */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">By Provider</h4>
              <div className="space-y-1">
                {Object.entries(budgetState.spentByProvider).map(([provider, amount]) => (
                  <div key={provider} className="flex justify-between text-sm">
                    <span className="capitalize">{provider}</span>
                    <span className="font-mono">${amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Recent Activity</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {budgetState.entries.slice(-5).map(entry => (
                  <div key={entry.id} className="text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span className="truncate">{entry.model}</span>
                      <span className="font-mono">${entry.cost.toFixed(3)}</span>
                    </div>
                    <div className="text-gray-400">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget Status */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Status</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Remaining:</span>
                  <span className="font-mono">${remaining.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Utilization:</span>
                  <span className="font-mono">{utilization.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    budgetState.isExceeded ? 'bg-red-100 text-red-800' :
                    budgetState.isCritical ? 'bg-red-50 text-red-700' :
                    budgetState.isWarning ? 'bg-yellow-50 text-yellow-700' :
                    'bg-green-50 text-green-700'
                  }`}>
                    {budgetState.isExceeded ? 'Exceeded' :
                     budgetState.isCritical ? 'Critical' :
                     budgetState.isWarning ? 'Warning' : 'Normal'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Messages */}
          {budgetState.isWarning && !budgetState.isExceeded && (
            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
              ⚠️ Approaching budget limit. Consider reducing model complexity or ending session soon.
            </div>
          )}

          {budgetState.isCritical && !budgetState.isExceeded && (
            <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-800">
              🚨 Budget nearly exceeded! Session will be terminated automatically if limit is reached.
            </div>
          )}

          {budgetState.isExceeded && (
            <div className="mt-3 p-2 bg-red-200 border border-red-400 rounded text-sm text-red-900">
              ❌ Budget exceeded! Session terminated to prevent additional charges.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Compact version for smaller spaces
export const CompactCostMeter: React.FC<{ onKillSession?: () => void }> = ({ onKillSession }) => {
  const [budgetState, setBudgetState] = useState<BudgetState | null>(null);

  useEffect(() => {
    const budgetManager = getBudgetManager();
    const unsubscribe = budgetManager.subscribe(setBudgetState);
    setBudgetState(budgetManager.getState());
    return unsubscribe;
  }, []);

  if (!budgetState) return null;

  const utilization = (budgetState.totalSpent / budgetState.config.sessionCap) * 100;
  const isNearLimit = budgetState.isWarning || budgetState.isCritical;

  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="font-mono">
        ${budgetState.totalSpent.toFixed(2)}/${budgetState.config.sessionCap.toFixed(2)}
      </span>
      <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all ${
            budgetState.isExceeded ? 'bg-red-500' :
            budgetState.isCritical ? 'bg-red-400' :
            budgetState.isWarning ? 'bg-yellow-400' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(100, utilization)}%` }}
        />
      </div>
      {isNearLimit && (
        <button
          onClick={onKillSession}
          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
        >
          Stop
        </button>
      )}
    </div>
  );
};

