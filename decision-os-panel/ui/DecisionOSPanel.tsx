// DecisionOS Panel React Component
import React, { useState, useEffect, useCallback } from 'react';
import {
  Decision,
  Risk,
  NextTwoWeeksTask,
  DecisionOSData,
  DecisionOSValidator,
  createDecision,
  createRisk,
  createTask,
  createDecisionOSData,
  SEVERITY_COLORS,
  PRIORITY_COLORS,
  STATUS_COLORS
} from '../core/decisionOS';

interface DecisionOSPanelProps {
  sessionId: string;
  workspaceId: string;
  onSave?: (data: DecisionOSData) => void;
  onExport?: (data: DecisionOSData) => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
  className?: string;
}

export const DecisionOSPanel: React.FC<DecisionOSPanelProps> = ({
  sessionId,
  workspaceId,
  onSave,
  onExport,
  autoSave = true,
  autoSaveDelay = 5000,
  className = ''
}) => {
  const [data, setData] = useState<DecisionOSData>(() => 
    createDecisionOSData(sessionId, workspaceId)
  );
  const [activeTab, setActiveTab] = useState<'decisions' | 'risks' | 'plan'>('decisions');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [sessionId]);

  // Auto-save
  useEffect(() => {
    if (!autoSave) return;
    
    const timer = setTimeout(() => {
      saveData();
    }, autoSaveDelay);
    
    return () => clearTimeout(timer);
  }, [data, autoSave, autoSaveDelay]);

  const loadData = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/decisions`);
      if (response.ok) {
        const loadedData = await response.json();
        setData(loadedData);
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Failed to load decisions:', error);
    }
  };

  const saveData = async () => {
    const validationErrors = DecisionOSValidator.validateDecisionOSData(data);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    setErrors([]);
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        setLastSaved(new Date());
        onSave?.(data);
      }
    } catch (error) {
      console.error('Failed to save decisions:', error);
      setErrors(['Failed to save data']);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    onExport?.(data);
  };

  // Decision handlers
  const addDecision = () => {
    const newDecision = createDecision({
      title: 'New Decision',
      owner: 'Unassigned',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    setData(prev => ({
      ...prev,
      decisions: [...prev.decisions, newDecision],
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() }
    }));
    setEditingItem(newDecision.id);
  };

  const updateDecision = (id: string, updates: Partial<Decision>) => {
    setData(prev => ({
      ...prev,
      decisions: prev.decisions.map(d => 
        d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
      ),
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() }
    }));
  };

  const deleteDecision = (id: string) => {
    setData(prev => ({
      ...prev,
      decisions: prev.decisions.filter(d => d.id !== id),
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() }
    }));
  };

  // Risk handlers
  const addRisk = () => {
    const newRisk = createRisk({
      risk: 'New Risk',
      severity: 'medium',
      mitigation: 'Mitigation strategy needed'
    });
    setData(prev => ({
      ...prev,
      risks: [...prev.risks, newRisk],
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() }
    }));
    setEditingItem(newRisk.id);
  };

  const updateRisk = (id: string, updates: Partial<Risk>) => {
    setData(prev => ({
      ...prev,
      risks: prev.risks.map(r => 
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      ),
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() }
    }));
  };

  const deleteRisk = (id: string) => {
    setData(prev => ({
      ...prev,
      risks: prev.risks.filter(r => r.id !== id),
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() }
    }));
  };

  // Task handlers
  const addTask = () => {
    const newTask = createTask({
      task: 'New Task',
      owner: 'Unassigned',
      priority: 'medium'
    });
    setData(prev => ({
      ...prev,
      nextTwoWeeksPlan: [...prev.nextTwoWeeksPlan, newTask],
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() }
    }));
    setEditingItem(newTask.id);
  };

  const updateTask = (id: string, updates: Partial<NextTwoWeeksTask>) => {
    setData(prev => ({
      ...prev,
      nextTwoWeeksPlan: prev.nextTwoWeeksPlan.map(t => 
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() }
    }));
  };

  const deleteTask = (id: string) => {
    setData(prev => ({
      ...prev,
      nextTwoWeeksPlan: prev.nextTwoWeeksPlan.filter(t => t.id !== id),
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() }
    }));
  };

  return (
    <div className={`decision-os-panel ${className}`}>
      <div className="panel-header">
        <h2>Decision OS</h2>
        <div className="panel-controls">
          <span className="save-status">
            {isSaving ? 'Saving...' : lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Not saved'}
          </span>
          <button onClick={saveData} disabled={isSaving}>Save</button>
          <button onClick={handleExport}>Export</button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="error-banner">
          {errors.map((error, i) => (
            <div key={i}>{error}</div>
          ))}
        </div>
      )}

      <div className="panel-tabs">
        <button 
          className={activeTab === 'decisions' ? 'active' : ''}
          onClick={() => setActiveTab('decisions')}
        >
          Decisions ({data.decisions.length})
        </button>
        <button 
          className={activeTab === 'risks' ? 'active' : ''}
          onClick={() => setActiveTab('risks')}
        >
          Risks ({data.risks.length})
        </button>
        <button 
          className={activeTab === 'plan' ? 'active' : ''}
          onClick={() => setActiveTab('plan')}
        >
          Next 2 Weeks ({data.nextTwoWeeksPlan.length})
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'decisions' && (
          <div className="decisions-section">
            <div className="section-header">
              <h3>Decisions</h3>
              <button onClick={addDecision} className="add-button">+ Add Decision</button>
            </div>
            {data.decisions.length === 0 ? (
              <div className="empty-state">No decisions recorded yet</div>
            ) : (
              <div className="items-list">
                {data.decisions.map(decision => (
                  <DecisionItem
                    key={decision.id}
                    decision={decision}
                    isEditing={editingItem === decision.id}
                    onEdit={() => setEditingItem(decision.id)}
                    onSave={(updates) => {
                      updateDecision(decision.id, updates);
                      setEditingItem(null);
                    }}
                    onCancel={() => setEditingItem(null)}
                    onDelete={() => deleteDecision(decision.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="risks-section">
            <div className="section-header">
              <h3>Risks</h3>
              <button onClick={addRisk} className="add-button">+ Add Risk</button>
            </div>
            {data.risks.length === 0 ? (
              <div className="empty-state">No risks identified yet</div>
            ) : (
              <div className="items-list">
                {data.risks.map(risk => (
                  <RiskItem
                    key={risk.id}
                    risk={risk}
                    isEditing={editingItem === risk.id}
                    onEdit={() => setEditingItem(risk.id)}
                    onSave={(updates) => {
                      updateRisk(risk.id, updates);
                      setEditingItem(null);
                    }}
                    onCancel={() => setEditingItem(null)}
                    onDelete={() => deleteRisk(risk.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="plan-section">
            <div className="section-header">
              <h3>Next 2 Weeks Plan</h3>
              <button onClick={addTask} className="add-button">+ Add Task</button>
            </div>
            {data.nextTwoWeeksPlan.length === 0 ? (
              <div className="empty-state">No tasks scheduled</div>
            ) : (
              <div className="items-list">
                {data.nextTwoWeeksPlan
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isEditing={editingItem === task.id}
                      onEdit={() => setEditingItem(task.id)}
                      onSave={(updates) => {
                        updateTask(task.id, updates);
                        setEditingItem(null);
                      }}
                      onCancel={() => setEditingItem(null)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Individual item components
const DecisionItem: React.FC<{
  decision: Decision;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<Decision>) => void;
  onCancel: () => void;
  onDelete: () => void;
}> = ({ decision, isEditing, onEdit, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState(decision);

  if (isEditing) {
    return (
      <div className="item-card editing">
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Decision title"
        />
        <input
          type="text"
          value={formData.owner}
          onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
          placeholder="Owner"
        />
        <input
          type="date"
          value={formData.dueDate.split('T')[0]}
          onChange={(e) => setFormData({ ...formData, dueDate: new Date(e.target.value).toISOString() })}
        />
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as Decision['status'] })}
        >
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
        </select>
        <textarea
          value={formData.context || ''}
          onChange={(e) => setFormData({ ...formData, context: e.target.value })}
          placeholder="Context (optional)"
        />
        <div className="item-actions">
          <button onClick={() => onSave(formData)}>Save</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="item-card">
      <div className="item-header">
        <h4>{decision.title}</h4>
        <span 
          className="status-badge"
          style={{ backgroundColor: STATUS_COLORS[decision.status] }}
        >
          {decision.status}
        </span>
      </div>
      <div className="item-details">
        <span>Owner: {decision.owner}</span>
        <span>Due: {new Date(decision.dueDate).toLocaleDateString()}</span>
      </div>
      {decision.context && (
        <div className="item-context">{decision.context}</div>
      )}
      <div className="item-actions">
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
};

const RiskItem: React.FC<{
  risk: Risk;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<Risk>) => void;
  onCancel: () => void;
  onDelete: () => void;
}> = ({ risk, isEditing, onEdit, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState(risk);

  if (isEditing) {
    return (
      <div className="item-card editing">
        <textarea
          value={formData.risk}
          onChange={(e) => setFormData({ ...formData, risk: e.target.value })}
          placeholder="Risk description"
        />
        <select
          value={formData.severity}
          onChange={(e) => setFormData({ ...formData, severity: e.target.value as Risk['severity'] })}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={formData.likelihood}
          onChange={(e) => setFormData({ ...formData, likelihood: e.target.value as Risk['likelihood'] })}
        >
          <option value="unlikely">Unlikely</option>
          <option value="possible">Possible</option>
          <option value="likely">Likely</option>
          <option value="certain">Certain</option>
        </select>
        <textarea
          value={formData.mitigation}
          onChange={(e) => setFormData({ ...formData, mitigation: e.target.value })}
          placeholder="Mitigation strategy"
        />
        <input
          type="text"
          value={formData.owner || ''}
          onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
          placeholder="Owner (optional)"
        />
        <div className="item-actions">
          <button onClick={() => onSave(formData)}>Save</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="item-card">
      <div className="item-header">
        <h4>{risk.risk}</h4>
        <span 
          className="severity-badge"
          style={{ backgroundColor: SEVERITY_COLORS[risk.severity] }}
        >
          {risk.severity}
        </span>
      </div>
      <div className="item-details">
        <span>Likelihood: {risk.likelihood}</span>
        {risk.owner && <span>Owner: {risk.owner}</span>}
      </div>
      <div className="mitigation">
        <strong>Mitigation:</strong> {risk.mitigation}
      </div>
      <div className="item-actions">
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
};

const TaskItem: React.FC<{
  task: NextTwoWeeksTask;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<NextTwoWeeksTask>) => void;
  onCancel: () => void;
  onDelete: () => void;
}> = ({ task, isEditing, onEdit, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState(task);

  if (isEditing) {
    return (
      <div className="item-card editing">
        <textarea
          value={formData.task}
          onChange={(e) => setFormData({ ...formData, task: e.target.value })}
          placeholder="Task description"
        />
        <input
          type="text"
          value={formData.owner}
          onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
          placeholder="Owner"
        />
        <input
          type="date"
          value={formData.dueDate.split('T')[0]}
          onChange={(e) => setFormData({ ...formData, dueDate: new Date(e.target.value).toISOString() })}
        />
        <select
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as NextTwoWeeksTask['priority'] })}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as NextTwoWeeksTask['status'] })}
        >
          <option value="not-started">Not Started</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
        </select>
        <div className="item-actions">
          <button onClick={() => onSave(formData)}>Save</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="item-card">
      <div className="item-header">
        <h4>{task.task}</h4>
        <span 
          className="priority-badge"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
        >
          {task.priority}
        </span>
      </div>
      <div className="item-details">
        <span>Owner: {task.owner}</span>
        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
        <span 
          className="status-badge"
          style={{ backgroundColor: STATUS_COLORS[task.status] }}
        >
          {task.status}
        </span>
      </div>
      {task.dependencies && task.dependencies.length > 0 && (
        <div className="dependencies">
          Dependencies: {task.dependencies.join(', ')}
        </div>
      )}
      <div className="item-actions">
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
};

