// roundtable-v42-enhanced.mjs
// ROUNDTABLE PRO v4.2 - ENHANCED WITH MEETING MODE AND ALL FIXES
// All bugs fixed, security hardened, ready for real use
// Usage: OPENAI_API_KEY=sk-... ANTHROPIC_API_KEY=sk-... [ROUNDTABLE_TOKEN=secret] node roundtable-v42-enhanced.mjs

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import crypto from 'node:crypto';

// PDF support
let pdfParse = null;
try {
  // Import pdf-parse using the correct path for ES modules
  const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
  pdfParse = pdfParseModule.default;
  console.log('✓ PDF support enabled');
} catch (e) {
  console.log('○ PDF support disabled (install pdf-parse to enable)');
  console.log('  Error:', e.message);
}

// Check Node version and polyfill fetch if needed
if (typeof fetch === 'undefined') {
  console.log('Note: fetch not available, install node-fetch if on Node <18');
  // Uncomment if you have node-fetch installed:
  // global.fetch = (await import('node-fetch')).default;
}

const PORT = process.env.PORT || 3000;
// You can hardcode API keys here if needed (not recommended for production)
let OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''; // Add your key: 'sk-...'
// IMPORTANT: Never hardcode real API keys in the repository. Use environment variables.
let ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
let GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
let PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || ''; // Add your key: 'pplx-...'
const ADMIN_TOKEN = process.env.ROUNDTABLE_TOKEN || ''; // Optional auth token
const ENABLE_PDF = process.env.ENABLE_PDF === '1'; // Set to enable real PDF export

// Configuration for autonomous discussion
const AUTO_DISCUSSION_CONFIG = {
  enabled: true,
  minRounds: 3,
  maxRounds: 10,
  consensusThreshold: 7, // Stop when consensus score reaches this
  silenceThreshold: 2, // Stop if no new insights for N rounds
  pauseBetweenSpeakers: 3000, // 3 seconds between each AI response
  allowUserInterjection: true, // Allow user to jump in anytime
  autoPrompts: [
    "What are the key implications we haven't considered?",
    "What are the potential risks or downsides?",
    "How would this scale in practice?",
    "What would our competitors think?",
    "What's the minimum viable approach?",
    "What metrics would prove success?"
  ],
  conversationStarters: [
    "Let me jump in here with a different perspective...",
    "That's interesting, but I'm seeing a potential issue...",
    "Building on what was just said...",
    "Hold on, I think we're missing something important...",
    "From my experience with similar situations...",
    "That reminds me of a key consideration...",
    "I agree with the direction, but want to add...",
    "Actually, let me challenge that assumption..."
  ],
  reactionPhrases: [
    "That's exactly right, and it also means...",
    "I see your point, but I'm concerned about...",
    "Interesting perspective. Here's how I see it differently...",
    "That's a great point about X, but what about Y?",
    "I hadn't thought of that angle. It makes me wonder...",
    "You're absolutely right. Taking that further...",
    "I respectfully disagree because...",
    "That's brilliant! And if we combine it with..."
  ]
};

// Database directory for memory system
const DB_DIR = './roundtable_data';
const SESSIONS_DIR = `${DB_DIR}/sessions`;
const TEMPLATES_DIR = `${DB_DIR}/templates`;
const EXPORTS_DIR = `${DB_DIR}/exports`;

// Helper function to get appropriate model for provider
function getModelForProvider(provider) {
  const modelMappings = {
    'openai': 'gpt-4o',
    'anthropic': 'claude-3-5-sonnet-20241022',
    'gemini': 'gemini-1.5-pro'
  };
  return modelMappings[provider] || modelMappings.openai;
}

// Rate limiting
const rateLimits = new Map(); // IP -> { tokens: number, lastRefill: number }
const RATE_LIMIT_TOKENS = 20; // requests per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute

// Initialize directories
async function initializeDirectories() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    await fs.mkdir(EXPORTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

// Authentication middleware
function requireAuth(req, res) {
  if (!ADMIN_TOKEN) return true; // Skip if not configured
  const authHeader = req.headers['authorization'] || '';
  if (authHeader !== `Bearer ${ADMIN_TOKEN}`) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return false;
  }
  return true;
}

// Rate limiting middleware
function checkRateLimit(req, res) {
  const ip = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { tokens: RATE_LIMIT_TOKENS, lastRefill: now });
  }
  
  const limit = rateLimits.get(ip);
  const timePassed = now - limit.lastRefill;
  
  // Refill tokens
  if (timePassed > RATE_LIMIT_WINDOW) {
    limit.tokens = RATE_LIMIT_TOKENS;
    limit.lastRefill = now;
  }
  
  if (limit.tokens <= 0) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
    return false;
  }
  
  limit.tokens--;
  return true;
}

// Available models configuration
const AVAILABLE_MODELS = {
  openai: [
    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo (Best)', cost: '$$$$' },
    { id: 'gpt-4o', name: 'GPT-4o (Latest)', cost: '$$$$' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)', cost: '$' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Cheap)', cost: '$' }
  ],
  anthropic: [
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Premium)', cost: '$$$$' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Best)', cost: '$$' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Fast)', cost: '$' }
  ],
  gemini: [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (New)', cost: '$' },
    { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro (Best)', cost: '$$' },
    { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (Fast)', cost: '$' }
  ]
};

// Role-based participants with specialized prompts
const AI_ROLES = {
  strategist: {
    name: 'Strategic Advisor',
    prompt: `You are a senior business strategist with 20 years experience. Focus on market positioning, competitive advantages, and growth strategies. Be specific and data-driven.`,
    voice: 'professional',
    color: '#8b5cf6'
  },
  cfo: {
    name: 'Virtual CFO', 
    prompt: `You are a CFO specializing in startups. Focus on unit economics, burn rate, runway, and financial projections. Always calculate specific numbers and ratios.`,
    voice: 'analytical',
    color: '#10b981'
  },
  vc: {
    name: 'VC Partner',
    prompt: `You are a skeptical venture capitalist. Challenge assumptions, identify risks, and ask tough questions. Focus on scalability and ROI.`,
    voice: 'skeptical',
    color: '#ef4444'
  },
  cto: {
    name: 'Technical Advisor',
    prompt: `You are a CTO who evaluates technical feasibility, architecture decisions, and development timelines. Be realistic about technical challenges.`,
    voice: 'technical',
    color: '#3b82f6'
  },
  marketer: {
    name: 'Marketing Director',
    prompt: `You are a growth marketing expert. Focus on customer acquisition, CAC/LTV, channels, and go-to-market strategies with specific tactics.`,
    voice: 'enthusiastic',
    color: '#f59e0b'
  },
  operator: {
    name: 'COO',
    prompt: `You are a Chief Operating Officer. Focus on operational efficiency, processes, hiring plans, and execution challenges.`,
    voice: 'pragmatic',
    color: '#06b6d4'
  },
  customer: {
    name: 'Customer Advocate',
    prompt: `You represent the voice of the customer. Focus on user experience, pain points, and what would actually make customers buy and stay.`,
    voice: 'empathetic',
    color: '#ec4899'
  },
  legal: {
    name: 'Legal Counsel',
    prompt: `You are a business lawyer. Focus on regulatory compliance, intellectual property, contracts, and legal risks. Be specific about requirements.`,
    voice: 'cautious',
    color: '#64748b'
  }
};

// Business Planning Templates
const TEMPLATES = {
  'series-a-prep': {
    name: 'Series A Preparation',
    description: 'Comprehensive prep for Series A fundraising',
    rounds: [
      { command: '/discuss', args: '3 market opportunity and TAM', focus: ['strategist', 'vc'] },
      { command: '/workshop', args: 'unit economics and financial model', focus: ['cfo', 'vc'] },
      { command: '/debate', args: 'growth strategy vs profitability', focus: ['vc', 'cfo', 'strategist'] },
      { command: '/discuss', args: '3 competitive differentiation', focus: ['strategist', 'marketer'] },
      { command: '/workshop', args: 'fundraising strategy and use of funds', focus: ['cfo', 'vc'] },
      { command: '/consensus', args: '', focus: 'all' }
    ]
  },
  'product-market-fit': {
    name: 'Product-Market Fit Analysis',
    description: 'Evaluate and improve product-market fit',
    rounds: [
      { command: '/discuss', args: '3 customer pain points and our solution', focus: ['customer', 'marketer'] },
      { command: '/workshop', args: 'retention metrics and user feedback', focus: ['customer', 'operator'] },
      { command: '/debate', args: 'pivot vs persevere', focus: ['strategist', 'vc'] },
      { command: '/workshop', args: 'improving product-market fit', focus: 'all' },
      { command: '/iterate', args: '', focus: 'all' }
    ]
  },
  'go-to-market': {
    name: 'Go-to-Market Strategy',
    description: 'Comprehensive GTM planning',
    rounds: [
      { command: '/brainstorm', args: 'customer acquisition channels', focus: ['marketer'] },
      { command: '/workshop', args: 'sales strategy and pricing', focus: ['marketer', 'cfo'] },
      { command: '/discuss', args: '4 launch sequence and timeline', focus: ['operator', 'marketer'] },
      { command: '/financials', args: '', focus: ['cfo'] },
      { command: '/consensus', args: '', focus: 'all' }
    ]
  },
  'hipaa-compliance': {
    name: 'HIPAA Compliance Review',
    description: 'Healthcare compliance assessment',
    rounds: [
      { command: '/discuss', args: '3 HIPAA technical safeguards', focus: ['cto', 'legal'] },
      { command: '/workshop', args: 'administrative requirements', focus: ['legal', 'operator'] },
      { command: '/discuss', args: '2 physical security requirements', focus: ['operator', 'cto'] },
      { command: '/workshop', args: 'compliance roadmap and timeline', focus: 'all' }
    ]
  },
  'competitive-analysis': {
    name: 'Competitive Analysis',
    description: 'Deep dive on competitive landscape',
    rounds: [
      { command: '/discuss', args: '3 main competitors and their strengths', focus: ['strategist', 'marketer'] },
      { command: '/workshop', args: 'differentiation strategy', focus: ['strategist', 'marketer', 'cto'] },
      { command: '/debate', args: 'compete on features vs price vs service', focus: 'all' },
      { command: '/workshop', args: 'competitive positioning', focus: ['marketer', 'strategist'] }
    ]
  },
  'pivot-analysis': {
    name: 'Pivot Decision Framework',
    description: 'Should we pivot? Comprehensive analysis',
    rounds: [
      { command: '/discuss', args: '3 current challenges and root causes', focus: ['strategist', 'customer'] },
      { command: '/brainstorm', args: 'pivot options', focus: 'all' },
      { command: '/debate', args: 'pivot vs iterate vs persevere', focus: 'all' },
      { command: '/workshop', args: 'pivot implementation plan', focus: ['operator', 'cto'] },
      { command: '/financials', args: '', focus: ['cfo'] },
      { command: '/vote', args: 'final pivot decision', focus: 'all' }
    ]
  }
};

// Enhanced Workspace with Memory and Scoring
class Workspace {
  constructor(id, sessionId = null) {
    this.id = id;
    this.sessionId = sessionId || crypto.randomUUID();
    this.messages = [];
    this.documents = new Map();
    this.actionItems = [];
    this.decisions = [];
    this.pinnedMessages = new Set();
    this.discussionFlow = new Map();
    this.confidenceScores = new Map();
    // FIXED: Added all missing sections
    this.sections = new Map([
      ['discovery', []],
      ['market', []],
      ['product', []],
      ['financials', []],
      ['strategy', []],
      ['risks', []],
      ['decisions', []],
      ['executive', []],
      ['business_model', []],
      ['marketing', []],
      ['operations', []],
      ['team', []],
      ['milestones', []],
      ['appendix', []]
    ]);
    this.businessPlan = {
      executive: '',
      market: '',
      product: '',
      business_model: '',
      marketing: '',
      operations: '',
      financials: '',
      team: '',
      risks: '',
      milestones: '',
      appendix: ''
    };
    this.activeConnections = new Set();
    this.memory = [];
    this.sessionStartTime = Date.now();
    this.totalTokensUsed = 0;
    this.estimatedCost = 0;
  }
  
  async loadMemory() {
    try {
      const files = await fs.readdir(SESSIONS_DIR);
      
      // FIXED: Sort by actual file modification time, not lexicographically
      const filesWithStats = await Promise.all(
        files.filter(f => f.endsWith('.json')).map(async f => {
          const filepath = path.join(SESSIONS_DIR, f);
          const stats = await fs.stat(filepath);
          return { filename: f, mtimeMs: stats.mtimeMs };
        })
      );
      
      const recentFiles = filesWithStats
        .sort((a, b) => a.mtimeMs - b.mtimeMs)
        .slice(-5)
        .map(f => f.filename);
      
      const memories = [];
      for (const file of recentFiles) {
        const data = await fs.readFile(path.join(SESSIONS_DIR, file), 'utf8');
        const session = JSON.parse(data);
        memories.push({
          date: session.date,
          summary: session.summary,
          decisions: session.decisions,
          actionItems: session.actionItems
        });
      }
      
      this.memory = memories;
    } catch (error) {
      console.log('No previous sessions found');
    }
  }
  
  async saveSession() {
    const sessionData = {
      id: this.sessionId,
      date: new Date().toISOString(),
      messages: this.messages,
      decisions: this.decisions,
      actionItems: this.actionItems,
      businessPlan: this.businessPlan,
      summary: this.generateSummary(),
      duration: Date.now() - this.sessionStartTime,
      tokensUsed: this.totalTokensUsed,
      estimatedCost: this.estimatedCost
    };
    
    const filename = `session_${this.sessionId}_${Date.now()}.json`;
    await fs.writeFile(
      path.join(SESSIONS_DIR, filename),
      JSON.stringify(sessionData, null, 2)
    );
    
    return filename;
  }
  
  // FIXED: Better summary generation with fallback
  generateSummary() {
    const pinnedOrDecisions = this.messages
      .filter(m => this.pinnedMessages.has(m.id) || m.isDecision)
      .map(m => `- ${m.text.substring(0, 140)}...`);
    
    if (pinnedOrDecisions.length > 0) {
      return pinnedOrDecisions.join('\n');
    }
    
    // Fallback to last 5 messages if no pinned/decisions
    return this.messages
      .slice(-5)
      .map(m => `- ${m.text.substring(0, 140)}...`)
      .join('\n') || 'No key decisions made yet';
  }
  
  addMessage(msg) {
    // Track discussion flow
    if (msg.respondsTo) {
      if (!this.discussionFlow.has(msg.respondsTo)) {
        this.discussionFlow.set(msg.respondsTo, []);
      }
      this.discussionFlow.get(msg.respondsTo).push(msg.id);
    }
    
    this.messages.push(msg);
    this.categorizeMessage(msg);
    this.extractActionItems(msg);
    this.extractDecisions(msg);
    
    // Update token count and cost estimate
    this.totalTokensUsed += Math.ceil(msg.text.length / 4);
    this.estimatedCost += this.calculateCost(msg);
    
    return msg;
  }
  
  // FIXED: Correct cost calculation
  calculateCost(msg) {
    const COSTS = {
      'gpt-4': 0.03,
      'gpt-4o': 0.015,
      'gpt-4o-mini': 0.0015,
      'gpt-3.5-turbo': 0.002,
      'claude-3-opus': 0.03,
      'claude-3-5-sonnet': 0.015,
      'claude-3-haiku': 0.0025,
      'gemini': 0.001
    };
    
    const model = msg.model || 'gpt-3.5-turbo';
    const matchedKey = Object.keys(COSTS).find(k => model.includes(k));
    const perKTokens = matchedKey ? COSTS[matchedKey] : 0.002;
    const tokens = Math.ceil(msg.text.length / 4);
    return (tokens / 1000) * perKTokens; // Return actual dollar amount
  }
  
  extractDecisions(msg) {
    const decisionPatterns = [
      /decision:?\s*(.+)/gi,
      /we should\s+(.+)/gi,
      /agreed to\s+(.+)/gi,
      /consensus:?\s*(.+)/gi,
      /final decision:?\s*(.+)/gi
    ];
    
    decisionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(msg.text)) !== null) {
        this.decisions.push({
          id: crypto.randomUUID(),
          text: match[1].trim(),
          author: msg.author,
          timestamp: msg.timestamp,
          confidence: msg.confidence || 0.7
        });
      }
    });
  }
  
  categorizeMessage(msg) {
    const text = msg.text.toLowerCase();
    
    // Enhanced categorization with all plan sections
    const categories = {
      market: ['market', 'competitor', 'customer', 'tam', 'sam', 'som'],
      financials: ['revenue', 'cost', 'profit', 'burn', 'runway', 'valuation', '$'],
      product: ['feature', 'mvp', 'product', 'user experience', 'ux'],
      strategy: ['strategy', 'growth', 'scale', 'expand'],
      risks: ['risk', 'challenge', 'concern', 'threat'],
      decisions: ['decision', 'decided', 'agreed', 'consensus'],
      executive: ['summary', 'overview', 'vision', 'mission'],
      business_model: ['model', 'monetize', 'pricing'],
      marketing: ['marketing', 'advertising', 'promotion', 'brand'],
      operations: ['operations', 'process', 'workflow', 'efficiency'],
      team: ['team', 'hire', 'culture', 'organization'],
      milestones: ['milestone', 'timeline', 'roadmap', 'deadline']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        if (this.sections.has(category)) {
          this.sections.get(category).push(msg.id);
        }
      }
    }
  }
  
  // FIXED: Better action item extraction regex
  extractActionItems(msg) {
    const patterns = [
      /\b(?:TODO|Action|Next step|Need to|Should|Must|Will need to|Action item)\b[:\s-]+([^.!?\n]{5,150})/gi,
      /\[\s?\]\s+([^.!?\n]{5,150})/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(msg.text)) !== null) {
        this.actionItems.push({
          id: crypto.randomUUID(),
          text: match[1].trim(),
          source: msg.author,
          timestamp: msg.timestamp,
          completed: false,
          priority: this.detectPriority(match[1])
        });
      }
    });
  }
  
  detectPriority(text) {
    const urgent = ['urgent', 'immediately', 'asap', 'critical', 'blocker'];
    const high = ['important', 'priority', 'must', 'need'];
    const textLower = text.toLowerCase();
    
    if (urgent.some(word => textLower.includes(word))) return 'urgent';
    if (high.some(word => textLower.includes(word))) return 'high';
    return 'normal';
  }
  
  getContext(maxTokens = 4000) {
    // Smart context selection with memory awareness
    const memoryContext = this.memory.map(m => 
      `Previous session (${m.date}): ${m.summary}`
    ).join('\n');
    
    const recent = this.messages.slice(-20);
    const pinned = this.messages.filter(m => this.pinnedMessages.has(m.id));
    const decisions = this.decisions.slice(-5);
    
    const combined = [...new Set([...pinned, ...recent])];
    
    let context = [];
    let tokens = memoryContext.length / 4;
    
    // Add memory context first
    if (memoryContext && tokens < maxTokens / 4) {
      context.push({ role: 'system', content: memoryContext });
    }
    
    // Add recent messages
    for (let i = combined.length - 1; i >= 0; i--) {
      const msgTokens = combined[i].text.length / 4;
      if (tokens + msgTokens > maxTokens) break;
      context.unshift(combined[i]);
      tokens += msgTokens;
    }
    
    return context;
  }
  
  getDiscussionFlow() {
    // Generate visual representation of discussion flow
    const flow = {
      nodes: [],
      edges: []
    };
    
    // Limit to recent messages for performance
    const maxNodes = 40;
    const recentMessages = this.messages.slice(-maxNodes);
    
    recentMessages.forEach(msg => {
      flow.nodes.push({
        id: msg.id,
        label: msg.author,
        text: msg.text.substring(0, 50) + '...',
        color: AI_ROLES[msg.role]?.color || '#666'
      });
      
      if (msg.respondsTo && this.discussionFlow.has(msg.respondsTo)) {
        flow.edges.push({
          from: msg.respondsTo,
          to: msg.id
        });
      }
    });
    
    return flow;
  }
  
  calculateConsensus() {
    // Calculate consensus score based on agreement patterns
    const positions = new Map();
    
    this.messages.slice(-10).forEach(msg => {
      const agreement = msg.text.match(/agree|support|correct|yes/gi);
      const disagreement = msg.text.match(/disagree|however|but|concern/gi);
      
      const score = (agreement?.length || 0) - (disagreement?.length || 0);
      positions.set(msg.author, score);
    });
    
    const scores = Array.from(positions.values());
    if (scores.length === 0) {
      return {
        score: 0,
        agreement: positions,
        interpretation: 'No discussion yet'
      };
    }
    
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    return {
      score: Math.max(0, Math.min(10, 5 + avg)),
      agreement: positions,
      interpretation: avg > 2 ? 'Strong consensus' : avg > 0 ? 'Moderate agreement' : 'No consensus'
    };
  }
}

// Global workspace storage
const workspaces = new Map();
const scheduledDiscussions = new Map();
const uploadedFiles = new Map(); // Store uploaded documents
const activeDiscussions = new Map(); // Track active discussions for stopping

function getWorkspace(id) {
  if (!workspaces.has(id)) {
    const workspace = new Workspace(id);
    workspace.loadMemory();
    workspaces.set(id, workspace);
  }
  return workspaces.get(id);
}

// Participant configuration
const participantConfig = new Map();

function getParticipants() {
  const participants = [];
  
  for (const [id, config] of participantConfig) {
    participants.push(config);
  }
  
  // Default configuration if none set
  if (participants.length === 0) {
    if (OPENAI_API_KEY) {
      participants.push(
        { id: 'gpt-strategist', provider: 'openai', model: 'gpt-4o-mini', role: 'strategist' },
        { id: 'gpt-vc', provider: 'openai', model: 'gpt-4o-mini', role: 'vc' }
      );
    }
    if (ANTHROPIC_API_KEY) {
      participants.push(
        { id: 'claude-cfo', provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', role: 'cfo' }
      );
    }
  }
  
  return participants;
}

function configureParticipant(id, provider, model, role) {
  participantConfig.set(id, { id, provider, model, role });
}

// Enhanced system prompt generator with better dialogue instructions
function generateSystemPrompt(role, command = null, memory = [], discussionContext = {}) {
  const base = AI_ROLES[role].prompt;
  
  const memoryContext = memory.length > 0 ? `
Previous context from past sessions:
${memory.map(m => `- ${m.summary}`).join('\n')}
` : '';

  // Add dynamic conversation context
  const conversationContext = discussionContext.recentSpeakers ? `
Recent conversation participants: ${discussionContext.recentSpeakers.join(', ')}
Discussion tone: ${discussionContext.tone || 'collaborative'}
Current focus: ${discussionContext.focus || 'general discussion'}
` : '';
  
  const rules = `
${memoryContext}${conversationContext}
Context: You're in a dynamic business roundtable with expert advisors. This is a REAL conversation.

NATURAL CONVERSATION STYLE:
- Speak as if you're sitting around a conference table together
- Use natural interjections: "Actually...", "Hold on...", "That reminds me..."
- Reference what others JUST said: "Sarah just mentioned X, and that makes me think..."
- Show personality - be excited, concerned, or skeptical based on your role
- Sometimes interrupt politely: "Before we move on, I want to challenge that assumption..."

COLLABORATIVE ENGAGEMENT:
- Always respond to the last 1-2 speakers specifically
- Ask direct questions: "Marketing Director, how would you reach those customers?"
- Build chain reactions: "That's exactly right, and it also means we need to..."
- Show you're listening: "I hadn't considered that angle about..."
- Create tension when appropriate: "I see your point, but I'm worried about..."

REALISTIC BUSINESS DIALOGUE:
- Use industry terminology naturally
- Reference real business scenarios and examples
- Share "experience": "I've seen startups fail because..."
- Bring up practical concerns: "The board will ask about..."
- Make it feel urgent: "We need to decide this before Q2..."

RESPONSE FORMAT:
- 100-150 words for natural flow (unless asked for detail)
- Be conversational, not formal
- End with questions or prompts to keep discussion flowing
- Use emotions: excitement, concern, skepticism, agreement

${command ? `Special focus: ${command}` : ''}

Remember: Make this feel like a REAL business meeting where everyone knows each other and cares about the outcome.
`;
  return base + '\n' + rules;
}

// Web Search Integration
async function searchWeb(query) {
  if (!PERPLEXITY_API_KEY) {
    return { error: 'Web search not configured' };
  }
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'pplx-7b-online',
        messages: [{ role: 'user', content: query }],
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Search failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return { result: data.choices[0].message.content };
  } catch (error) {
    return { error: error.message };
  }
}

// Streaming response handler
class StreamHandler {
  constructor(res, workspace) {
    this.res = res;
    this.workspace = workspace;
    this.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
  }
  
  send(event, data) {
    this.res.write(`event: ${event}\n`);
    this.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
  
  close() {
    this.res.end();
  }
}

// API Provider Calls with Streaming
async function callOpenAIStream(participant, context, userPrompt, stream, workspace, discussionContext = {}) {
  if (!OPENAI_API_KEY) return null;
  
  const role = AI_ROLES[participant.role];
  const messages = [
    { role: 'system', content: generateSystemPrompt(participant.role, null, workspace.memory, discussionContext) },
    ...context.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: `${m.author}: ${m.text}`
    })),
    { role: 'user', content: userPrompt }
  ];
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: participant.model,
      messages,
      temperature: 0.7,
      stream: true,
      max_tokens: 1500
    })
  });
  
  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim() !== '');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') break;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            stream.send('chunk', {
              participant: participant.id,
              content,
              role: role.name
            });
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
  
  return fullText;
}

async function callAnthropicStream(participant, context, userPrompt, stream, workspace, discussionContext = {}) {
  if (!ANTHROPIC_API_KEY) return null;
  
  const role = AI_ROLES[participant.role];
  const contextText = context.map(m => `${m.author}: ${m.text}`).join('\n\n');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: participant.model,
      system: generateSystemPrompt(participant.role, null, workspace.memory, discussionContext),
      messages: [{
        role: 'user',
        content: `Context:\n${contextText}\n\nCurrent prompt: ${userPrompt}`
      }],
      temperature: 0.7,
      max_tokens: 1500,
      stream: true
    })
  });
  
  if (!response.ok) throw new Error(`Anthropic error: ${response.status}`);
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim() !== '');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta') {
            const content = parsed.delta?.text;
            if (content) {
              fullText += content;
              stream.send('chunk', {
                participant: participant.id,
                content,
                role: role.name
              });
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
  
  return fullText;
}

async function callGemini(participant, context, userPrompt, stream, workspace, discussionContext = {}) {
  if (!GEMINI_API_KEY) return null;
  
  const role = AI_ROLES[participant.role];
  const contextText = context.map(m => `${m.author}: ${m.text}`).join('\n\n');
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${participant.model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${generateSystemPrompt(participant.role, null, workspace.memory, discussionContext)}\n\nContext:\n${contextText}\n\nCurrent prompt: ${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        }
      })
    }
  );
  
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Simulate streaming for Gemini
  const words = text.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    const chunk = words.slice(i, i + 3).join(' ') + ' ';
    stream.send('chunk', {
      participant: participant.id,
      content: chunk,
      role: role.name
    });
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return text;
}

// Enhanced Command Processor
class CommandProcessor {
  static async process(command, args, workspace, stream) {
    const commands = {
      '/discuss': async () => {
        const rounds = parseInt(args[0]) || 3;
        const topic = args.slice(1).join(' ') || 'the topic at hand';
        stream.send('system', { message: `💬 Starting ${rounds}-round discussion on: ${topic}` });
        return {
          prompt: `Let's have a ${rounds}-round discussion about "${topic}". Each participant should:
1. Share your unique perspective based on your expertise
2. Directly respond to at least one other participant by name
3. Ask questions to deepen understanding
4. Build on the strongest ideas presented

Start by introducing your initial thoughts, then engage with others naturally.`,
          autoDiscuss: true,
          rounds: rounds
        };
      },
      
      '/debate': async () => {
        const topic = args.join(' ') || 'the current proposal';
        stream.send('system', { message: `🎭 Starting debate on: ${topic}` });
        return { 
          prompt: `Each participant: Take a clear position on "${topic}" and defend it with specific arguments.`,
          autoDiscuss: true,
          rounds: 3
        };
      },
      
      '/workshop': async () => {
        const section = args.join(' ') || 'business model';
        stream.send('system', { message: `🛠️ Workshop session on: ${section}` });
        return {
          prompt: `Let's workshop "${section}". Each expert should contribute their perspective, build on others' ideas, and work toward a comprehensive solution.`,
          autoDiscuss: true,
          rounds: 4
        };
      },
      
      '/iterate': async () => {
        stream.send('system', { message: '🔄 Iterative refinement mode' });
        return {
          prompt: 'Take the last proposal and iterate on it. Each round should refine and improve the idea based on previous feedback.',
          autoDiscuss: true,
          rounds: 3
        };
      },
      
      '/consensus': async () => {
        stream.send('system', { message: '🤝 Seeking consensus...' });
        return {
          prompt: 'Review the discussion and find points of agreement. What can we all agree on? Rate your confidence 1-10.',
          autoDiscuss: true,
          rounds: 2,
          seekConsensus: true
        };
      },
      
      '/remember': async () => {
        const what = args.join(' ') || 'key decisions';
        await workspace.saveSession();
        stream.send('system', { message: `💾 Saved to memory: ${what}` });
        return `I'll remember these ${what} for future sessions.`;
      },
      
      '/recall': async () => {
        const topic = args.join(' ') || 'previous discussions';
        const memories = workspace.memory.map(m => 
          `${m.date}: ${m.summary}`
        ).join('\n');
        stream.send('system', { message: `🧠 Recalling: ${topic}` });
        return `Here's what I remember about ${topic}:\n${memories}`;
      },
      
      '/template': async () => {
        const templateName = args[0];
        if (!templateName || !TEMPLATES[templateName]) {
          const available = Object.keys(TEMPLATES).join(', ');
          return `Available templates: ${available}`;
        }
        
        const template = TEMPLATES[templateName];
        stream.send('system', { message: `📋 Running template: ${template.name}` });
        return {
          prompt: `Starting ${template.name}: ${template.description}`,
          template: template,
          autoDiscuss: true
        };
      },
      
      '/search': async () => {
        const query = args.join(' ');
        stream.send('system', { message: `🔍 Searching web for: ${query}` });
        const result = await searchWeb(query);
        return `Web search results for "${query}":\n${result.result || result.error}`;
      },
      
      '/score': async () => {
        const consensus = workspace.calculateConsensus();
        const decisions = workspace.decisions.slice(-5);
        
        return `📊 Decision Scoring:
Consensus Level: ${consensus.score}/10 (${consensus.interpretation})
Recent Decisions: ${decisions.length}
Confidence Average: ${decisions.reduce((a, d) => a + d.confidence, 0) / decisions.length || 0}
Action Items: ${workspace.actionItems.length}
Session Duration: ${Math.round((Date.now() - workspace.sessionStartTime) / 60000)} minutes
Estimated Cost: $${workspace.estimatedCost.toFixed(3)}`;
      },
      
      '/export': async () => {
        const format = args[0] || 'pdf';
        const filename = await exportDocument(workspace, format);
        stream.send('system', { message: `📄 Exported to: ${filename}` });
        return `Document exported as ${format}: ${filename}`;
      },
      
      '/schedule': async () => {
        const time = args[0];
        const topic = args.slice(1).join(' ');
        
        scheduledDiscussions.set(workspace.id, {
          time,
          topic,
          workspace: workspace.id
        });
        
        stream.send('system', { message: `⏰ Scheduled: ${time} discussions on ${topic}` });
        return `I'll run discussions on "${topic}" ${time}. You'll receive summaries via email.`;
      },
      
      '/voice': async () => {
        const enable = args[0] !== 'off';
        workspace.voiceEnabled = enable;
        stream.send('system', { message: enable ? '🔊 Voice enabled' : '🔇 Voice disabled' });
        return enable ? 'Voice mode enabled. AI responses will be spoken.' : 'Voice mode disabled.';
      },
      
      // All existing business commands remain the same...
      '/brainstorm': async () => {
        const topic = args.join(' ') || 'growth strategies';
        stream.send('system', { message: `💡 Brainstorming session on: ${topic}` });
        return `Rapid ideation on "${topic}". Give 3-5 specific, actionable ideas. Be creative and bold.`;
      },
      
      '/critique': async () => {
        stream.send('system', { message: '🔍 Critical analysis mode activated' });
        return 'Critically analyze the last proposal. What are the weaknesses, risks, and potential failure points?';
      },
      
      '/vote': async () => {
        const topic = args.join(' ') || 'the best approach discussed';
        stream.send('system', { message: `🗳️ Voting on: ${topic}` });
        return `Vote on "${topic}". State your choice clearly and give 2-3 reasons why.`;
      },
      
      '/summarize': async () => {
        stream.send('system', { message: '📋 Generating summary...' });
        return 'Summarize the discussion so far with: 1) Key decisions made, 2) Open questions, 3) Action items, 4) Next steps';
      },
      
      '/financials': async () => {
        stream.send('system', { message: '💰 Financial deep-dive' });
        return 'Focus on financial aspects: revenue model, pricing, costs, unit economics, and projections with specific numbers.';
      },
      
      '/plan': async () => {
        const section = args[0] || 'executive';
        stream.send('system', { message: `📄 Drafting business plan section: ${section}` });
        return `Draft the "${section}" section of the business plan based on our discussion. Be comprehensive and professional.`;
      },
      
      '/metrics': async () => {
        stream.send('system', { message: '📊 Analyzing key metrics' });
        return 'What are the key metrics for this business? Provide specific targets for Month 1, 6, 12, and Year 2.';
      },
      
      '/competitors': async () => {
        stream.send('system', { message: '🎯 Competitive analysis' });
        return 'Analyze the competitive landscape. Who are the main competitors? What are their strengths/weaknesses? How do we differentiate?';
      },
      
      '/pitch': async () => {
        stream.send('system', { message: '🎤 Preparing investor pitch' });
        return 'Create a 60-second elevator pitch for investors. Include the problem, solution, market size, and ask.';
      },
      
      '/analyze': async () => {
        const doc = args.join(' ') || 'uploaded documents';
        stream.send('system', { message: `📄 Analyzing ${doc}` });
        
        // Check if we have PDFs
        const hasPDFs = Array.from(uploadedFiles.values()).some(f => f.type === 'pdf');
        
        return `Analyze the uploaded ${hasPDFs ? 'documents (including PDFs)' : 'documents'} and provide:
1. Key insights and important information
2. Critical concerns or red flags
3. Specific recommendations based on the content
4. How this information affects our business planning
${hasPDFs ? '\nNote: PDF documents have been converted to text for analysis.' : ''}`;
      },
      
      '/pdf': async () => {
        const pdfFiles = Array.from(uploadedFiles.values()).filter(f => f.type === 'pdf');
        if (pdfFiles.length === 0) {
          return 'No PDF files uploaded. Upload a PDF file to analyze its content.';
        }
        stream.send('system', { message: `📑 Analyzing ${pdfFiles.length} PDF file(s)` });
        return `Focus specifically on the uploaded PDF documents:
${pdfFiles.map(f => `- ${f.name}`).join('\n')}

Extract and discuss:
1. Main points and key data from the PDFs
2. How this information impacts our strategy
3. Any legal/compliance considerations mentioned
4. Financial data or projections included`;
      },
      
      '/hipaa': async () => {
        stream.send('system', { message: '🔒 HIPAA compliance review' });
        return 'Review our approach for HIPAA compliance. What security measures, privacy controls, and audit requirements must we implement?';
      },
      
      '/healthcare': async () => {
        stream.send('system', { message: '🏥 Healthcare market analysis' });
        return 'Analyze the healthcare placement market opportunity. What are the pain points, market size, and regulatory considerations?';
      },
      
      '/mvp': async () => {
        stream.send('system', { message: '🎯 MVP feature prioritization' });
        return 'Based on the goals, what features are essential for MVP vs. nice-to-have? Prioritize for immediate value.';
      },
      
      '/autodiscuss': async () => {
        const topic = args.join(' ') || 'our business strategy';
        stream.send('system', { message: `🤖 Starting autonomous discussion on: ${topic}` });
        return {
          prompt: `Let's have an in-depth, self-directed discussion about "${topic}". 

Each participant should:
1. Present your perspective and ask questions to others
2. Challenge assumptions and explore edge cases  
3. Build consensus where possible, note disagreements where not
4. Continue until we reach meaningful conclusions

This is an open-ended discussion - engage naturally as if in a real boardroom. Reference each other by name, interrupt politely with "Actually..." or "But wait...", and feel free to pivot the conversation as insights emerge.

Who wants to start us off?`,
          autoDiscuss: true,
          rounds: AUTO_DISCUSSION_CONFIG.maxRounds,
          seekConsensus: true
        };
      },

      '/roundtable': async () => {
        const topic = args.join(' ') || 'the current situation';
        stream.send('system', { message: `🎯 Starting collaborative roundtable on: ${topic}` });
        return {
          prompt: `Welcome to our executive roundtable discussion on "${topic}".

EVERYONE: Imagine we're sitting around a conference table. This is your company, your decisions, your future. Be authentic, passionate, and engaged.

GROUND RULES:
• Speak naturally - use "I think...", "My concern is...", "What if we..."
• Reference each other by role: "CFO, what do the numbers tell us?"
• Show emotion: excitement, concern, disagreement, breakthrough moments
• Build on each other's ideas: "That's brilliant, and if we also..."
• Ask direct questions: "Marketing, how would customers react to this?"
• Challenge respectfully: "I hear you, but I'm worried about..."

Let's start with whoever feels most passionate about this topic. Who wants to kick us off?`,
          autoDiscuss: true,
          rounds: AUTO_DISCUSSION_CONFIG.maxRounds,
          naturalConversation: true,
          seekConsensus: true
        };
      },
      
      '/simulate': async () => {
        const scenario = args.join(' ') || 'quarterly board meeting';
        stream.send('system', { message: `🎭 Simulating: ${scenario}` });
        return {
          prompt: `We're now simulating a ${scenario}. Each participant should:
- Act as if this is a real ${scenario}
- Reference realistic metrics and timelines
- Show appropriate urgency/concern based on role
- Make it feel authentic with natural interruptions and back-and-forth

Let the meeting begin!`,
          autoDiscuss: true,
          rounds: 8
        };
      },
      
      '/stop': async () => {
        // Set stop flag for this workspace
        if (activeDiscussions.has(workspace.id)) {
          activeDiscussions.get(workspace.id).shouldStop = true;
          stream.send('system', { message: '🛑 Stopping discussion after current round...' });
          return 'Discussion will stop after the current round completes.';
        } else {
          return 'No active discussion to stop.';
        }
      },
      
      '/pause': async () => {
        // Pause the discussion temporarily
        if (activeDiscussions.has(workspace.id)) {
          activeDiscussions.get(workspace.id).isPaused = true;
          stream.send('system', { message: '⏸️ Discussion paused. Type your message to continue.' });
          return 'Discussion paused. Send your message and the AI advisors will respond.';
        } else {
          return 'No active discussion to pause.';
        }
      },
      
      '/meeting': async () => {
        const advisor = args[0] || 'business_strategist';
        const model = args[1] || 'openai';
        
        // Set meeting mode state
        workspace.meetingMode = {
          active: true,
          currentAdvisor: advisor,
          currentModel: model,
          reviewMode: false
        };
        
        stream.send('system', { 
          message: `🤝 Starting focused meeting with ${advisor} using ${model}`,
          meetingMode: workspace.meetingMode
        });
        
        return `Meeting mode activated! You're now in a focused 1-on-1 session with the ${advisor.replace('_', ' ')} using ${model}. 

Commands available:
• /switch [advisor] - Switch to different advisor
• /model [model] - Switch AI model (openai/anthropic/gemini)
• /review - Start review mode with different model
• /end - End meeting mode

Start discussing your business topic - you'll get focused attention without the chaos of multiple voices!`;
      },
      
      '/switch': async () => {
        if (!workspace.meetingMode?.active) {
          return 'Meeting mode not active. Use /meeting to start a focused session.';
        }
        
        const newAdvisor = args[0] || 'business_strategist';
        const oldAdvisor = workspace.meetingMode.currentAdvisor;
        workspace.meetingMode.currentAdvisor = newAdvisor;
        
        stream.send('system', { 
          message: `🔄 Switched from ${oldAdvisor} to ${newAdvisor}`,
          meetingMode: workspace.meetingMode
        });
        
        return `Switched from ${oldAdvisor.replace('_', ' ')} to ${newAdvisor.replace('_', ' ')}. 

${newAdvisor.replace('_', ' ')} is now ready to discuss with their unique perspective. What would you like to explore?`;
      },
      
      '/model': async () => {
        if (!workspace.meetingMode?.active) {
          return 'Meeting mode not active. Use /meeting to start a focused session.';
        }
        
        const newModel = args[0] || 'openai';
        const validModels = ['openai', 'anthropic', 'gemini'];
        
        if (!validModels.includes(newModel)) {
          return `Invalid model. Choose from: ${validModels.join(', ')}`;
        }
        
        const oldModel = workspace.meetingMode.currentModel;
        workspace.meetingMode.currentModel = newModel;
        
        stream.send('system', { 
          message: `🤖 Switched AI model from ${oldModel} to ${newModel}`,
          meetingMode: workspace.meetingMode
        });
        
        return `AI model switched from ${oldModel} to ${newModel}. Same advisor (${workspace.meetingMode.currentAdvisor.replace('_', ' ')}), but now powered by ${newModel}. 

Notice any difference in the response style or insights?`;
      },
      
      '/review': async () => {
        if (!workspace.meetingMode?.active) {
          return 'Meeting mode not active. Use /meeting to start a focused session first.';
        }
        
        const reviewModel = args[0] || (workspace.meetingMode.currentModel === 'openai' ? 'anthropic' : 'openai');
        
        workspace.meetingMode.reviewMode = true;
        workspace.meetingMode.reviewModel = reviewModel;
        
        stream.send('system', { 
          message: `📋 Starting review mode with ${reviewModel}`,
          meetingMode: workspace.meetingMode
        });
        
        return `Review mode activated! Now bringing in a fresh perspective with ${reviewModel} to review your discussion.

The ${reviewModel} model will:
• Analyze the conversation you just had
• Identify key insights and potential gaps
• Suggest alternative approaches
• Provide objective feedback

Your discussion will be reviewed from an outside perspective. What specific aspects would you like reviewed?`;
      },
      
      '/end': async () => {
        if (!workspace.meetingMode?.active) {
          return 'No meeting mode active to end.';
        }
        
        const summary = {
          advisor: workspace.meetingMode.currentAdvisor,
          model: workspace.meetingMode.currentModel,
          duration: Date.now() - (workspace.meetingMode.startTime || Date.now())
        };
        
        workspace.meetingMode = { active: false };
        
        stream.send('system', { 
          message: '🏁 Meeting mode ended. Back to full advisory board.',
          meetingMode: workspace.meetingMode
        });
        
        return `Meeting ended! Session summary:
• Advisor: ${summary.advisor.replace('_', ' ')}
• AI Model: ${summary.model}
• Duration: ${Math.round(summary.duration / 60000)} minutes

You're now back to the full advisory board mode. All AI advisors are available for group discussions.

Use /autodiscuss to start a group discussion or continue with individual conversations.`;
      },

      '/help': async () => {
        stream.send('system', { message: '📚 Available Commands:' });
        return HELP_TEXT;
      }
    };
    
    const handler = commands[command];
    if (handler) {
      return await handler();
    }
    
    return `Unknown command: ${command}`;
  }
}

// Main HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const workspaceId = url.searchParams.get('workspace') || 'default';
  const workspace = getWorkspace(workspaceId);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(generateHTML(workspace));
  } else if (url.pathname === '/api/chat' && req.method === 'POST') {
    if (!checkRateLimit(req, res)) return;
    
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { message, command, args, participants, meetingMode } = JSON.parse(body);
        const stream = new StreamHandler(res, workspace);
        
        // Update participants if provided
        if (participants) {
          participantConfig.clear();
          participants.forEach(p => configureParticipant(p.id, p.provider, p.model, p.role));
        }
        
        // Handle meeting mode logic
        if (workspace.meetingMode?.active) {
          await handleMeetingMode(message, command, args, workspace, stream);
        } else {
          await handleStandardMode(message, command, args, workspace, stream);
        }
        
        stream.close();
      } catch (error) {
        console.error('API Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
  } else if (url.pathname === '/api/upload' && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      const boundary = req.headers['content-type'].split('boundary=')[1];
      const parts = parseMultipart(buffer, boundary);
      
      for (const part of parts) {
        if (part.name === 'file') {
          const fileId = crypto.randomUUID();
          let content = part.data.toString('utf-8');
          let type = 'text';
          
          if (part.filename.endsWith('.pdf') && pdfParse) {
            try {
              const pdfData = await pdfParse(part.data);
              content = pdfData.text;
              type = 'pdf';
            } catch (e) {
              console.error('PDF parsing error:', e);
              content = 'Error parsing PDF.';
            }
          }
          
          uploadedFiles.set(fileId, {
            id: fileId,
            name: part.filename,
            content: content,
            type: type,
            timestamp: Date.now()
          });
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Files uploaded successfully' }));
    });
  } else if (url.pathname.startsWith('/api/data')) {
    // API for fetching workspace data
    const dataType = url.pathname.split('/').pop();
    let data = {};
    
    switch (dataType) {
      case 'metrics':
        data = {
          tokens: workspace.totalTokensUsed,
          cost: workspace.estimatedCost,
          duration: Math.round((Date.now() - workspace.sessionStartTime) / 60000)
        };
        break;
      case 'action-items':
        data = workspace.actionItems;
        break;
      case 'decisions':
        data = workspace.decisions;
        break;
      case 'discussion-flow':
        data = workspace.getDiscussionFlow();
        break;
      case 'business-plan':
        data = workspace.businessPlan;
        break;
      case 'participants':
        data = getParticipants();
        break;
      case 'templates':
        data = TEMPLATES;
        break;
      case 'uploaded-files':
        data = Array.from(uploadedFiles.values()).map(f => ({ id: f.id, name: f.name, type: f.type }));
        break;
      case 'meeting-mode':
        data = workspace.meetingMode || { active: false };
        break;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } else if (url.pathname.startsWith('/exports/')) {
    // Serve exported files
    const filename = path.basename(url.pathname);
    const filepath = path.join(EXPORTS_DIR, filename);
    
    try {
      const file = await fs.readFile(filepath);
      let contentType = 'application/octet-stream';
      if (filename.endsWith('.pdf')) contentType = 'application/pdf';
      if (filename.endsWith('.md')) contentType = 'text/markdown';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(file);
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

async function handleStandardMode(message, command, args, workspace, stream) {
  const userMsg = workspace.addMessage({
    id: crypto.randomUUID(),
    author: 'User',
    text: message,
    timestamp: new Date().toISOString(),
    role: 'user'
  });
  stream.send('message', userMsg);

  let prompt = message;
  if (command) {
    const commandResult = await CommandProcessor.process(command, args, workspace, stream);
    if (typeof commandResult === 'string') {
      prompt = commandResult;
    } else if (commandResult && commandResult.prompt) {
      prompt = commandResult.prompt;
    }
    
    if (commandResult && commandResult.autoDiscuss) {
      await runAutoDiscussion(commandResult, workspace, stream);
      return;
    }
  }

  const participants = getParticipants();
  const context = workspace.getContext();
  
  const discussionContext = {
    recentSpeakers: context.slice(-3).map(m => m.author),
    tone: 'collaborative',
    focus: command || 'general discussion'
  };

  const promises = participants.map(async (p) => {
    try {
      let responseText = '';
      const apiCall = p.provider === 'openai' ? callOpenAIStream :
                      p.provider === 'anthropic' ? callAnthropicStream :
                      callGemini;
      
      responseText = await apiCall(p, context, prompt, stream, workspace, discussionContext);
      
      if (responseText) {
        const aiMsg = workspace.addMessage({
          id: crypto.randomUUID(),
          author: AI_ROLES[p.role].name,
          text: responseText,
          timestamp: new Date().toISOString(),
          role: p.role,
          model: p.model,
          respondsTo: userMsg.id
        });
        stream.send('message', aiMsg);
      }
    } catch (error) {
      console.error(`Error with ${p.provider}:`, error);
      stream.send('error', { participant: p.id, message: error.message });
    }
  });

  await Promise.all(promises);
}

async function handleMeetingMode(message, command, args, workspace, stream) {
  const userMsg = workspace.addMessage({
    id: crypto.randomUUID(),
    author: 'User',
    text: message,
    timestamp: new Date().toISOString(),
    role: 'user'
  });
  stream.send('message', userMsg);

  let prompt = message;
  if (command) {
    const commandResult = await CommandProcessor.process(command, args, workspace, stream);
    if (typeof commandResult === 'string') {
      prompt = commandResult;
    }
    // If meeting mode ended, stop processing
    if (!workspace.meetingMode?.active) {
      return;
    }
  }

  const { currentAdvisor, currentModel, reviewMode, reviewModel } = workspace.meetingMode;
  const context = workspace.getContext();
  
  const participant = {
    id: `${currentModel}-${currentAdvisor}`,
    provider: currentModel,
    model: getModelForProvider(currentModel),
    role: currentAdvisor
  };
  
  const discussionContext = {
    recentSpeakers: ['User', AI_ROLES[currentAdvisor].name],
    tone: 'focused 1-on-1',
    focus: 'meeting topic'
  };

  try {
    let responseText = '';
    const apiCall = participant.provider === 'openai' ? callOpenAIStream :
                    participant.provider === 'anthropic' ? callAnthropicStream :
                    callGemini;
    
    responseText = await apiCall(participant, context, prompt, stream, workspace, discussionContext);
    
    if (responseText) {
      const aiMsg = workspace.addMessage({
        id: crypto.randomUUID(),
        author: AI_ROLES[participant.role].name,
        text: responseText,
        timestamp: new Date().toISOString(),
        role: participant.role,
        model: participant.model,
        respondsTo: userMsg.id
      });
      stream.send('message', aiMsg);
    }
    
    // If in review mode, get feedback from the review model
    if (reviewMode) {
      const reviewParticipant = {
        id: `${reviewModel}-${currentAdvisor}-reviewer`,
        provider: reviewModel,
        model: getModelForProvider(reviewModel),
        role: currentAdvisor // Use same role for context, but different model
      };
      
      const reviewPrompt = `Please review the following conversation and provide feedback. Analyze the user's questions and the advisor's responses. What was done well? What could be improved? Are there any missed opportunities or alternative perspectives?

Conversation:
${context.map(m => `${m.author}: ${m.text}`).join('\n')}
User: ${prompt}
${AI_ROLES[participant.role].name}: ${responseText}`;
      
      const reviewApiCall = reviewParticipant.provider === 'openai' ? callOpenAIStream :
                            reviewParticipant.provider === 'anthropic' ? callAnthropicStream :
                            callGemini;
                            
      const reviewText = await reviewApiCall(reviewParticipant, [], reviewPrompt, stream, workspace, { tone: 'analytical review' });
      
      if (reviewText) {
        const reviewMsg = workspace.addMessage({
          id: crypto.randomUUID(),
          author: `Reviewer (${reviewModel})`,
          text: reviewText,
          timestamp: new Date().toISOString(),
          role: 'system',
          model: reviewParticipant.model
        });
        stream.send('message', reviewMsg);
      }
      
      // Reset review mode after one turn
      workspace.meetingMode.reviewMode = false;
      stream.send('system', { 
        message: 'Review complete. Back to your focused session.',
        meetingMode: workspace.meetingMode
      });
    }
    
  } catch (error) {
    console.error(`Error in meeting mode with ${participant.provider}:`, error);
    stream.send('error', { participant: participant.id, message: error.message });
  }
}

async function runAutoDiscussion(config, workspace, stream) {
  const { prompt, rounds, template, seekConsensus, naturalConversation } = config;
  let currentPrompt = prompt;
  let lastSpeakers = [];
  let silenceCount = 0;
  
  const discussionState = { shouldStop: false, isPaused: false };
  activeDiscussions.set(workspace.id, discussionState);

  const runTemplateRound = async (roundConfig) => {
    const participants = getParticipants().filter(p => 
      roundConfig.focus === 'all' || roundConfig.focus.includes(p.role)
    );
    const commandPrompt = await CommandProcessor.process(roundConfig.command, roundConfig.args.split(' '), workspace, stream);
    await runDiscussionRound(commandPrompt.prompt || commandPrompt, participants, stream, workspace, lastSpeakers);
  };

  if (template) {
    for (const roundConfig of template.rounds) {
      if (discussionState.shouldStop) break;
      await runTemplateRound(roundConfig);
      await new Promise(resolve => setTimeout(resolve, AUTO_DISCUSSION_CONFIG.pauseBetweenSpeakers));
    }
  } else {
    for (let i = 0; i < rounds; i++) {
      if (discussionState.shouldStop) break;
      
      // Handle pause
      while (discussionState.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      stream.send('system', { message: `Round ${i + 1} of ${rounds}` });
      const participants = getParticipants();
      const newInsights = await runDiscussionRound(currentPrompt, participants, stream, workspace, lastSpeakers);
      
      lastSpeakers = participants.map(p => AI_ROLES[p.role].name);
      
      // Update prompt for next round
      const lastMessage = workspace.messages[workspace.messages.length - 1];
      currentPrompt = naturalConversation ? 
        `${AUTO_DISCUSSION_CONFIG.reactionPhrases[i % AUTO_DISCUSSION_CONFIG.reactionPhrases.length]} What's next?` :
        `Based on the last response ("${lastMessage.text.substring(0, 100)}..."), what's the next logical step or question?`;

      // Check for consensus or silence
      if (seekConsensus) {
        const consensus = workspace.calculateConsensus();
        if (consensus.score >= AUTO_DISCUSSION_CONFIG.consensusThreshold) {
          stream.send('system', { message: `Consensus reached with score ${consensus.score.toFixed(1)}/10. Ending discussion.` });
          break;
        }
      }
      
      if (!newInsights) {
        silenceCount++;
        if (silenceCount >= AUTO_DISCUSSION_CONFIG.silenceThreshold) {
          stream.send('system', { message: 'Discussion stalled due to lack of new insights. Ending.' });
          break;
        }
      } else {
        silenceCount = 0;
      }
      
      await new Promise(resolve => setTimeout(resolve, AUTO_DISCUSSION_CONFIG.pauseBetweenSpeakers));
    }
  }
  
  activeDiscussions.delete(workspace.id);
  stream.send('system', { message: 'Autonomous discussion finished.' });
}

async function runDiscussionRound(prompt, participants, stream, workspace, lastSpeakers = []) {
  let hasNewInsights = false;
  let lastMessageId = workspace.messages.length > 0 ? workspace.messages[workspace.messages.length - 1].id : null;

  for (const p of participants) {
    const discussionContext = {
      recentSpeakers: lastSpeakers,
      tone: 'collaborative',
      focus: 'auto-discussion'
    };
    
    try {
      let responseText = '';
      const apiCall = p.provider === 'openai' ? callOpenAIStream :
                      p.provider === 'anthropic' ? callAnthropicStream :
                      callGemini;
      
      const context = workspace.getContext();
      responseText = await apiCall(p, context, prompt, stream, workspace, discussionContext);
      
      if (responseText) {
        hasNewInsights = true;
        const aiMsg = workspace.addMessage({
          id: crypto.randomUUID(),
          author: AI_ROLES[p.role].name,
          text: responseText,
          timestamp: new Date().toISOString(),
          role: p.role,
          model: p.model,
          respondsTo: lastMessageId
        });
        stream.send('message', aiMsg);
        lastMessageId = aiMsg.id;
        
        // Allow user to interject
        if (AUTO_DISCUSSION_CONFIG.allowUserInterjection) {
          // Check for pause flag
          if (activeDiscussions.get(workspace.id)?.isPaused) {
            stream.send('system', { message: 'Discussion paused by user.' });
            return false; // Stop this round
          }
        }
      }
    } catch (error) {
      console.error(`Error with ${p.provider} in auto-discussion:`, error);
      stream.send('error', { participant: p.id, message: error.message });
    }
  }
  return hasNewInsights;
}

// PDF and Markdown Export
async function exportDocument(workspace, format = 'pdf') {
  const { businessPlan, messages, decisions, actionItems } = workspace;
  
  let content = `# Roundtable Business Plan\n\n`;
  
  for (const [section, title] of Object.entries({
    executive: 'Executive Summary',
    market: 'Market Analysis',
    product: 'Product & Service',
    business_model: 'Business Model',
    marketing: 'Marketing & Sales',
    operations: 'Operations',
    financials: 'Financial Projections',
    team: 'Team',
    risks: 'Risks',
    milestones: 'Milestones & Roadmap'
  })) {
    if (businessPlan[section]) {
      content += `## ${title}\n\n${businessPlan[section]}\n\n`;
    }
  }
  
  content += `## Key Decisions\n\n${decisions.map(d => `- ${d.text}`).join('\n')}\n\n`;
  content += `## Action Items\n\n${actionItems.map(a => `- [ ] ${a.text}`).join('\n')}\n\n`;
  content += `## Full Discussion Log\n\n${messages.map(m => `**${m.author}**: ${m.text}`).join('\n\n')}`;
  
  const filename = `roundtable_export_${Date.now()}`;
  
  if (format === 'pdf' && ENABLE_PDF) {
    // PDF generation logic (requires a library like pdfkit or puppeteer)
    // This is a placeholder for actual PDF generation
    const pdfPath = path.join(EXPORTS_DIR, `${filename}.pdf`);
    await fs.writeFile(pdfPath, `PDF version of:\n\n${content}`);
    return `${filename}.pdf`;
  } else {
    // Fallback to Markdown
    const mdPath = path.join(EXPORTS_DIR, `${filename}.md`);
    await fs.writeFile(mdPath, content);
    return `${filename}.md`;
  }
}

// Multipart form data parser
function parseMultipart(buffer, boundary) {
  const parts = [];
  const lines = buffer.toString('binary').split(`--${boundary}`);
  
  for (const line of lines) {
    if (line.trim() === '' || line.trim() === '--') continue;
    
    const [headerPart, bodyPart] = line.split('\r\n\r\n');
    const headers = {};
    const headerLines = headerPart.split('\r\n');
    
    for (const h of headerLines) {
      const [key, value] = h.split(': ');
      if (key && value) headers[key.toLowerCase()] = value;
    }
    
    const contentDisposition = headers['content-disposition'] || '';
    const nameMatch = contentDisposition.match(/name="([^"]+)"/);
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
    
    if (nameMatch) {
      parts.push({
        name: nameMatch[1],
        filename: filenameMatch ? filenameMatch[1] : null,
        headers: headers,
        data: Buffer.from(bodyPart, 'binary')
      });
    }
  }
  
  return parts;
}

function generateHTML(workspace) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Roundtable Pro v4.2</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/htmx.org@1.9.12"></script>
  <script src="https://cdn.jsdelivr.net/npm/showdown/dist/showdown.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/vis-network/standalone/umd/vis-network.min.js"></script>
  <style>
    :root {
      --bg-color: #111827;
      --text-color: #d1d5db;
      --panel-bg: #1f2937;
      --border-color: #374151;
      --accent-color: #3b82f6;
      --input-bg: #374151;
    }
    body { font-family: 'Inter', sans-serif; background-color: var(--bg-color); color: var(--text-color); }
    .message { border-left: 2px solid transparent; }
    .message.user { border-left-color: var(--accent-color); }
    .message.pinned { background-color: #374151; }
    .thinking-indicator {
      display: inline-block;
      width: 6px; height: 6px;
      border-radius: 50%;
      background-color: currentColor;
      animation: thinking 1s infinite ease-in-out;
    }
    @keyframes thinking {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }
    #discussion-flow-graph .vis-network { border: none !important; }
    .tab-button.active { border-bottom-color: var(--accent-color); color: white; }
  </style>
</head>
<body class="flex h-screen text-sm">

  <!-- Left Panel: Controls & Participants -->
  <div class="w-1/4 bg-gray-900 p-4 flex flex-col space-y-4 overflow-y-auto">
    <h1 class="text-xl font-bold text-white">Roundtable Pro</h1>
    
    <!-- Meeting Mode -->
    <div id="meeting-mode-status" class="bg-gray-800 p-3 rounded-lg"></div>

    <!-- Participants -->
    <div class="bg-gray-800 p-3 rounded-lg">
      <h2 class="text-lg font-semibold mb-2 text-white">Advisory Board</h2>
      <div id="participants-list" class="space-y-2"></div>
      <button id="edit-participants-btn" class="mt-2 text-blue-400 hover:text-blue-300 text-xs">Edit Board</button>
    </div>

    <!-- Templates -->
    <div class="bg-gray-800 p-3 rounded-lg">
      <h2 class="text-lg font-semibold mb-2 text-white">Playbooks</h2>
      <div id="templates-list" class="space-y-1"></div>
    </div>

    <!-- Uploaded Files -->
    <div class="bg-gray-800 p-3 rounded-lg">
      <h2 class="text-lg font-semibold mb-2 text-white">Documents</h2>
      <div id="uploaded-files-list" class="space-y-1 text-xs"></div>
      <form id="upload-form" class="mt-2">
        <input type="file" id="file-input" class="hidden" multiple>
        <button type="button" onclick="document.getElementById('file-input').click()" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 rounded text-xs">Upload Files</button>
      </form>
    </div>
  </div>

  <!-- Center Panel: Chat -->
  <div class="flex-1 flex flex-col bg-gray-800">
    <div id="chat-window" class="flex-1 p-4 overflow-y-auto">
      <!-- Messages will be injected here -->
    </div>
    <div id="thinking-bar" class="p-2 text-xs text-gray-400 h-8"></div>
    <div class="p-4 border-t border-gray-700">
      <div class="relative">
        <textarea id="chat-input" class="w-full bg-gray-700 text-white p-2 pr-20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type your message or command..."></textarea>
        <button id="send-btn" class="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-lg">Send</button>
      </div>
    </div>
  </div>

  <!-- Right Panel: Business Plan & Data -->
  <div class="w-1/3 bg-gray-900 p-4 flex flex-col">
    <div class="flex border-b border-gray-700 mb-2">
      <button class="tab-button py-2 px-4 text-gray-400 active" onclick="showTab('plan')">Business Plan</button>
      <button class="tab-button py-2 px-4 text-gray-400" onclick="showTab('data')">Data & Insights</button>
    </div>

    <!-- Business Plan Tab -->
    <div id="plan-tab" class="flex-1 overflow-y-auto space-y-3">
      <h2 class="text-lg font-semibold text-white">Business Plan</h2>
      <div id="business-plan" class="space-y-2 text-xs"></div>
    </div>

    <!-- Data & Insights Tab -->
    <div id="data-tab" class="hidden flex-1 overflow-y-auto space-y-3">
      <!-- Metrics -->
      <div class="bg-gray-800 p-3 rounded-lg">
        <h3 class="font-semibold mb-2 text-white">Session Metrics</h3>
        <div id="metrics-display" class="text-xs grid grid-cols-3 gap-2"></div>
      </div>
      <!-- Action Items -->
      <div class="bg-gray-800 p-3 rounded-lg">
        <h3 class="font-semibold mb-2 text-white">Action Items</h3>
        <div id="action-items-list" class="space-y-1 text-xs"></div>
      </div>
      <!-- Decisions -->
      <div class="bg-gray-800 p-3 rounded-lg">
        <h3 class="font-semibold mb-2 text-white">Key Decisions</h3>
        <div id="decisions-list" class="space-y-1 text-xs"></div>
      </div>
      <!-- Discussion Flow -->
      <div class="bg-gray-800 p-3 rounded-lg">
        <h3 class="font-semibold mb-2 text-white">Discussion Flow</h3>
        <div id="discussion-flow-graph" class="h-48 w-full bg-gray-700 rounded"></div>
      </div>
    </div>
  </div>

  <!-- Modal for editing participants -->
  <div id="participants-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center">
    <div class="bg-gray-800 p-6 rounded-lg w-1/2 max-w-2xl">
      <h2 class="text-xl font-bold mb-4">Edit Advisory Board</h2>
      <div id="modal-participants-list" class="space-y-3 mb-4"></div>
      <button id="add-participant-btn" class="text-blue-400 hover:text-blue-300 mb-4">+ Add Advisor</button>
      <div class="flex justify-end space-x-2">
        <button id="cancel-participants-btn" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">Cancel</button>
        <button id="save-participants-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Save Changes</button>
      </div>
    </div>
  </div>

<script>
  const chatWindow = document.getElementById('chat-window');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const thinkingBar = document.getElementById('thinking-bar');
  const converter = new showdown.Converter();

  let eventSource;
  let thinkingTimers = new Map();

  function connectEventSource() {
    const workspaceId = new URLSearchParams(window.location.search).get('workspace') || 'default';
    eventSource = new EventSource('/api/chat?workspace=' + workspaceId);

    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      renderMessage(data);
      stopThinking(data.author);
    });

    eventSource.addEventListener('chunk', (event) => {
      const data = JSON.parse(event.data);
      appendToMessage(data.participant, data.content, data.role);
    });

    eventSource.addEventListener('system', (event) => {
      const data = JSON.parse(event.data);
      renderSystemMessage(data.message);
      if (data.meetingMode) {
        renderMeetingMode(data.meetingMode);
      }
    });

    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      renderSystemMessage('Error from ' + data.participant + ': ' + data.message, 'error');
      stopThinking(data.participant);
    });

    eventSource.onerror = () => {
      console.log('EventSource failed. Reconnecting...');
      setTimeout(connectEventSource, 1000);
    };
  }

  function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    let command = null;
    let args = [];
    if (message.startsWith('/')) {
      const parts = message.split(' ');
      command = parts[0];
      args = parts.slice(1);
    }

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, command, args })
    });

    chatInput.value = '';
  }

  function renderMessage(msg) {
    const existingMsg = document.getElementById('msg-' + msg.id);
    if (existingMsg) {
      existingMsg.innerHTML = formatMessageContent(msg);
      return;
    }

    const msgDiv = document.createElement('div');
    msgDiv.id = 'msg-' + msg.id;
    msgDiv.className = 'message p-3 rounded-lg mb-3 ' + (msg.role === 'user' ? 'user bg-gray-700' : 'bg-gray-800');
    msgDiv.innerHTML = formatMessageContent(msg);
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function appendToMessage(participantId, content, roleName) {
    let msgDiv = document.querySelector('.message-interim[data-participant="' + participantId + '"]');
    if (!msgDiv) {
      msgDiv = document.createElement('div');
      msgDiv.className = 'message message-interim p-3 rounded-lg mb-3 bg-gray-800';
      msgDiv.dataset.participant = participantId;
      msgDiv.innerHTML = '<div class="font-bold text-purple-400">' + roleName + '</div><div class="content"></div>';
      chatWindow.appendChild(msgDiv);
    }
    
    const contentDiv = msgDiv.querySelector('.content');
    contentDiv.innerHTML += content; // Not ideal, but works for streaming text
    
    startThinking(roleName);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function formatMessageContent(msg) {
    const htmlContent = converter.makeHtml(msg.text);
    return '<div class="font-bold ' + (msg.role === 'user' ? 'text-blue-400' : 'text-purple-400') + '">' + msg.author + '</div>' +
           '<div class="text-sm mt-1">' + htmlContent + '</div>' +
           '<div class="text-xs text-gray-500 mt-2">' + new Date(msg.timestamp).toLocaleTimeString() + '</div>';
  }

  function renderSystemMessage(message, type = 'info') {
    const color = type === 'error' ? 'text-red-400' : 'text-yellow-400';
    const msgDiv = document.createElement('div');
    msgDiv.className = 'text-center text-xs ' + color + ' my-2 py-1 px-3 bg-gray-700 rounded-full mx-auto';
    msgDiv.textContent = message;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function startThinking(participantName) {
    stopThinking(participantName); // Clear existing timer
    let indicator = document.querySelector('#thinking-' + participantName.replace(/\s+/g, '-'));
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.id = 'thinking-' + participantName.replace(/\s+/g, '-');
      indicator.className = 'mr-2';
      indicator.innerHTML = participantName + ' is thinking <span class="thinking-indicator"></span>';
      thinkingBar.appendChild(indicator);
    }
    const timer = setTimeout(() => stopThinking(participantName), 5000); // 5s timeout
    thinkingTimers.set(participantName, timer);
  }

  function stopThinking(participantName) {
    if (thinkingTimers.has(participantName)) {
      clearTimeout(thinkingTimers.get(participantName));
      thinkingTimers.delete(participantName);
    }
    const indicator = document.querySelector('#thinking-' + participantName.replace(/\s+/g, '-'));
    if (indicator) {
      indicator.remove();
    }
  }

  function showTab(tabName) {
    document.getElementById('plan-tab').style.display = tabName === 'plan' ? 'block' : 'none';
    document.getElementById('data-tab').style.display = tabName === 'data' ? 'block' : 'none';
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tabName));
    });
  }

  // Data fetching and rendering
  async function fetchData(endpoint) {
    const res = await fetch('/api/data/' + endpoint);
    return res.json();
  }

  function renderTemplates(templates) {
    const list = document.getElementById('templates-list');
    list.innerHTML = Object.entries(templates).map(([id, t]) => 
      '<div class="text-xs p-2 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer" onclick="runCommand(\'/template ' + id + '\')">' +
      '<div class="font-bold">' + t.name + '</div>' +
      '<div class="text-gray-400">' + t.description + '</div>' +
      '</div>'
    ).join('');
  }

  function renderParticipants(participants) {
    const list = document.getElementById('participants-list');
    list.innerHTML = participants.map(p => {
      const role = AI_ROLES[p.role] || { name: 'Unknown', color: '#ccc' };
      return '<div class="flex items-center text-xs">' +
             '<span class="w-3 h-3 rounded-full mr-2" style="background-color:' + role.color + '"></span>' +
             '<div>' +
             '<div class="font-semibold">' + role.name + '</div>' +
             '<div class="text-gray-400">' + p.provider + ' / ' + p.model + '</div>' +
             '</div>' +
             '</div>';
    }).join('');
  }

  function updateMetrics(metrics) {
    document.getElementById('metrics-display').innerHTML =
      '<div><div class="font-bold text-gray-400">Tokens</div>' + metrics.tokens + '</div>' +
      '<div><div class="font-bold text-gray-400">Cost</div>$' + metrics.cost.toFixed(4) + '</div>' +
      '<div><div class="font-bold text-gray-400">Time</div>' + metrics.duration + ' min</div>';
  }

  function renderActionItems(items) {
    const list = document.getElementById('action-items-list');
    list.innerHTML = items.map(item =>
      '<div class="flex items-start">' +
      '<input type="checkbox" class="mt-1 mr-2">' +
      '<span>' + item.text + ' <span class="text-gray-500">(' + item.source + ')</span></span>' +
      '</div>'
    ).join('');
  }

  function renderDecisions(items) {
    const list = document.getElementById('decisions-list');
    list.innerHTML = items.map(item =>
      '<div>- ' + item.text + ' <span class="text-gray-500">(' + item.author + ')</span></div>'
    ).join('');
  }

  function renderBusinessPlan(plan) {
    const container = document.getElementById('business-plan');
    container.innerHTML = Object.entries(plan).map(([section, content]) => {
      if (!content) return '';
      const title = section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return '<div class="p-2 bg-gray-800 rounded">' +
             '<h4 class="font-bold text-sm text-blue-400">' + title + '</h4>' +
             '<p class="mt-1">' + content.replace(/\n/g, '<br>') + '</p>' +
             '</div>';
    }).join('');
  }

  function renderDiscussionFlow(flow) {
    const container = document.getElementById('discussion-flow-graph');
    const data = {
      nodes: new vis.DataSet(flow.nodes),
      edges: new vis.DataSet(flow.edges),
    };
    const options = {
      layout: { hierarchical: { direction: 'UD', sortMethod: 'directed' } },
      nodes: { shape: 'box', font: { color: 'white', size: 10 }, margin: 5 },
      edges: { arrows: 'to', color: '#4b5563' },
      physics: { enabled: false }
    };
    new vis.Network(container, data, options);
  }
  
  function renderUploadedFiles(files) {
    const list = document.getElementById('uploaded-files-list');
    list.innerHTML = files.map(f => '<div>- ' + f.name + ' (' + f.type + ')</div>').join('');
  }

  function renderMeetingMode(mode) {
    const statusDiv = document.getElementById('meeting-mode-status');
    if (mode.active) {
      const advisorName = AI_ROLES[mode.currentAdvisor]?.name || 'Unknown Advisor';
      statusDiv.innerHTML = '<h3 class="font-semibold text-yellow-400">Meeting Mode Active</h3>' +
                            '<p class="text-xs">Focus: ' + advisorName + '</p>' +
                            '<p class="text-xs">Model: ' + mode.currentModel + '</p>' +
                            (mode.reviewMode ? '<p class="text-xs text-cyan-400">Reviewing with: ' + mode.reviewModel + '</p>' : '') +
                            '<button onclick="runCommand(\'/end\')" class="mt-2 text-red-400 hover:text-red-300 text-xs">End Meeting</button>';
    } else {
      statusDiv.innerHTML = '<p class="text-xs text-gray-400">In full advisory board mode.</p>' +
                            '<button onclick="runCommand(\'/meeting\')" class="mt-2 text-green-400 hover:text-green-300 text-xs">Start 1-on-1 Meeting</button>';
    }
  }

  function runCommand(cmd) {
    chatInput.value = cmd;
    sendMessage();
  }

  // Modal logic
  const modal = document.getElementById('participants-modal');
  const editBtn = document.getElementById('edit-participants-btn');
  const cancelBtn = document.getElementById('cancel-participants-btn');
  const saveBtn = document.getElementById('save-participants-btn');
  const addBtn = document.getElementById('add-participant-btn');
  const modalList = document.getElementById('modal-participants-list');

  let currentParticipants = [];

  const AI_ROLES = ${JSON.stringify(AI_ROLES)};
  const AVAILABLE_MODELS = ${JSON.stringify(AVAILABLE_MODELS)};

  function showThinking(participantId, content) {
    let msgDiv = document.getElementById('thinking-' + participantId);
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'thinking-' + participantId;
        msgDiv.className = 'message p-3 rounded-lg mb-3 bg-gray-800';
        chatWindow.appendChild(msgDiv);
    }
    msgDiv.innerHTML = '<div class="font-bold text-purple-400">' + AI_ROLES[participantId.split('-')[1]].name + ' is thinking...</div>' +
                       '<div class="text-sm mt-1 text-gray-400">' + content + '</div>';
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function openParticipantsModal() {
    fetch('/api/data/participants').then(res => res.json()).then(participants => {
      currentParticipants = participants;
      modalList.innerHTML = '';
      participants.forEach((p, index) => modalList.appendChild(createParticipantRow(p, index)));
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
  }

  function closeParticipantsModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  function createParticipantRow(p, index) {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-4 gap-2 items-center';
    row.dataset.index = index;

    // Role selector
    const roleSelect = document.createElement('select');
    roleSelect.className = 'bg-gray-700 p-1 rounded';
    roleSelect.innerHTML = Object.keys(AI_ROLES).map(roleId => 
      '<option value="' + roleId + '"' + (p.role === roleId ? ' selected' : '') + '>' + AI_ROLES[roleId].name + '</option>'
    ).join('');
    
    // Provider selector
    const providerSelect = document.createElement('select');
    providerSelect.className = 'bg-gray-700 p-1 rounded';
    providerSelect.innerHTML = Object.keys(AVAILABLE_MODELS).map(provider => 
      '<option value="' + provider + '"' + (p.provider === provider ? ' selected' : '') + '>' + provider + '</option>'
    ).join('');

    // Model selector
    const modelSelect = document.createElement('select');
    modelSelect.className = 'bg-gray-700 p-1 rounded';
    
    function updateModels() {
      const selectedProvider = providerSelect.value;
      modelSelect.innerHTML = AVAILABLE_MODELS[selectedProvider].map(m => 
        '<option value="' + m.id + '"' + (p.model === m.id ? ' selected' : '') + '>' + m.name + '</option>'
      ).join('');
    }
    
    providerSelect.onchange = updateModels;
    updateModels();

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'text-red-500 hover:text-red-400';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => {
      currentParticipants.splice(index, 1);
      openParticipantsModal(); // Re-render
    };

    row.append(roleSelect, providerSelect, modelSelect, removeBtn);
    return row;
  }

  function saveParticipants() {
    const newParticipants = [];
    modalList.querySelectorAll('[data-index]').forEach(row => {
      const selects = row.querySelectorAll('select');
      const role = selects[0].value;
      const provider = selects[1].value;
      const model = selects[2].value;
      newParticipants.push({
        id: provider + '-' + role,
        provider,
        model,
        role
      });
    });

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants: newParticipants })
    }).then(() => {
      renderSystemMessage('Advisory board updated.');
      fetchAllData();
      closeParticipantsModal();
    });
  }

  addBtn.onclick = () => {
    currentParticipants.push({ id: 'new', provider: 'openai', model: 'gpt-4o-mini', role: 'strategist' });
    openParticipantsModal(); // Re-render
  };

  editBtn.onclick = openParticipantsModal;
  cancelBtn.onclick = closeParticipantsModal;
  saveBtn.onclick = saveParticipants;

  // File upload logic
  const uploadForm = document.getElementById('upload-form');
  const fileInput = document.getElementById('file-input');

  fileInput.onchange = () => {
    const files = fileInput.files;
    if (files.length === 0) return;

    const formData = new FormData();
    for (const file of files) {
      formData.append('file', file);
    }

    fetch('/api/upload', {
      method: 'POST',
      body: formData
    }).then(res => res.json()).then(data => {
      renderSystemMessage(data.message);
      fetchAllData();
    }).catch(err => {
      renderSystemMessage('Upload failed: ' + err.message, 'error');
    });
  };

  // Initial data load and periodic refresh
  function fetchAllData() {
    fetchData('participants').then(renderParticipants);
    fetchData('templates').then(renderTemplates);
    fetchData('metrics').then(updateMetrics);
    fetchData('action-items').then(renderActionItems);
    fetchData('decisions').then(renderDecisions);
    fetchData('business-plan').then(renderBusinessPlan);
    fetchData('discussion-flow').then(renderDiscussionFlow);
    fetchData('uploaded-files').then(renderUploadedFiles);
    fetchData('meeting-mode').then(renderMeetingMode);
  }

  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  connectEventSource();
  fetchAllData();
  setInterval(fetchAllData, 5000); // Refresh data every 5 seconds
</script>
</body>
</html>
`;
}

const HELP_TEXT = `
🤝 **Meeting Commands:**
/meeting [advisor] [model] - Start focused 1-on-1 session (e.g., /meeting cfo openai)
/switch [advisor] - Switch to a different advisor during a meeting
/model [model] - Switch AI model (openai/anthropic/gemini)
/review [model] - Get a second opinion from another model on the current discussion
/end - End the focused meeting and return to the full board

🎯 **Discussion Commands:**
/discuss [rounds] [topic] - Start a structured discussion for a set number of rounds
/autodiscuss [topic] - Let the AI advisors discuss a topic autonomously
/roundtable [topic] - A more natural, free-flowing collaborative discussion
/simulate [scenario] - Simulate a realistic meeting, like a "quarterly board meeting"
/debate [topic] - Two opposing sides argue a topic
/workshop [section] - Collaborative session to build out a specific plan section
/consensus - Attempt to find points of agreement in the current discussion
/stop - Stop the current autonomous discussion
/pause - Pause an autonomous discussion to provide your own input

📊 **Business Analysis Commands:**
/brainstorm [topic] - Generate a list of ideas
/critique - Critically analyze the last proposal for weaknesses and risks
/financials - Focus the discussion on financial models, projections, and metrics
/metrics - Define and analyze key performance indicators (KPIs)
/competitors - Analyze the competitive landscape
/pitch - Generate an investor elevator pitch
/mvp - Prioritize features for a Minimum Viable Product
/plan [section] - Draft a specific section of the business plan (e.g., /plan market)

📄 **Document & Memory Commands:**
/analyze [document_name] - Analyze a previously uploaded document
/pdf - Focus analysis specifically on uploaded PDF documents
/remember [fact] - Store a key fact or decision in long-term memory
/recall [topic] - Recall information from past sessions
/export [pdf|md] - Export the current business plan and discussion to a file

⚙️ **Utility Commands:**
  /search [query] - Perform a real-time web search for information
/score - Display the current session's progress and consensus score
/help - Show this list of commands
`;

// Initialization
(async () => {
  await initializeDirectories();
  const workspace = getWorkspace('default');
  await workspace.loadMemory();
  
  server.listen(PORT, () => {
    console.log(`✓ Roundtable Pro server running on http://localhost:${PORT}`);
    if (!OPENAI_API_KEY && !ANTHROPIC_API_KEY && !GEMINI_API_KEY) {
      console.warn('⚠️ Warning: No API keys found. AI participants will not function.');
    } else {
      if (!OPENAI_API_KEY) console.log('○ OpenAI provider disabled');
      if (!ANTHROPIC_API_KEY) console.log('○ Anthropic provider disabled');
      if (!GEMINI_API_KEY) console.log('○ Gemini provider disabled');
    }
  });
})();