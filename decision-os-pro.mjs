#!/usr/bin/env node

// ClearHive Health Launch Platform - Strategic Decision & Planning System
// Version 1.0 - Customized for ClearHive Health Launch
// Built for Jimmy & Mike to launch and scale ClearHive Health

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { CLEARHIVE_CONTEXT, CLEARHIVE_ADVISORS, CLEARHIVE_TEMPLATES } from './clearhive-config.mjs';

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================

const CONFIG = {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'production',
  
  // API Keys (use environment variables in production)
  providers: {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY
  },
  
  // Security & Compliance
  security: {
    requireAuth: process.env.REQUIRE_AUTH === 'true',
    adminToken: process.env.ADMIN_TOKEN,
    encryptionKey: process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
    sessionTimeout: 3600000, // 1 hour
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFileTypes: ['.pdf', '.docx', '.xlsx', '.txt', '.md', '.json']
  },
  
  // Financial Modeling Defaults - Healthcare Startup Focus
  financial: {
    defaultCurrency: 'USD',
    fiscalYearStart: 'January',
    defaultTaxRate: 0.21,
    defaultDiscountRate: 0.12, // Higher for healthcare startups
    defaultBurnRate: 50000, // Monthly burn estimate
    defaultRunway: 18, // Months
    revenueMultiple: 4.5 // Healthcare SaaS average
  },
  
  // AI Configuration
  ai: {
    maxTokensPerRequest: 4000,
    temperature: 0.7,
    defaultModel: 'gpt-4-turbo-preview',
    costLimits: {
      perSession: 50.00,
      perDay: 500.00,
      perMonth: 5000.00
    }
  },
  
  // Data Persistence
  storage: {
    dataDir: './decision-os-data',
    sessionsDir: './decision-os-data/sessions',
    documentsDir: './decision-os-data/documents',
    exportsDir: './decision-os-data/exports',
    templatesDir: './decision-os-data/templates',
    auditDir: './decision-os-data/audit'
  }
};

// ==========================================
// CLEARHIVE HEALTH ADVISOR CONFIGURATIONS
// ==========================================

const EXECUTIVE_AGENTS = {
  ceo: {
    name: 'Healthcare CEO Advisor',
    role: 'Healthcare industry vision, regulatory navigation, and strategic partnerships',
    personality: 'Patient-focused, compliance-aware, growth-oriented',
    expertise: ['Healthcare Strategy', 'HIPAA Compliance', 'Provider Relations', 'Patient Experience'],
    constraints: [
      'Prioritize patient outcomes and safety',
      'Ensure HIPAA and regulatory compliance',
      'Build trust with healthcare providers',
      'Focus on sustainable healthcare innovation'
    ],
    model: 'gpt-4-turbo-preview',
    temperature: 0.8
  },
  
  cfo: {
    name: 'Healthcare CFO Advisor',
    role: 'Healthcare finance, reimbursement models, and venture funding',
    personality: 'Strategic, metrics-driven, investor-focused',
    expertise: ['Healthcare Economics', 'Reimbursement Models', 'Venture Funding', 'Unit Economics'],
    constraints: [
      'Understand healthcare payment models',
      'Optimize for both growth and burn rate',
      'Track healthcare-specific KPIs',
      'Plan for Series A readiness'
    ],
    model: 'gpt-4-turbo-preview',
    temperature: 0.6
  },
  
  cto: {
    name: 'Healthcare Tech Advisor',
    role: 'Health tech architecture, HIPAA compliance, and interoperability',
    personality: 'Security-first, integration-focused, scalable-thinking',
    expertise: ['HIPAA Technical Compliance', 'HL7/FHIR', 'Cloud Security', 'Healthcare APIs'],
    constraints: [
      'Ensure HIPAA technical safeguards',
      'Build for healthcare interoperability',
      'Implement zero-trust security',
      'Design for clinical workflow integration'
    ],
    model: 'gpt-4-turbo-preview',
    temperature: 0.7
  },
  
  coo: {
    name: 'Clinical Operations Advisor',
    role: 'Clinical operations, provider onboarding, and care delivery optimization',
    personality: 'Process-driven, patient-centric, quality-focused',
    expertise: ['Clinical Workflows', 'Provider Engagement', 'Quality Measures', 'Care Coordination'],
    constraints: [
      'Optimize clinical workflows',
      'Ensure care quality standards',
      'Streamline provider onboarding',
      'Monitor clinical outcomes'
    ],
    model: 'gpt-4-turbo-preview',
    temperature: 0.6
  },
  
  cmo: {
    name: 'Healthcare Marketing Advisor',
    role: 'Healthcare marketing, provider adoption, and patient engagement',
    personality: 'Empathetic, trust-building, outcome-focused',
    expertise: ['Healthcare Marketing', 'Provider Relations', 'Patient Engagement', 'Digital Health Adoption'],
    constraints: [
      'Build trust with healthcare stakeholders',
      'Communicate clinical value clearly',
      'Navigate healthcare marketing regulations',
      'Focus on patient success stories'
    ],
    model: 'gpt-4-turbo-preview',
    temperature: 0.7
  },
  
  legal: {
    name: 'Healthcare Legal Advisor',
    role: 'Healthcare regulations, HIPAA compliance, and FDA considerations',
    personality: 'Detail-oriented, regulation-savvy, risk-mitigating',
    expertise: ['HIPAA Law', 'FDA Regulations', 'Healthcare Contracts', 'Telehealth Law'],
    constraints: [
      'Ensure HIPAA compliance',
      'Navigate FDA regulations if applicable',
      'Understand state healthcare laws',
      'Protect patient privacy rights'
    ],
    model: 'gpt-4-turbo-preview',
    temperature: 0.5
  },
  
  strategist: {
    name: 'Healthcare Strategy Advisor',
    role: 'Healthcare market analysis, competitive positioning, and growth strategy',
    personality: 'Market-savvy, partnership-focused, innovation-driven',
    expertise: ['Healthcare Market Analysis', 'Payer Strategy', 'Provider Partnerships', 'Digital Health Trends'],
    constraints: [
      'Understand healthcare ecosystem dynamics',
      'Identify strategic partnership opportunities',
      'Analyze competitive digital health landscape',
      'Focus on scalable go-to-market strategies'
    ],
    model: 'gpt-4-turbo-preview',
    temperature: 0.7
  },
  
  // Additional healthcare-specific advisors
  medical: {
    name: 'Chief Medical Officer',
    role: 'Clinical validity, medical advisory, and provider credibility',
    personality: 'Evidence-based, patient-focused, clinically rigorous',
    expertise: ['Clinical Medicine', 'Evidence-Based Practice', 'Provider Relations', 'Clinical Outcomes'],
    constraints: [
      'Ensure clinical validity',
      'Maintain medical ethics',
      'Build provider credibility',
      'Focus on measurable health outcomes'
    ],
    model: 'gpt-4-turbo-preview',
    temperature: 0.6
  },
  
  investor: {
    name: 'Healthcare Investor Advisor',
    role: 'Fundraising strategy, investor relations, and valuation optimization',
    personality: 'Growth-focused, metrics-driven, network-connected',
    expertise: ['Healthcare VC', 'Fundraising', 'Valuation', 'Investor Relations'],
    constraints: [
      'Optimize for fundability',
      'Track investor-relevant metrics',
      'Build compelling investment narrative',
      'Plan for next funding round'
    ],
    model: 'gpt-4-turbo-preview',
    temperature: 0.7
  }
};

// ==========================================
// CORE DECISION OS ENGINE
// ==========================================

class DecisionOS {
  constructor() {
    this.sessions = new Map();
    this.documents = new Map();
    this.templates = new Map();
    this.metrics = new MetricsEngine();
    this.financial = new FinancialEngine();
    this.compliance = new ComplianceEngine();
    this.citations = new CitationEngine();
    this.events = new EventEmitter();
    
    this.initialize();
  }
  
  async initialize() {
    // Create necessary directories
    for (const dir of Object.values(CONFIG.storage)) {
      await fs.mkdir(dir, { recursive: true });
    }
    
    // Load templates
    await this.loadTemplates();
    
    // Initialize audit log
    this.auditLog = new AuditLog(CONFIG.storage.auditDir);
    
    console.log('✓ Decision OS initialized');
  }
  
  async loadTemplates() {
    const templates = {
      'strategic-review': {
        name: 'Strategic Review',
        description: 'Comprehensive strategic assessment and planning',
        phases: [
          { type: 'analysis', topic: 'Current state assessment', agents: ['ceo', 'cfo', 'strategist'] },
          { type: 'discussion', topic: 'Market opportunities and threats', agents: ['strategist', 'cmo', 'cto'] },
          { type: 'modeling', topic: 'Financial projections and scenarios', agents: ['cfo', 'coo'] },
          { type: 'synthesis', topic: 'Strategic recommendations', agents: ['all'] },
          { type: 'decision', topic: 'Action plan and next steps', agents: ['all'] }
        ]
      },
      
      'financial-modeling': {
        name: 'Financial Modeling',
        description: 'Detailed financial analysis and projections',
        phases: [
          { type: 'baseline', topic: 'Current financial position', agents: ['cfo'] },
          { type: 'projections', topic: 'Revenue and cost projections', agents: ['cfo', 'coo', 'cmo'] },
          { type: 'scenarios', topic: 'Scenario analysis', agents: ['cfo', 'strategist'] },
          { type: 'risks', topic: 'Financial risks and mitigation', agents: ['cfo', 'legal'] },
          { type: 'recommendations', topic: 'Capital allocation recommendations', agents: ['cfo', 'ceo'] }
        ]
      },
      
      'risk-assessment': {
        name: 'Risk Assessment',
        description: 'Comprehensive risk identification and mitigation planning',
        phases: [
          { type: 'identification', topic: 'Risk identification', agents: ['all'] },
          { type: 'assessment', topic: 'Risk probability and impact', agents: ['cfo', 'coo', 'legal'] },
          { type: 'mitigation', topic: 'Mitigation strategies', agents: ['all'] },
          { type: 'monitoring', topic: 'Risk monitoring plan', agents: ['coo', 'cfo'] }
        ]
      },
      
      'compliance-review': {
        name: 'Compliance Review',
        description: 'Regulatory and compliance assessment',
        phases: [
          { type: 'regulatory', topic: 'Regulatory requirements', agents: ['legal'] },
          { type: 'assessment', topic: 'Current compliance status', agents: ['legal', 'coo', 'cto'] },
          { type: 'gaps', topic: 'Compliance gaps and risks', agents: ['legal', 'cfo'] },
          { type: 'remediation', topic: 'Remediation plan', agents: ['legal', 'coo'] }
        ]
      }
    };
    
    for (const [id, template] of Object.entries(templates)) {
      this.templates.set(id, template);
    }
  }
  
  createSession(id = crypto.randomUUID()) {
    const session = new StrategicSession(id);
    this.sessions.set(id, session);
    this.auditLog.log('session_created', { sessionId: id });
    return session;
  }
  
  getSession(id) {
    return this.sessions.get(id);
  }
}

// ==========================================
// STRATEGIC SESSION MANAGEMENT
// ==========================================

class StrategicSession {
  constructor(id) {
    this.id = id;
    this.createdAt = new Date();
    this.state = 'active';
    
    // Core data structures
    this.decisions = [];
    this.risks = [];
    this.actions = [];
    this.assumptions = [];
    this.metrics = [];
    
    // Discussion management
    this.messages = [];
    this.participants = new Map();
    this.consensus = new ConsensusEngine();
    
    // Financial modeling
    this.scenarios = new Map();
    this.projections = null;
    
    // Document management
    this.documents = new Map();
    this.citations = new Map();
    
    // Cost tracking
    this.costs = {
      tokens: 0,
      dollars: 0,
      breakdown: new Map()
    };
  }
  
  addDecision(decision) {
    const id = crypto.randomUUID();
    const decisionObj = {
      id,
      ...decision,
      createdAt: new Date(),
      status: 'proposed',
      votes: new Map(),
      confidence: 0
    };
    this.decisions.push(decisionObj);
    return decisionObj;
  }
  
  addRisk(risk) {
    const id = crypto.randomUUID();
    const riskObj = {
      id,
      ...risk,
      createdAt: new Date(),
      status: 'identified',
      probability: risk.probability || 'medium',
      impact: risk.impact || 'medium',
      score: this.calculateRiskScore(risk.probability, risk.impact)
    };
    this.risks.push(riskObj);
    return riskObj;
  }
  
  addAction(action) {
    const id = crypto.randomUUID();
    const actionObj = {
      id,
      ...action,
      createdAt: new Date(),
      status: 'pending',
      priority: action.priority || 'medium',
      dependencies: action.dependencies || []
    };
    this.actions.push(actionObj);
    return actionObj;
  }
  
  calculateRiskScore(probability, impact) {
    const scores = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };
    return scores[probability] * scores[impact];
  }
  
  getExecutiveSummary() {
    return {
      decisions: this.decisions.filter(d => d.status === 'approved'),
      risks: this.risks.sort((a, b) => b.score - a.score).slice(0, 5),
      actions: this.actions.filter(a => a.priority === 'high' || a.priority === 'critical'),
      consensus: this.consensus.getScore(),
      cost: this.costs.dollars,
      duration: Date.now() - this.createdAt.getTime()
    };
  }
}

// ==========================================
// FINANCIAL MODELING ENGINE
// ==========================================

class FinancialEngine {
  constructor() {
    this.models = new Map();
  }
  
  createProjection(params) {
    const {
      revenue,
      costs,
      growth,
      periods = 36,
      currency = 'USD'
    } = params;
    
    const projection = {
      periods: [],
      metrics: {
        arr: 0,
        mrr: 0,
        burnRate: 0,
        runway: 0,
        ltv: 0,
        cac: 0,
        ltvCacRatio: 0,
        grossMargin: 0,
        ebitda: 0,
        irr: 0,
        npv: 0
      }
    };
    
    // Generate monthly projections
    for (let i = 0; i < periods; i++) {
      const month = {
        period: i + 1,
        revenue: this.calculateRevenue(revenue, growth, i),
        costs: this.calculateCosts(costs, i),
        cashFlow: 0,
        cumulativeCash: 0
      };
      
      month.cashFlow = month.revenue - month.costs;
      month.cumulativeCash = (projection.periods[i - 1]?.cumulativeCash || 0) + month.cashFlow;
      
      projection.periods.push(month);
    }
    
    // Calculate key metrics
    this.calculateMetrics(projection);
    
    return projection;
  }
  
  calculateRevenue(base, growth, period) {
    return base * Math.pow(1 + growth, period);
  }
  
  calculateCosts(base, period) {
    // Implement cost scaling logic
    return base * (1 + period * 0.02); // 2% monthly increase
  }
  
  calculateMetrics(projection) {
    const lastPeriod = projection.periods[projection.periods.length - 1];
    projection.metrics.arr = lastPeriod.revenue * 12;
    projection.metrics.mrr = lastPeriod.revenue;
    projection.metrics.burnRate = Math.max(0, -lastPeriod.cashFlow);
    
    // Calculate runway
    const cash = lastPeriod.cumulativeCash;
    const burn = projection.metrics.burnRate;
    projection.metrics.runway = burn > 0 ? Math.max(0, cash / burn) : Infinity;
    
    // Calculate margins
    projection.metrics.grossMargin = (lastPeriod.revenue - lastPeriod.costs) / lastPeriod.revenue;
    
    return projection.metrics;
  }
  
  runScenarioAnalysis(baseCase, variations) {
    const scenarios = {
      base: this.createProjection(baseCase),
      conservative: this.createProjection({
        ...baseCase,
        revenue: baseCase.revenue * 0.7,
        costs: baseCase.costs * 1.2
      }),
      optimistic: this.createProjection({
        ...baseCase,
        revenue: baseCase.revenue * 1.5,
        costs: baseCase.costs * 0.9
      })
    };
    
    // Add custom variations
    for (const [name, variation] of Object.entries(variations || {})) {
      scenarios[name] = this.createProjection({
        ...baseCase,
        ...variation
      });
    }
    
    return scenarios;
  }
}

// ==========================================
// METRICS & ANALYTICS ENGINE
// ==========================================

class MetricsEngine {
  constructor() {
    this.metrics = new Map();
    this.kpis = new Map();
  }
  
  track(metric, value, metadata = {}) {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    
    this.metrics.get(metric).push({
      value,
      timestamp: new Date(),
      ...metadata
    });
  }
  
  getMetric(metric, period = 'all') {
    const data = this.metrics.get(metric) || [];
    
    if (period === 'all') return data;
    
    const now = Date.now();
    const periods = {
      hour: 3600000,
      day: 86400000,
      week: 604800000,
      month: 2592000000
    };
    
    const cutoff = now - (periods[period] || 0);
    return data.filter(d => d.timestamp.getTime() > cutoff);
  }
  
  calculateKPIs() {
    return {
      sessionsToday: this.getMetric('sessions', 'day').length,
      decisionsPerSession: this.getAverageMetric('decisions_per_session'),
      averageCost: this.getAverageMetric('session_cost'),
      consensusRate: this.getAverageMetric('consensus_score'),
      timeToDecision: this.getAverageMetric('time_to_decision'),
      citationCoverage: this.getAverageMetric('citation_coverage')
    };
  }
  
  getAverageMetric(metric) {
    const data = this.metrics.get(metric) || [];
    if (data.length === 0) return 0;
    
    const sum = data.reduce((acc, d) => acc + d.value, 0);
    return sum / data.length;
  }
}

// ==========================================
// COMPLIANCE & AUDIT ENGINE
// ==========================================

class ComplianceEngine {
  constructor() {
    this.requirements = new Map();
    this.controls = new Map();
    this.violations = [];
  }
  
  addRequirement(id, requirement) {
    this.requirements.set(id, {
      ...requirement,
      status: 'pending',
      controls: [],
      evidence: []
    });
  }
  
  addControl(requirementId, control) {
    const requirement = this.requirements.get(requirementId);
    if (requirement) {
      requirement.controls.push(control);
      this.evaluateCompliance(requirementId);
    }
  }
  
  evaluateCompliance(requirementId) {
    const requirement = this.requirements.get(requirementId);
    if (!requirement) return;
    
    const allControlsMet = requirement.controls.every(c => c.status === 'implemented');
    requirement.status = allControlsMet ? 'compliant' : 'non-compliant';
    
    if (!allControlsMet) {
      this.violations.push({
        requirementId,
        timestamp: new Date(),
        severity: requirement.severity || 'medium'
      });
    }
  }
  
  getComplianceReport() {
    const requirements = Array.from(this.requirements.values());
    const compliant = requirements.filter(r => r.status === 'compliant').length;
    const total = requirements.length;
    
    return {
      score: total > 0 ? (compliant / total) * 100 : 0,
      compliant,
      nonCompliant: total - compliant,
      violations: this.violations,
      requirements: requirements.map(r => ({
        id: r.id,
        name: r.name,
        status: r.status,
        controls: r.controls.length,
        evidence: r.evidence.length
      }))
    };
  }
}

// ==========================================
// CITATION & EVIDENCE ENGINE
// ==========================================

class CitationEngine {
  constructor() {
    this.sources = new Map();
    this.citations = new Map();
    this.claims = new Map();
  }
  
  addSource(id, source) {
    this.sources.set(id, {
      ...source,
      addedAt: new Date(),
      citations: []
    });
  }
  
  addCitation(claimId, sourceId, location) {
    const citation = {
      id: crypto.randomUUID(),
      claimId,
      sourceId,
      location, // { page, paragraph, offset }
      confidence: this.calculateConfidence(sourceId),
      timestamp: new Date()
    };
    
    this.citations.set(citation.id, citation);
    
    // Update source
    const source = this.sources.get(sourceId);
    if (source) {
      source.citations.push(citation.id);
    }
    
    return citation;
  }
  
  calculateConfidence(sourceId) {
    const source = this.sources.get(sourceId);
    if (!source) return 0;
    
    // Calculate confidence based on source type and recency
    let confidence = 0.5;
    
    if (source.type === 'legal') confidence += 0.3;
    if (source.type === 'financial') confidence += 0.2;
    if (source.verified) confidence += 0.2;
    
    // Decay based on age
    const age = Date.now() - source.addedAt.getTime();
    const monthsOld = age / (1000 * 60 * 60 * 24 * 30);
    confidence -= monthsOld * 0.05;
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  validateClaim(claim) {
    const citations = Array.from(this.citations.values())
      .filter(c => c.claimId === claim.id);
    
    return {
      hasCitation: citations.length > 0,
      citations,
      confidence: citations.reduce((acc, c) => Math.max(acc, c.confidence), 0),
      warning: citations.length === 0 ? 'Uncited claim requires evidence' : null
    };
  }
}

// ==========================================
// CONSENSUS ENGINE
// ==========================================

class ConsensusEngine {
  constructor() {
    this.positions = new Map();
    this.agreements = [];
    this.disagreements = [];
  }
  
  addPosition(agentId, topic, position) {
    if (!this.positions.has(topic)) {
      this.positions.set(topic, new Map());
    }
    
    this.positions.get(topic).set(agentId, {
      position,
      confidence: position.confidence || 0.5,
      timestamp: new Date()
    });
    
    this.evaluateConsensus(topic);
  }
  
  evaluateConsensus(topic) {
    const positions = this.positions.get(topic);
    if (!positions || positions.size < 2) return;
    
    const values = Array.from(positions.values());
    const agreements = [];
    const disagreements = [];
    
    // Compare positions pairwise
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        const similarity = this.calculateSimilarity(values[i], values[j]);
        
        if (similarity > 0.7) {
          agreements.push({ positions: [values[i], values[j]], similarity });
        } else if (similarity < 0.3) {
          disagreements.push({ positions: [values[i], values[j]], similarity });
        }
      }
    }
    
    this.agreements = agreements;
    this.disagreements = disagreements;
  }
  
  calculateSimilarity(pos1, pos2) {
    // Implement sophisticated similarity calculation
    // This is a simplified version
    return Math.random() * 0.5 + 0.25; // Placeholder
  }
  
  getScore() {
    const total = this.agreements.length + this.disagreements.length;
    if (total === 0) return 0;
    
    return (this.agreements.length / total) * 100;
  }
}

// ==========================================
// AUDIT LOG
// ==========================================

class AuditLog {
  constructor(directory) {
    this.directory = directory;
    this.currentLog = null;
  }
  
  async log(event, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      user: data.user || 'system',
      sessionId: data.sessionId || null
    };
    
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.directory, `audit-${date}.jsonl`);
    
    await fs.appendFile(logFile, JSON.stringify(entry) + '\n');
  }
  
  async query(filters) {
    // Implement audit log querying
    const logs = [];
    const files = await fs.readdir(this.directory);
    
    for (const file of files) {
      if (!file.startsWith('audit-')) continue;
      
      const content = await fs.readFile(path.join(this.directory, file), 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          
          // Apply filters
          if (filters.event && entry.event !== filters.event) continue;
          if (filters.sessionId && entry.sessionId !== filters.sessionId) continue;
          if (filters.startDate && new Date(entry.timestamp) < filters.startDate) continue;
          if (filters.endDate && new Date(entry.timestamp) > filters.endDate) continue;
          
          logs.push(entry);
        } catch (e) {
          // Skip malformed entries
        }
      }
    }
    
    return logs;
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getAvailableAgents() {
  return {
    ceo: { name: 'Chief Executive', role: 'Strategic vision and leadership', expertise: ['Strategy', 'Leadership', 'Vision'] },
    cfo: { name: 'Chief Financial Officer', role: 'Financial strategy and analysis', expertise: ['Financial Modeling', 'Risk Management', 'Valuation'] },
    cto: { name: 'Chief Technology Officer', role: 'Technology strategy and innovation', expertise: ['Architecture', 'Digital Transformation', 'Cybersecurity'] },
    coo: { name: 'Chief Operating Officer', role: 'Operational excellence', expertise: ['Operations', 'Process Optimization', 'Quality'] },
    cmo: { name: 'Chief Marketing Officer', role: 'Market strategy and growth', expertise: ['Market Strategy', 'Brand', 'Customer Experience'] },
    legal: { name: 'General Counsel', role: 'Legal and compliance', expertise: ['Corporate Law', 'Compliance', 'Contracts'] },
    strategist: { name: 'Chief Strategy Officer', role: 'Strategic planning', expertise: ['Planning', 'Competitive Analysis', 'M&A'] }
  };
}

function getDefaultAgents() {
  return ['ceo', 'cfo', 'strategist'];
}

function getClearHiveAdvisors() {
  return {
    healthcare: { name: 'Healthcare Strategy Advisor', role: 'Behavioral health industry expertise' },
    compliance: { name: 'HIPAA Compliance Expert', role: 'Healthcare regulatory compliance' },
    sales: { name: 'B2B Healthcare Sales', role: 'Enterprise healthcare sales strategy' },
    clinical: { name: 'Clinical Operations', role: 'Treatment center operations expertise' }
  };
}

// ==========================================
// HTTP SERVER & API
// ==========================================

class DecisionOSServer {
  constructor(decisionOS) {
    this.os = decisionOS;
    this.server = http.createServer(this.handleRequest.bind(this));
  }
  
  async handleRequest(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    
    // Routing
    try {
      if (path === '/' && req.method === 'GET') {
        await this.serveUI(res);
      } else if (path.startsWith('/api/')) {
        await this.handleAPI(req, res, path.slice(5));
      } else if (path.startsWith('/ws')) {
        await this.handleWebSocket(req, res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } catch (error) {
      console.error('Server error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }
  
  async serveUI(res) {
    // Always serve the full interactive UI
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(this.getFullInteractiveUI());
  }
  
  async handleAPI(req, res, endpoint) {
    const [resource, ...params] = endpoint.split('/');
    
    if (resource === 'session') {
      await this.handleSession(req, res, params);
    } else if (resource === 'decision') {
      await this.handleDecision(req, res, params);
    } else if (resource === 'risk') {
      await this.handleRisk(req, res, params);
    } else if (resource === 'action') {
      await this.handleAction(req, res, params);
    } else if (resource === 'financial') {
      await this.handleFinancial(req, res, params);
    } else if (resource === 'compliance') {
      await this.handleCompliance(req, res, params);
    } else if (resource === 'export') {
      await this.handleExport(req, res, params);
    } else if (resource === 'metrics') {
      await this.handleMetrics(req, res, params);
    } else if (resource === 'clearhive') {
      await this.handleClearHive(req, res, params);
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
  }
  
  async handleClearHive(req, res, params) {
    const [action] = params;
    
    if (action === 'context') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(CLEARHIVE_CONTEXT));
    } else if (action === 'metrics') {
      // Calculate real-time ClearHive metrics
      const metrics = {
        ...CLEARHIVE_CONTEXT.metrics.current,
        daysUntilRunway: CLEARHIVE_CONTEXT.metrics.current.runway * 30,
        burnRate: CLEARHIVE_CONTEXT.businessModel.costs.development.monthly +
                  CLEARHIVE_CONTEXT.businessModel.costs.sales.monthly +
                  CLEARHIVE_CONTEXT.businessModel.costs.operations.monthly,
        pilotsToCloseThisQuarter: CLEARHIVE_CONTEXT.metrics.targets.q1_2025.conversions
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(metrics));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'ClearHive data loaded' }));
    }
  }
  
  async handleSession(req, res, params) {
    if (req.method === 'POST') {
      const session = this.os.createSession();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sessionId: session.id }));
    } else if (req.method === 'GET' && params[0]) {
      const session = this.os.getSession(params[0]);
      if (session) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(session.getExecutiveSummary()));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Session not found' }));
      }
    }
  }
  
  async handleDecision(req, res, params) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Decision handler' }));
  }
  
  async handleRisk(req, res, params) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Risk handler' }));
  }
  
  async handleAction(req, res, params) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Action handler' }));
  }
  
  async handleFinancial(req, res, params) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Financial handler' }));
  }
  
  async handleCompliance(req, res, params) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Compliance handler' }));
  }
  
  async handleExport(req, res, params) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Export handler' }));
  }
  
  async handleMetrics(req, res, params) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Metrics handler' }));
  }
  
  getFullInteractiveUI() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClearHive Health - Launch Command Center</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    :root {
      --primary: #0F172A;
      --secondary: #1E293B;
      --accent: #00A6FB;  /* ClearHive Blue */
      --success: #00C896; /* Healthcare Green */
      --warning: #F59E0B;
      --danger: #EF4444;
      --text-primary: #F1F5F9;
      --text-secondary: #94A3B8;
      --border: #334155;
      --healthcare: #00C896;
    }
    
    * {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    body {
      background: linear-gradient(180deg, #0F172A 0%, #1E293B 100%);
      color: var(--text-primary);
      font-size: 14px;
      line-height: 1.6;
    }
    
    /* Executive Dashboard Grid */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 280px 1fr 380px;
      grid-template-rows: 60px 1fr 280px;
      height: 100vh;
      gap: 1px;
      background: var(--border);
    }
    
    .panel {
      background: var(--primary);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    /* Professional Card Styling */
    .executive-card {
      background: var(--secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s;
    }
    
    .executive-card:hover {
      border-color: var(--accent);
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
    }
    
    /* Metric Cards */
    .metric-card {
      background: linear-gradient(135deg, var(--secondary) 0%, rgba(59, 130, 246, 0.1) 100%);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      position: relative;
      overflow: hidden;
    }
    
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 3px;
      height: 100%;
      background: var(--accent);
    }
    
    /* Professional Button Styling */
    .exec-button {
      background: var(--accent);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 13px;
    }
    
    .exec-button:hover {
      background: #2563EB;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .exec-button.secondary {
      background: var(--secondary);
      border: 1px solid var(--border);
    }
    
    .exec-button.secondary:hover {
      background: #334155;
      border-color: var(--accent);
    }
    
    /* Tab Navigation */
    .tab-nav {
      display: flex;
      gap: 8px;
      padding: 8px;
      background: var(--primary);
      border-bottom: 1px solid var(--border);
    }
    
    .tab-button {
      padding: 8px 16px;
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }
    
    .tab-button.active {
      background: var(--secondary);
      color: var(--text-primary);
      border-color: var(--border);
    }
    
    /* Scenario Slider Styling */
    .scenario-slider {
      -webkit-appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: var(--secondary);
      outline: none;
    }
    
    .scenario-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--accent);
      cursor: pointer;
    }
    
    /* Loading Animation */
    .thinking-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      animation: thinking 1.4s infinite ease-in-out;
    }
    
    @keyframes thinking {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1); }
    }
    
    /* Scrollbar Styling */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: var(--primary);
    }
    
    ::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
  </style>
</head>
<body>
  <div class="dashboard-grid">
    <!-- Header Bar -->
    <div class="panel col-span-3 flex flex-row items-center justify-between px-6" style="grid-column: 1 / -1;">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-gradient-to-br from-blue-400 to-green-400 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 class="text-xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">ClearHive Health</h1>
        </div>
        <span class="text-xs text-gray-500">Launch Command Center</span>
      </div>
      <div class="flex items-center gap-4">
        <!-- Session Metrics -->
        <div class="flex items-center gap-6">
          <div class="metric-mini">
            <span class="text-xs text-gray-400">Session Cost</span>
            <span class="text-sm font-mono font-semibold" id="session-cost">$0.00</span>
          </div>
          <div class="metric-mini">
            <span class="text-xs text-gray-400">Decisions</span>
            <span class="text-sm font-semibold" id="decision-count">0</span>
          </div>
          <div class="metric-mini">
            <span class="text-xs text-gray-400">Consensus</span>
            <span class="text-sm font-semibold" id="consensus-score">0%</span>
          </div>
        </div>
        <!-- Action Buttons -->
        <button class="exec-button" onclick="exportBoardPacket()">
          Export Board Packet
        </button>
        <button class="exec-button secondary" onclick="openSettings()">
          Settings
        </button>
      </div>
    </div>
    
    <!-- Left Sidebar: Command Center -->
    <div class="panel">
      <div class="p-4 border-b border-gray-700">
        <h2 class="text-sm font-semibold text-gray-300 mb-3">Launch Templates</h2>
        
        <!-- Healthcare Launch Actions -->
        <div class="space-y-2">
          <button class="w-full exec-button secondary text-left" onclick="runTemplate('mvp-planning')">
            🚀 MVP Planning
          </button>
          <button class="w-full exec-button secondary text-left" onclick="runTemplate('provider-outreach')">
            🏥 Provider Outreach Strategy
          </button>
          <button class="w-full exec-button secondary text-left" onclick="runTemplate('hipaa-compliance')">
            🔒 HIPAA Compliance Check
          </button>
          <button class="w-full exec-button secondary text-left" onclick="runTemplate('funding-strategy')">
            💰 Funding Strategy
          </button>
          <button class="w-full exec-button secondary text-left" onclick="runTemplate('pilot-program')">
            🔬 Pilot Program Design
          </button>
          <button class="w-full exec-button secondary text-left" onclick="runTemplate('market-analysis')">
            📊 Healthcare Market Analysis
          </button>
        </div>
      </div>
      
      <!-- Agent Configuration -->
      <div class="p-4 border-b border-gray-700">
        <h3 class="text-sm font-semibold text-gray-300 mb-3">Advisory Board</h3>
        <div id="agent-list" class="space-y-2">
          <div class="text-xs text-gray-500">
            <div>• CEO - Strategic Vision</div>
            <div>• CFO - Financial Analysis</div>
            <div>• CTO - Technology Strategy</div>
            <div>• CMO - Market Strategy</div>
          </div>
        </div>
        <button class="mt-3 text-xs text-blue-400 hover:text-blue-300" onclick="openAgentStudio()">
          Configure Agents →
        </button>
      </div>
      
      <!-- Document Library -->
      <div class="p-4 flex-1 overflow-y-auto">
        <h3 class="text-sm font-semibold text-gray-300 mb-3">Document Library</h3>
        <div id="document-list" class="space-y-2">
          <div class="text-xs text-gray-500">No documents uploaded</div>
        </div>
        <button class="mt-3 w-full exec-button secondary" onclick="uploadDocuments()">
          Upload Documents
        </button>
      </div>
    </div>
    
    <!-- Main Content Area -->
    <div class="panel flex flex-col">
      <!-- Tab Navigation -->
      <div class="tab-nav">
        <button class="tab-button active" onclick="switchTab('discussion')">Discussion</button>
        <button class="tab-button" onclick="switchTab('decisions')">Decisions</button>
        <button class="tab-button" onclick="switchTab('scenarios')">Scenarios</button>
        <button class="tab-button" onclick="switchTab('metrics')">Metrics</button>
      </div>
      
      <!-- Content Area -->
      <div class="flex-1 overflow-hidden">
        <!-- Discussion Tab -->
        <div id="discussion-tab" class="h-full flex flex-col">
          <div id="discussion-area" class="flex-1 overflow-y-auto p-4">
            <div class="executive-card mb-4 border-l-4 border-green-400">
              <h3 class="font-semibold mb-2 flex items-center gap-2">
                <span class="text-green-400">🚀</span> Welcome to ClearHive Health Launch Center
              </h3>
              <p class="text-sm text-gray-400">Hey Jimmy & Mike! Ready to launch ClearHive Health? Select a template to get started or ask your healthcare advisors anything about building, launching, and scaling your health tech startup.</p>
              <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div class="bg-blue-900/20 border border-blue-600/30 rounded px-2 py-1">
                  <span class="text-blue-400">Focus:</span> Healthcare Innovation
                </div>
                <div class="bg-green-900/20 border border-green-600/30 rounded px-2 py-1">
                  <span class="text-green-400">Stage:</span> Pre-Launch
                </div>
              </div>
            </div>
          </div>
          <div class="p-4 border-t border-gray-700">
            <div class="flex gap-2">
              <input type="text" id="message-input" 
                class="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Type your strategic question or command..."
                onkeypress="if(event.key==='Enter') sendMessage()">
              <button class="exec-button" onclick="sendMessage()">Send</button>
            </div>
          </div>
        </div>
        
        <!-- Decisions Tab -->
        <div id="decisions-tab" class="h-full p-4 overflow-y-auto hidden">
          <div class="executive-card">
            <h3 class="font-semibold mb-3">Decision Management</h3>
            <p class="text-sm text-gray-400">Track and manage strategic decisions made during sessions.</p>
            <button class="exec-button mt-4" onclick="addDecision()">Add Decision</button>
          </div>
        </div>
        
        <!-- Scenarios Tab -->
        <div id="scenarios-tab" class="h-full p-4 overflow-y-auto hidden">
          <div class="executive-card">
            <h3 class="font-semibold mb-3">Scenario Modeling</h3>
            <p class="text-sm text-gray-400">Model different business scenarios and their financial impact.</p>
          </div>
        </div>
        
        <!-- Metrics Tab -->
        <div id="metrics-tab" class="h-full p-4 overflow-y-auto hidden">
          <div class="executive-card">
            <h3 class="font-semibold mb-3">Key Performance Indicators</h3>
            <div class="grid grid-cols-2 gap-4 mt-4">
              <div class="metric-card">
                <div class="text-xs text-gray-400">Sessions Today</div>
                <div class="text-2xl font-bold">3</div>
              </div>
              <div class="metric-card">
                <div class="text-xs text-gray-400">Decisions Made</div>
                <div class="text-2xl font-bold">12</div>
              </div>
              <div class="metric-card">
                <div class="text-xs text-gray-400">Avg Consensus</div>
                <div class="text-2xl font-bold">87%</div>
              </div>
              <div class="metric-card">
                <div class="text-xs text-gray-400">Cost per Decision</div>
                <div class="text-2xl font-bold">$2.45</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Right Sidebar: Launch Progress Panel -->
    <div class="panel">
      <div class="p-4 border-b border-gray-700">
        <h2 class="text-sm font-semibold text-gray-300">Launch Progress</h2>
      </div>
      
      <!-- Launch Progress Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- Milestone Tracker -->
        <div class="executive-card">
          <h3 class="text-sm font-semibold mb-3 flex items-center justify-between">
            <span>🎯 Key Milestones</span>
            <span class="text-xs text-green-400">Pre-Launch</span>
          </h3>
          <div class="space-y-2 text-xs">
            <div class="flex items-center gap-2">
              <input type="checkbox" class="rounded" id="m1">
              <label for="m1">Complete MVP definition</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" class="rounded" id="m2">
              <label for="m2">HIPAA compliance setup</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" class="rounded" id="m3">
              <label for="m3">First provider partner</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" class="rounded" id="m4">
              <label for="m4">Seed funding secured</label>
            </div>
          </div>
        </div>
        
        <!-- Key Metrics -->
        <div class="executive-card">
          <h3 class="text-sm font-semibold mb-3">📊 Launch Metrics</h3>
          <div class="space-y-2">
            <div class="flex justify-between text-xs">
              <span class="text-gray-400">Runway</span>
              <span class="font-mono">18 months</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-400">Burn Rate</span>
              <span class="font-mono">$50k/mo</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-400">Target ARR</span>
              <span class="font-mono">$1M</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-400">Provider Pipeline</span>
              <span class="font-mono">0</span>
            </div>
          </div>
        </div>
        
        <!-- Quick Links -->
        <div class="executive-card">
          <h3 class="text-sm font-semibold mb-3">🔗 Resources</h3>
          <div class="space-y-2 text-xs">
            <a href="#" class="block text-blue-400 hover:text-blue-300">→ HIPAA Compliance Checklist</a>
            <a href="#" class="block text-blue-400 hover:text-blue-300">→ Healthcare Pitch Deck Template</a>
            <a href="#" class="block text-blue-400 hover:text-blue-300">→ Provider Outreach Scripts</a>
            <a href="#" class="block text-blue-400 hover:text-blue-300">→ Investor CRM</a>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Bottom Panel: Scenario Lab -->
    <div class="panel col-span-3 p-4" style="grid-column: 1 / -1;">
      <div class="h-full flex gap-4">
        <!-- Financial Projections -->
        <div class="flex-1 executive-card">
          <h3 class="text-sm font-semibold mb-3">Financial Projections</h3>
          <canvas id="financial-chart" height="180"></canvas>
        </div>
        
        <!-- Healthcare Scenario Controls -->
        <div class="w-80 space-y-3">
          <h3 class="text-sm font-semibold flex items-center gap-2">
            <span class="text-green-400">🏥</span> Healthcare Revenue Model
          </h3>
          
          <div class="space-y-2">
            <div>
              <label class="text-xs text-gray-400">Monthly Provider Subscription</label>
              <input type="range" class="scenario-slider" min="500" max="5000" value="1500" id="price-slider" oninput="updateScenario()">
              <span class="text-xs font-mono" id="price-value">$1,500</span>
            </div>
            
            <div>
              <label class="text-xs text-gray-400">Provider Acquisition Cost</label>
              <input type="range" class="scenario-slider" min="1000" max="10000" value="3000" id="cac-slider" oninput="updateScenario()">
              <span class="text-xs font-mono" id="cac-value">$3,000</span>
            </div>
            
            <div>
              <label class="text-xs text-gray-400">Provider Conversion Rate</label>
              <input type="range" class="scenario-slider" min="5" max="30" value="15" id="winrate-slider" oninput="updateScenario()">
              <span class="text-xs font-mono" id="winrate-value">15%</span>
            </div>
            
            <div>
              <label class="text-xs text-gray-400">Monthly Churn Rate</label>
              <input type="range" class="scenario-slider" min="1" max="10" value="3" id="churn-slider" oninput="updateScenario()">
              <span class="text-xs font-mono" id="churn-value">3%</span>
            </div>
          </div>
          
          <!-- Scenario Results -->
          <div class="grid grid-cols-2 gap-2 pt-3 border-t border-gray-700">
            <div class="metric-card">
              <div class="text-xs text-gray-400">ARR</div>
              <div class="text-lg font-semibold" id="arr-value">$600K</div>
            </div>
            <div class="metric-card">
              <div class="text-xs text-gray-400">Runway</div>
              <div class="text-lg font-semibold" id="runway-value">18 mo</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    
    // Agent configuration helper functions
    function getAvailableAgents() {
      return {
        ceo: { name: 'Chief Executive', role: 'Strategic vision and leadership', expertise: ['Strategy', 'Leadership', 'Vision'] },
        cfo: { name: 'Chief Financial Officer', role: 'Financial strategy and analysis', expertise: ['Financial Modeling', 'Risk Management', 'Valuation'] },
        cto: { name: 'Chief Technology Officer', role: 'Technology strategy and innovation', expertise: ['Architecture', 'Digital Transformation', 'Cybersecurity'] },
        coo: { name: 'Chief Operating Officer', role: 'Operational excellence', expertise: ['Operations', 'Process Optimization', 'Quality'] },
        cmo: { name: 'Chief Marketing Officer', role: 'Market strategy and growth', expertise: ['Market Strategy', 'Brand', 'Customer Experience'] },
        legal: { name: 'General Counsel', role: 'Legal and compliance', expertise: ['Corporate Law', 'Compliance', 'Contracts'] },
        strategist: { name: 'Chief Strategy Officer', role: 'Strategic planning', expertise: ['Planning', 'Competitive Analysis', 'M&A'] }
      };
    }
    
    function getDefaultAgents() {
      return ['ceo', 'cfo', 'strategist'];
    }
    
    function getClearHiveAdvisors() {
      return {
        healthcare: { name: 'Healthcare Strategy Advisor', role: 'Behavioral health industry expertise' },
        compliance: { name: 'HIPAA Compliance Expert', role: 'Healthcare regulatory compliance' },
        sales: { name: 'B2B Healthcare Sales', role: 'Enterprise healthcare sales strategy' },
        clinical: { name: 'Clinical Operations', role: 'Treatment center operations expertise' }
      };
    }
    
    // Tab switching
    function switchTab(tabName) {
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
      });
      document.querySelectorAll('[id$="-tab"]').forEach(tab => {
        tab.classList.add('hidden');
      });
      
      event.target.classList.add('active');
      document.getElementById(tabName + '-tab').classList.remove('hidden');
    }
    
    // Template execution
    async function runTemplate(templateName) {
      const templates = {
        'mvp-planning': {
          title: '🚀 MVP Planning Session',
          message: "Let's define the Minimum Viable Product for ClearHive Health. What are the core features that providers absolutely need?",
          context: 'Focus on: Core value proposition, Must-have features vs nice-to-have, Technical feasibility, Time to market'
        },
        'provider-outreach': {
          title: '🏥 Provider Outreach Strategy',
          message: "Let's develop our provider outreach and onboarding strategy. How do we get our first 10 healthcare providers?",
          context: 'Consider: Target provider profile, Value messaging, Pilot program structure, Onboarding process'
        },
        'hipaa-compliance': {
          title: '🔒 HIPAA Compliance Checklist',
          message: "Let's review HIPAA compliance requirements and create an implementation plan for ClearHive Health.",
          context: 'Cover: Technical safeguards, Administrative safeguards, Physical safeguards, Business Associate Agreements'
        },
        'funding-strategy': {
          title: '💰 Funding Strategy Session',
          message: "Let's plan our fundraising strategy. What's our path to seed funding and beyond?",
          context: 'Discuss: Funding timeline, Investor targets, Valuation expectations, Use of funds'
        },
        'pilot-program': {
          title: '🔬 Pilot Program Design',
          message: "Let's design our pilot program for initial provider partners. How do we prove value quickly?",
          context: 'Define: Success metrics, Timeline, Support structure, Feedback loops'
        },
        'market-analysis': {
          title: '📊 Healthcare Market Analysis',
          message: "Let's analyze the healthcare market opportunity for ClearHive Health. What's our TAM/SAM/SOM?",
          context: 'Analyze: Market size, Competition, Growth trends, Entry barriers'
        }
      };
      
      const template = templates[templateName];
      if (template) {
        addMessageToDiscussion('System', \`Starting: \${template.title}\`, 'system');
        setTimeout(() => {
          addMessageToDiscussion('Healthcare Advisors', template.message, 'ai');
          if (template.context) {
            addMessageToDiscussion('Focus Areas', template.context, 'system');
          }
        }, 500);
      } else {
        addMessageToDiscussion('System', 'Template not found', 'system');
      }
    }
    
    // Message handling
    function sendMessage() {
      const input = document.getElementById('message-input');
      const message = input.value.trim();
      if (!message) return;
      
      addMessageToDiscussion('You', message, 'user');
      input.value = '';
      
      // Simulate response
      setTimeout(() => {
        addMessageToDiscussion('AI Advisor', 'Processing your strategic query...', 'ai');
      }, 1000);
    }
    
    function addMessageToDiscussion(author, text, type) {
      const discussionArea = document.getElementById('discussion-area');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'executive-card mb-2';
      
      const authorClass = type === 'user' ? 'text-blue-400' : type === 'system' ? 'text-yellow-400' : 'text-green-400';
      
      messageDiv.innerHTML = \`
        <div class="font-semibold text-sm \${authorClass}">\${author}</div>
        <div class="text-sm mt-1">\${text}</div>
        <div class="text-xs text-gray-500 mt-2">\${new Date().toLocaleTimeString()}</div>
      \`;
      
      discussionArea.appendChild(messageDiv);
      discussionArea.scrollTop = discussionArea.scrollHeight;
    }
    
    // Scenario modeling
    function updateScenario() {
      const price = document.getElementById('price-slider').value;
      const cac = document.getElementById('cac-slider').value;
      const winRate = document.getElementById('winrate-slider').value;
      
      document.getElementById('price-value').textContent = '$' + parseInt(price).toLocaleString();
      document.getElementById('cac-value').textContent = '$' + parseInt(cac).toLocaleString();
      document.getElementById('winrate-value').textContent = winRate + '%';
      
      // Calculate metrics
      const monthlyDeals = 10 * (winRate / 100);
      const arr = monthlyDeals * price * 12;
      const monthlyBurn = 50000;
      const runway = (100000 / monthlyBurn).toFixed(0);
      
      document.getElementById('arr-value').textContent = '$' + (arr / 1000).toFixed(0) + 'K';
      document.getElementById('runway-value').textContent = runway + ' mo';
      
      updateChart();
    }
    
    // Chart initialization
    function updateChart() {
      const ctx = document.getElementById('financial-chart');
      if (!ctx) return;
      
      if (window.financialChart) {
        window.financialChart.destroy();
      }
      
      window.financialChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Revenue',
            data: [20000, 35000, 45000, 60000, 75000, 95000],
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4
          }, {
            label: 'Expenses',
            data: [50000, 50000, 50000, 50000, 50000, 50000],
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: '#94A3B8',
                font: { size: 11 }
              }
            }
          },
          scales: {
            y: {
              grid: { color: '#334155' },
              ticks: { color: '#94A3B8', font: { size: 10 } }
            },
            x: {
              grid: { color: '#334155' },
              ticks: { color: '#94A3B8', font: { size: 10 } }
            }
          }
        }
      });
    }
    
    // Button handlers
    function exportBoardPacket() {
      alert('Exporting board packet... This will generate a professional PDF.');
      window.open('http://localhost:3001', '_blank');
    }
    
    function openSettings() {
      // Create and show the settings modal (reuse the agent studio structure)
      openAgentStudio();
      
      // Switch to the API keys tab by default when opened via Settings button
      setTimeout(() => {
        switchConfigTab('api-keys');
      }, 100);
    }
    
    function openAgentStudio() {
      // Create and show the agent configuration modal
      const existingModal = document.getElementById('agent-config-modal');
      if (existingModal) existingModal.remove();
      
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.id = 'agent-config-modal';
      
      modal.innerHTML = \`
        <div class="bg-gray-800 rounded-lg p-6 w-[900px] max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold">Configure Advisory Board & API Settings</h2>
            <button onclick="closeAgentConfig()" class="text-gray-400 hover:text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <!-- Tab Navigation -->
          <div class="flex gap-4 mb-6 border-b border-gray-700">
            <button class="pb-3 px-1 text-sm font-medium border-b-2 border-blue-500 text-blue-500" 
              onclick="switchConfigTab('advisors')" id="advisors-tab">Advisors</button>
            <button class="pb-3 px-1 text-sm font-medium text-gray-400 hover:text-white" 
              onclick="switchConfigTab('api-keys')" id="api-keys-tab">API Keys</button>
            <button class="pb-3 px-1 text-sm font-medium text-gray-400 hover:text-white" 
              onclick="switchConfigTab('budget')" id="budget-tab">Budget & Limits</button>
            <button class="pb-3 px-1 text-sm font-medium text-gray-400 hover:text-white" 
              onclick="switchConfigTab('advanced')" id="advanced-tab">Advanced</button>
          </div>
          
          <!-- Advisors Tab -->
          <div id="advisors-content">
            <div class="mb-4">
              <p class="text-sm text-gray-400">Select AI advisors for your virtual board. Each brings specialized expertise to strategic discussions.</p>
            </div>
            
            <!-- Executive Advisors -->
            <h3 class="font-semibold text-sm mb-3">Executive Team</h3>
            <div class="grid grid-cols-2 gap-3 mb-6">
              ${Object.entries(getAvailableAgents()).map(([key, agent]) => `
                <div class="executive-card p-3 hover:border-blue-500 transition-colors">
                  <div class="flex items-start gap-3">
                    <input type="checkbox" id="agent-${key}" value="${key}" 
                      class="mt-1 cursor-pointer" ${getDefaultAgents().includes(key) ? 'checked' : ''}>
                    <div class="flex-1">
                      <label for="agent-${key}" class="font-semibold text-sm cursor-pointer flex items-center gap-2">
                        ${agent.name}
                        <select class="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1" 
                          id="model-${key}" onclick="event.stopPropagation()">
                          <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                          <option value="gpt-4o-mini">GPT-4 Mini</option>
                          <option value="gpt-3.5-turbo">GPT-3.5</option>
                          <option value="claude-3-opus">Claude 3 Opus</option>
                          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                          <option value="claude-3-haiku">Claude 3 Haiku</option>
                          <option value="gemini-pro">Gemini Pro</option>
                        </select>
                      </label>
                      <p class="text-xs text-gray-400 mt-1">${agent.role}</p>
                      <div class="flex flex-wrap gap-1 mt-2">
                        ${agent.expertise.slice(0, 3).map(skill => 
                          `<span class="text-xs bg-gray-700 px-2 py-1 rounded">${skill}</span>`
                        ).join('')}
                      </div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <!-- ClearHive Specific Advisors -->
            <h3 class="font-semibold text-sm mb-3">ClearHive Health Specialists</h3>
            <div class="grid grid-cols-2 gap-3 mb-6">
              ${Object.entries(getClearHiveAdvisors()).map(([key, advisor]) => `
                <div class="executive-card p-3 border-blue-500/30 hover:border-blue-500 transition-colors">
                  <div class="flex items-start gap-3">
                    <input type="checkbox" id="clearhive-${key}" value="clearhive-${key}" 
                      class="mt-1 cursor-pointer">
                    <div class="flex-1">
                      <label for="clearhive-${key}" class="font-semibold text-sm cursor-pointer text-blue-400 flex items-center gap-2">
                        ${advisor.name}
                        <select class="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white" 
                          id="model-clearhive-${key}" onclick="event.stopPropagation()">
                          <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                          <option value="gpt-4o-mini">GPT-4 Mini</option>
                          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                        </select>
                      </label>
                      <p class="text-xs text-gray-400 mt-1">${advisor.role}</p>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- API Keys Tab -->
          <div id="api-keys-content" class="hidden">
            <div class="mb-4">
              <p class="text-sm text-gray-400">Configure your API keys for different AI providers. Keys are stored securely in your browser.</p>
            </div>
            
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium">OpenAI API Key</label>
                <div class="flex gap-2 mt-1">
                  <input type="password" id="openai-key" placeholder="sk-..." 
                    class="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    value="">
                  <button onclick="toggleKeyVisibility('openai-key')" class="exec-button secondary">Show</button>
                  <button onclick="testApiKey('openai')" class="exec-button">Test</button>
                </div>
                <p class="text-xs text-gray-500 mt-1">For GPT-4, GPT-3.5 models</p>
              </div>
              
              <div>
                <label class="text-sm font-medium">Anthropic API Key</label>
                <div class="flex gap-2 mt-1">
                  <input type="password" id="anthropic-key" placeholder="sk-ant-..." 
                    class="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    value="">
                  <button onclick="toggleKeyVisibility('anthropic-key')" class="exec-button secondary">Show</button>
                  <button onclick="testApiKey('anthropic')" class="exec-button">Test</button>
                </div>
                <p class="text-xs text-gray-500 mt-1">For Claude 3 models</p>
              </div>
              
              <div>
                <label class="text-sm font-medium">Google Gemini API Key</label>
                <div class="flex gap-2 mt-1">
                  <input type="password" id="gemini-key" placeholder="AI..." 
                    class="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    value="">
                  <button onclick="toggleKeyVisibility('gemini-key')" class="exec-button secondary">Show</button>
                  <button onclick="testApiKey('gemini')" class="exec-button">Test</button>
                </div>
                <p class="text-xs text-gray-500 mt-1">For Gemini Pro models</p>
              </div>
              
              <div class="mt-6 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded">
                <p class="text-xs text-yellow-400">⚠️ API keys are stored locally in your browser and never sent to our servers.</p>
              </div>
            </div>
          </div>
          
          <!-- Budget Tab -->
          <div id="budget-content" class="hidden">
            <div class="mb-4">
              <p class="text-sm text-gray-400">Set spending limits to control AI usage costs. Sessions will pause when limits are reached.</p>
            </div>
            
            <div class="grid grid-cols-2 gap-6">
              <div>
                <h4 class="text-sm font-medium mb-3">Spending Limits</h4>
                <div class="space-y-3">
                  <div>
                    <label class="text-xs text-gray-400">Per Session Limit</label>
                    <div class="flex items-center gap-2">
                      <span class="text-sm">$</span>
                      <input type="number" id="session-limit" value="10.00" step="0.50" min="0.50" max="100"
                        class="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm w-24">
                    </div>
                  </div>
                  
                  <div>
                    <label class="text-xs text-gray-400">Daily Limit</label>
                    <div class="flex items-center gap-2">
                      <span class="text-sm">$</span>
                      <input type="number" id="daily-limit" value="50.00" step="5.00" min="5" max="500"
                        class="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm w-24">
                    </div>
                  </div>
                  
                  <div>
                    <label class="text-xs text-gray-400">Monthly Limit</label>
                    <div class="flex items-center gap-2">
                      <span class="text-sm">$</span>
                      <input type="number" id="monthly-limit" value="500.00" step="50.00" min="50" max="5000"
                        class="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm w-24">
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 class="text-sm font-medium mb-3">Model Costs (Estimated)</h4>
                <div class="space-y-2 text-xs">
                  <div class="flex justify-between">
                    <span class="text-gray-400">GPT-4 Turbo:</span>
                    <span class="font-mono">$0.01/1K tokens</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">GPT-3.5 Turbo:</span>
                    <span class="font-mono">$0.001/1K tokens</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">Claude 3 Opus:</span>
                    <span class="font-mono">$0.015/1K tokens</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">Claude 3 Sonnet:</span>
                    <span class="font-mono">$0.003/1K tokens</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">Gemini Pro:</span>
                    <span class="font-mono">$0.001/1K tokens</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="mt-6">
              <h4 class="text-sm font-medium mb-3">Usage Controls</h4>
              <div class="space-y-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="pause-on-limit" checked class="cursor-pointer">
                  <span class="text-sm">Pause session when limit reached</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="warning-at-80" checked class="cursor-pointer">
                  <span class="text-sm">Show warning at 80% of limit</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="require-confirmation" class="cursor-pointer">
                  <span class="text-sm">Require confirmation for expensive models (>$0.01/1K)</span>
                </label>
              </div>
            </div>
          </div>
          
          <!-- Advanced Tab -->
          <div id="advanced-content" class="hidden">
            <div class="mb-4">
              <p class="text-sm text-gray-400">Advanced configuration options for Decision OS Pro behavior and compliance settings.</p>
            </div>
            
            <div class="grid grid-cols-2 gap-6">
              <div>
                <h4 class="text-sm font-medium mb-3">System Configuration</h4>
                <div class="space-y-3">
                  <div>
                    <label class="text-xs text-gray-400">Session Timeout (minutes)</label>
                    <input type="number" id="session-timeout" value="60" min="5" max="480"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
                  </div>
                  
                  <div>
                    <label class="text-xs text-gray-400">Max File Size (MB)</label>
                    <select id="max-file-size" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
                      <option value="10">10 MB</option>
                      <option value="25">25 MB</option>
                      <option value="50" selected>50 MB</option>
                      <option value="100">100 MB</option>
                    </select>
                  </div>
                  
                  <div>
                    <label class="text-xs text-gray-400">Default Currency</label>
                    <select id="default-currency" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
                      <option value="USD" selected>USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD (C$)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label class="text-xs text-gray-400">Fiscal Year Start</label>
                    <select id="fiscal-year-start" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
                      <option value="January" selected>January</option>
                      <option value="April">April</option>
                      <option value="July">July</option>
                      <option value="October">October</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 class="text-sm font-medium mb-3">Financial Modeling</h4>
                <div class="space-y-3">
                  <div>
                    <label class="text-xs text-gray-400">Default Tax Rate (%)</label>
                    <input type="number" id="default-tax-rate" value="21" min="0" max="50" step="0.1"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
                  </div>
                  
                  <div>
                    <label class="text-xs text-gray-400">Default Discount Rate (%)</label>
                    <input type="number" id="default-discount-rate" value="10" min="0" max="30" step="0.1"
                      class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
                  </div>
                  
                  <div>
                    <label class="text-xs text-gray-400">Planning Horizon (years)</label>
                    <select id="planning-horizon" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
                      <option value="3">3 years</option>
                      <option value="5" selected>5 years</option>
                      <option value="7">7 years</option>
                      <option value="10">10 years</option>
                    </select>
                  </div>
                </div>
                
                <h4 class="text-sm font-medium mb-3 mt-6">Security & Compliance</h4>
                <div class="space-y-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="encrypt-sessions" checked class="cursor-pointer">
                    <span class="text-sm">Encrypt session data</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="audit-logging" class="cursor-pointer">
                    <span class="text-sm">Enable audit logging</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="data-retention" checked class="cursor-pointer">
                    <span class="text-sm">Auto-delete sessions after 90 days</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="pii-detection" class="cursor-pointer">
                    <span class="text-sm">Warn when PII detected</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div class="mt-6 p-4 bg-blue-900/20 border border-blue-600/30 rounded">
              <h5 class="text-sm font-medium text-blue-400 mb-2">🔒 Enterprise Features</h5>
              <p class="text-xs text-gray-400">Some advanced features require an enterprise license. Contact us for SSO, custom compliance templates, and advanced security features.</p>
            </div>
          </div>
          
          <!-- Save Buttons -->
          <div class="flex justify-between items-center mt-6 pt-6 border-t border-gray-700">
            <div class="text-xs text-gray-500">
              <span id="config-status"></span>
            </div>
            <div class="flex gap-3">
              <button onclick="closeAgentConfig()" class="exec-button secondary">Cancel</button>
              <button onclick="saveAgentConfig()" class="exec-button">Save Configuration</button>
            </div>
          </div>
        </div>
      \`;
      
      document.body.appendChild(modal);
      
      // Load saved configuration if exists
      loadSavedConfiguration();
    }
    
    function closeAgentConfig() {
      const modal = document.getElementById('agent-config-modal');
      if (modal) modal.remove();
    }
    
    // Helper functions for agent configuration
    function switchConfigTab(tabName) {
      // Hide all content divs
      document.getElementById('advisors-content').classList.add('hidden');
      document.getElementById('api-keys-content').classList.add('hidden');
      document.getElementById('budget-content').classList.add('hidden');
      document.getElementById('advanced-content').classList.add('hidden');
      
      // Show selected content
      document.getElementById(tabName + '-content').classList.remove('hidden');
      
      // Update tab styling
      document.querySelectorAll('[id$="-tab"]').forEach(tab => {
        tab.classList.remove('border-b-2', 'border-blue-500', 'text-blue-500');
        tab.classList.add('text-gray-400');
      });
      
      const activeTab = document.getElementById(tabName + '-tab');
      activeTab.classList.remove('text-gray-400');
      activeTab.classList.add('border-b-2', 'border-blue-500', 'text-blue-500');
    }
    
    function toggleKeyVisibility(inputId) {
      const input = document.getElementById(inputId);
      if (input.type === 'password') {
        input.type = 'text';
        event.target.textContent = 'Hide';
      } else {
        input.type = 'password';
        event.target.textContent = 'Show';
      }
    }
    
    async function testApiKey(provider) {
      const keyInput = document.getElementById(provider + '-key');
      const key = keyInput.value.trim();
      
      if (!key) {
        alert('Please enter an API key first');
        return;
      }
      
      event.target.textContent = 'Testing...';
      event.target.disabled = true;
      
      try {
        // Test the API key with a simple request
        let response;
        if (provider === 'openai') {
          response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': 'Bearer ' + key }
          });
        } else if (provider === 'anthropic') {
          response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': key,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              messages: [{ role: 'user', content: 'Hi' }],
              max_tokens: 10
            })
          });
        } else if (provider === 'gemini') {
          response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key);
        }
        
        if (response.ok || response.status === 429) { // 429 is rate limit, but key is valid
          alert('✓ API key is valid!');
          document.getElementById('config-status').textContent = provider + ' key validated';
          document.getElementById('config-status').className = 'text-xs text-green-400';
        } else {
          alert('✗ Invalid API key. Please check and try again.');
          document.getElementById('config-status').textContent = provider + ' key invalid';
          document.getElementById('config-status').className = 'text-xs text-red-400';
        }
      } catch (error) {
        alert('Error testing API key: ' + error.message);
      }
      
      event.target.textContent = 'Test';
      event.target.disabled = false;
    }
    
    function loadSavedConfiguration() {
      // Load API keys from localStorage
      const openaiKey = localStorage.getItem('openai_api_key');
      const anthropicKey = localStorage.getItem('anthropic_api_key');
      const geminiKey = localStorage.getItem('gemini_api_key');
      
      if (openaiKey) document.getElementById('openai-key').value = openaiKey;
      if (anthropicKey) document.getElementById('anthropic-key').value = anthropicKey;
      if (geminiKey) document.getElementById('gemini-key').value = geminiKey;
      
      // Load budget settings
      const sessionLimit = localStorage.getItem('session_limit') || '10.00';
      const dailyLimit = localStorage.getItem('daily_limit') || '50.00';
      const monthlyLimit = localStorage.getItem('monthly_limit') || '500.00';
      
      document.getElementById('session-limit').value = sessionLimit;
      document.getElementById('daily-limit').value = dailyLimit;
      document.getElementById('monthly-limit').value = monthlyLimit;
      
      // Load saved agent configuration
      const savedAgents = localStorage.getItem('selected_agents');
      if (savedAgents) {
        const agents = JSON.parse(savedAgents);
        agents.forEach(agentId => {
          const checkbox = document.getElementById('agent-' + agentId) || 
                           document.getElementById('clearhive-' + agentId);
          if (checkbox) checkbox.checked = true;
        });
      }
      
      // Load advanced settings
      const advancedSettings = localStorage.getItem('advanced_settings');
      if (advancedSettings) {
        const settings = JSON.parse(advancedSettings);
        
        if (document.getElementById('session-timeout')) document.getElementById('session-timeout').value = settings.sessionTimeout || '60';
        if (document.getElementById('max-file-size')) document.getElementById('max-file-size').value = settings.maxFileSize || '50';
        if (document.getElementById('default-currency')) document.getElementById('default-currency').value = settings.defaultCurrency || 'USD';
        if (document.getElementById('fiscal-year-start')) document.getElementById('fiscal-year-start').value = settings.fiscalYearStart || 'January';
        if (document.getElementById('default-tax-rate')) document.getElementById('default-tax-rate').value = settings.defaultTaxRate || '21';
        if (document.getElementById('default-discount-rate')) document.getElementById('default-discount-rate').value = settings.defaultDiscountRate || '10';
        if (document.getElementById('planning-horizon')) document.getElementById('planning-horizon').value = settings.planningHorizon || '5';
        if (document.getElementById('encrypt-sessions')) document.getElementById('encrypt-sessions').checked = settings.encryptSessions !== false;
        if (document.getElementById('audit-logging')) document.getElementById('audit-logging').checked = settings.auditLogging || false;
        if (document.getElementById('data-retention')) document.getElementById('data-retention').checked = settings.dataRetention !== false;
        if (document.getElementById('pii-detection')) document.getElementById('pii-detection').checked = settings.piiDetection || false;
      }
    }
    
    function updateTempDisplay(value) {
      document.getElementById('temp-display').textContent = (value / 10).toFixed(1);
    }
    
    function getAvailableAgents() {
      return {
        ceo: { name: 'Chief Executive', role: 'Strategic vision and leadership', expertise: ['Strategy', 'Leadership', 'Vision'] },
        cfo: { name: 'Chief Financial Officer', role: 'Financial strategy and analysis', expertise: ['Financial Modeling', 'Risk Management', 'Valuation'] },
        cto: { name: 'Chief Technology Officer', role: 'Technology strategy and innovation', expertise: ['Architecture', 'Digital Transformation', 'Cybersecurity'] },
        coo: { name: 'Chief Operating Officer', role: 'Operational excellence', expertise: ['Operations', 'Process Optimization', 'Quality'] },
        cmo: { name: 'Chief Marketing Officer', role: 'Market strategy and growth', expertise: ['Market Strategy', 'Brand', 'Customer Experience'] },
        legal: { name: 'General Counsel', role: 'Legal and compliance', expertise: ['Corporate Law', 'Compliance', 'Contracts'] },
        strategist: { name: 'Chief Strategy Officer', role: 'Strategic planning', expertise: ['Planning', 'Competitive Analysis', 'M&A'] }
      };
    }
    
    function getDefaultAgents() {
      return ['ceo', 'cfo', 'strategist'];
    }
    
    function getClearHiveAdvisors() {
      return {
        healthcare: { name: 'Healthcare Strategy Advisor', role: 'Behavioral health industry expertise' },
        compliance: { name: 'HIPAA Compliance Expert', role: 'Healthcare regulatory compliance' },
        sales: { name: 'B2B Healthcare Sales', role: 'Enterprise healthcare sales strategy' },
        clinical: { name: 'Clinical Operations', role: 'Treatment center operations expertise' }
      };
    }
    
    function saveAgentConfig() {
      // Save API keys
      const openaiKey = document.getElementById('openai-key')?.value.trim();
      const anthropicKey = document.getElementById('anthropic-key')?.value.trim();
      const geminiKey = document.getElementById('gemini-key')?.value.trim();
      
      if (openaiKey) localStorage.setItem('openai_api_key', openaiKey);
      if (anthropicKey) localStorage.setItem('anthropic_api_key', anthropicKey);
      if (geminiKey) localStorage.setItem('gemini_api_key', geminiKey);
      
      // Save budget settings
      const sessionLimit = document.getElementById('session-limit')?.value || '10.00';
      const dailyLimit = document.getElementById('daily-limit')?.value || '50.00';
      const monthlyLimit = document.getElementById('monthly_limit')?.value || '500.00';
      
      localStorage.setItem('session_limit', sessionLimit);
      localStorage.setItem('daily_limit', dailyLimit);
      localStorage.setItem('monthly_limit', monthlyLimit);
      
      // Save selected agents
      const selectedAgents = [];
      const agentModels = {};
      
      document.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        const agentId = cb.value;
        selectedAgents.push(agentId);
        
        // Get the selected model for this agent
        const modelSelect = document.getElementById('model-' + agentId);
        if (modelSelect) {
          agentModels[agentId] = modelSelect.value;
        }
      });
      
      localStorage.setItem('selected_agents', JSON.stringify(selectedAgents));
      localStorage.setItem('agent_models', JSON.stringify(agentModels));
      
      // Save advanced settings
      const advancedSettings = {
        sessionTimeout: document.getElementById('session-timeout')?.value || '60',
        maxFileSize: document.getElementById('max-file-size')?.value || '50',
        defaultCurrency: document.getElementById('default-currency')?.value || 'USD',
        fiscalYearStart: document.getElementById('fiscal-year-start')?.value || 'January',
        defaultTaxRate: document.getElementById('default-tax-rate')?.value || '21',
        defaultDiscountRate: document.getElementById('default-discount-rate')?.value || '10',
        planningHorizon: document.getElementById('planning-horizon')?.value || '5',
        encryptSessions: document.getElementById('encrypt-sessions')?.checked || false,
        auditLogging: document.getElementById('audit-logging')?.checked || false,
        dataRetention: document.getElementById('data-retention')?.checked || true,
        piiDetection: document.getElementById('pii-detection')?.checked || false
      };
      
      localStorage.setItem('advanced_settings', JSON.stringify(advancedSettings));
      
      // Create configuration object
      const config = {
        agents: selectedAgents,
        agentModels: agentModels,
        apiKeys: {
          openai: openaiKey,
          anthropic: anthropicKey,
          gemini: geminiKey
        },
        budget: {
          session: parseFloat(sessionLimit),
          daily: parseFloat(dailyLimit),
          monthly: parseFloat(monthlyLimit)
        },
        advanced: advancedSettings
      };
      
      // Store configuration globally
      window.agentConfiguration = config;
      
      // Update UI
      updateAgentList(selectedAgents);
      closeAgentConfig();
      
      addMessageToDiscussion('System', \`Configuration saved! Selected \${selectedAgents.length} advisors with budget limits.\`, 'system');
    }
    
    function updateAgentList(agents) {
      const agentList = document.getElementById('agent-list');
      const allAgents = {...getAvailableAgents(), ...getClearHiveAdvisors()};
      
      agentList.innerHTML = agents.map(agentKey => {
        const agent = allAgents[agentKey] || allAgents[agentKey.replace('clearhive-', '')];
        if (!agent) return '';
        return \`<div class="text-xs text-gray-400">• \${agent.name}</div>\`;
      }).join('');
    }
    
    function uploadDocuments() {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.id = 'document-upload-modal';
      
      modal.innerHTML = \`
        <div class="bg-gray-800 rounded-lg p-6 w-[600px]">
          <h2 class="text-xl font-semibold mb-4">Document Management</h2>
          
          <div class="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center mb-4">
            <input type="file" id="file-input" multiple class="hidden" 
              accept=".pdf,.docx,.xlsx,.txt,.md,.json">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p class="text-sm text-gray-400 mb-2">Drop files here or click to browse</p>
            <button onclick="document.getElementById('file-input').click()" 
              class="exec-button secondary">Select Files</button>
          </div>
          
          <div class="flex justify-end gap-3">
            <button onclick="document.getElementById('document-upload-modal').remove()" 
              class="exec-button secondary">Cancel</button>
            <button onclick="processDocumentUpload()" class="exec-button">Upload</button>
          </div>
        </div>
      \`;
      
      document.body.appendChild(modal);
    }
    
    function processDocumentUpload() {
      // Document processing logic here
      const files = document.getElementById('file-input').files;
      console.log('Uploading files:', files);
      document.getElementById('document-upload-modal').remove();
    }
    
    function addDecision() {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.id = 'decision-modal';
      
      modal.innerHTML = \`
        <div class="bg-gray-800 rounded-lg p-6 w-[700px]">
          <h2 class="text-xl font-semibold mb-4">Add Strategic Decision</h2>
          
          <div class="space-y-4">
            <div>
              <label class="text-sm text-gray-400">Decision Title</label>
              <input type="text" id="decision-title" 
                class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1"
                placeholder="e.g., Expand into European markets">
            </div>
            
            <div>
              <label class="text-sm text-gray-400">Category</label>
              <select id="decision-category" 
                class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1">
                <option value="strategic">Strategic</option>
                <option value="financial">Financial</option>
                <option value="operational">Operational</option>
                <option value="personnel">Personnel</option>
                <option value="technology">Technology</option>
              </select>
            </div>
            
            <div>
              <label class="text-sm text-gray-400">Impact Assessment</label>
              <textarea id="decision-impact" rows="3"
                class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1"
                placeholder="Describe the expected impact..."></textarea>
            </div>
            
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="text-sm text-gray-400">Confidence Level</label>
                <select id="decision-confidence" 
                  class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1">
                  <option value="high">High (>80%)</option>
                  <option value="medium">Medium (50-80%)</option>
                  <option value="low">Low (<50%)</option>
                </select>
              </div>
              
              <div>
                <label class="text-sm text-gray-400">Priority</label>
                <select id="decision-priority" 
                  class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              <div>
                <label class="text-sm text-gray-400">Timeline</label>
                <input type="date" id="decision-timeline" 
                  class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1">
              </div>
            </div>
          </div>
          
          <div class="flex justify-end gap-3 mt-6">
            <button onclick="document.getElementById('decision-modal').remove()" 
              class="exec-button secondary">Cancel</button>
            <button onclick="saveDecision()" class="exec-button">Save Decision</button>
          </div>
        </div>
      \`;
      
      document.body.appendChild(modal);
    }
    
    function saveDecision() {
      const decision = {
        title: document.getElementById('decision-title').value,
        category: document.getElementById('decision-category').value,
        impact: document.getElementById('decision-impact').value,
        confidence: document.getElementById('decision-confidence').value,
        priority: document.getElementById('decision-priority').value,
        timeline: document.getElementById('decision-timeline').value,
        timestamp: new Date().toISOString()
      };
      
      // Save to localStorage for now
      const decisions = JSON.parse(localStorage.getItem('decisions') || '[]');
      decisions.push(decision);
      localStorage.setItem('decisions', JSON.stringify(decisions));
      
      // Update UI
      updateDecisionsList();
      document.getElementById('decision-modal').remove();
    }
    
    function updateDecisionsList() {
      const decisions = JSON.parse(localStorage.getItem('decisions') || '[]');
      const decisionOS = document.querySelector('.executive-card h3 span').parentElement.parentElement;
      
      if (decisions.length > 0) {
        const listHtml = decisions.map(d => \`
          <div class="mt-2 p-2 bg-gray-700 rounded">
            <div class="font-semibold text-sm">\${d.title}</div>
            <div class="text-xs text-gray-400">\${d.category} • \${d.priority} priority</div>
          </div>
        \`).join('');
        
        decisionOS.innerHTML = \`
          <h3 class="text-sm font-semibold mb-3 flex items-center justify-between">
            <span>Active Decisions</span>
            <span class="text-xs text-gray-400">\${decisions.length}</span>
          </h3>
          \${listHtml}
        \`;
      }
    }
    
    // Scenario presets function
    function loadScenarioPreset(preset) {
      const presets = {
        conservative: { price: 3000, cac: 3000, winrate: 15, growth: 10 },
        moderate: { price: 5000, cac: 2000, winrate: 25, growth: 20 },
        aggressive: { price: 8000, cac: 1500, winrate: 40, growth: 35 }
      };
      
      if (presets[preset]) {
        document.getElementById('price-slider').value = presets[preset].price;
        document.getElementById('cac-slider').value = presets[preset].cac;
        document.getElementById('winrate-slider').value = presets[preset].winrate;
        if (document.getElementById('growth-slider')) {
          document.getElementById('growth-slider').value = presets[preset].growth;
        }
        updateScenario();
      }
    }
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
      updateChart();
      updateScenario();
      updateDecisionsList();
    });
  </script>
</body>
</html>`;
  }
  
  start() {
    this.server.listen(CONFIG.port, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                   🚀 CLEARHIVE HEALTH 🏥                    ║
║               Launch Command Center v1.0                     ║
║                                                              ║
║  Founders: Jimmy & Mike                                      ║
║  Mission:  Transform Healthcare Delivery                     ║
║  Status:   ✓ Ready to Launch                                ║
║  Port:     ${CONFIG.port}                                          ║
║  URL:      http://localhost:${CONFIG.port}                         ║
║                                                              ║
║  "Building the future of healthcare, one provider at a time" ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  }
}

// ==========================================
// INITIALIZATION
// ==========================================

const decisionOS = new DecisionOS();
const server = new DecisionOSServer(decisionOS);
server.start();

export { DecisionOS, StrategicSession, FinancialEngine, MetricsEngine };
