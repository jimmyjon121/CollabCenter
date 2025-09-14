# Decision OS - Operating System for Strategic Decisions

> **"Citations or it didn't happen"** - Every claim must be grounded in evidence.

## 🎯 Vision

Decision OS is an **operating system for decisions** - a single workspace where multiple expert AIs collaborate with you to transform messy context (docs, PDFs, spreadsheets) into grounded analysis, board-ready plans, and actionable decisions with clear ownership.

## 🚀 What Makes This Different

1. **Multi-Agent Orchestration**: Specialized AI roles (CFO, Legal, Tech, Strategy) that challenge each other and converge on consensus
2. **Citation Required**: Every claim must reference source documents - no hallucinations allowed
3. **Cost Governance**: Hard budget caps, kill switches, and real-time spend tracking
4. **Board-Ready Outputs**: One-click generation of executive summaries, pro formas, and decision packets
5. **Financial Modeling**: Built-in scenario planning with sensitivity analysis
6. **Team Collaboration**: Shared workspaces, comments, and version control (V1)

## 📋 MVP Features (Current)

- ✅ **Multi-agent discussions** with specialized roles
- ✅ **PDF ingestion** with chunking and retrieval  
- ✅ **Citation tracking** - validates all claims against sources
- ✅ **Cost controls** - per-session budgets with kill switches
- ✅ **Board packet generation** - structured outputs with citations
- ✅ **Pro forma builder** - 3-scenario financial models
- ✅ **Template system** - repeatable workflows
- ✅ **Export pipeline** - HTML, Markdown, PDF outputs

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         Decision OS Platform                 │
├─────────────────────────────────────────────┤
│  Orchestration Engine                        │
│  ├── Agent Management                        │
│  ├── Cost Governor ($5 default budget)       │
│  └── Session Manager                         │
├─────────────────────────────────────────────┤
│  Core Services                               │
│  ├── Document Pipeline (PDF, DOCX, CSV)      │
│  ├── Financial Engine (Pro Forma, Scenarios) │
│  └── Output Generator (Board Packets)        │
└─────────────────────────────────────────────┘
```

## 🚦 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (for production)
- Redis (for caching)
- API Keys:
  - OpenAI (`OPENAI_API_KEY`)
  - Anthropic (`ANTHROPIC_API_KEY`) 
  - Google Gemini (`GEMINI_API_KEY`)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/decision-os.git
cd decision-os

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Initialize database
npm run migrate

# Start the server
npm start
```

### Quick Start

```javascript
import { DecisionOS } from 'decision-os';

// Initialize
const os = new DecisionOS({
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY
  }
});

// Create a session with documents
const session = await os.createSession({
  documents: ['./pitch-deck.pdf', './financials.csv'],
  budget: { usd: 5.00 },
  template: 'seed-planning'
});

// Run a discussion
await os.runDiscussion(session.id, 
  'Analyze our Series A readiness based on these documents', {
  rounds: 3,
  requireConsensus: true,
  agents: ['strategist', 'cfo', 'vc']
});

// Generate board packet
const packet = await os.generateBoardPacket(session.id);
console.log('Board packet generated:', packet.sections);

// Export to PDF
await os.export(session.id, 'board-packet.pdf');
```

## 💼 Use Cases

### 1. Series A Planning
```javascript
// Load your materials
const session = await os.createSession({
  documents: ['pitch.pdf', 'metrics.csv', 'cap-table.xlsx'],
  template: 'series-a-prep'
});

// Agents analyze and debate
await os.runDiscussion(session.id, 
  'Are we ready for Series A? What do we need to improve?');

// Get actionable output
const packet = await os.generateBoardPacket(session.id);
// Returns: Executive summary, financial projections, risk analysis, action items
```

### 2. Product-Market Fit Analysis
```javascript
const session = await os.createSession({
  documents: ['user-feedback.pdf', 'churn-data.csv'],
  template: 'product-market-fit'
});

await os.runDiscussion(session.id,
  'Do we have product-market fit? Should we pivot or persevere?');
```

### 3. Financial Scenario Planning
```javascript
const proForma = await os.buildProForma({
  assumptions: {
    startingARR: 500000,
    growthRate: { base: 0.15, bear: 0.10, bull: 0.25 },
    churnRate: 0.05,
    CAC: 5000,
    LTV: 25000
  }
});

// Run sensitivity analysis
const sensitivity = await os.runSensitivity(proForma, {
  variables: ['growthRate', 'CAC'],
  range: [-20, +20] // ±20% 
});
```

## 📊 Cost Management

Every session has strict cost controls:

```javascript
// Set budget limits
const session = await os.createSession({
  budget: {
    usd: 10.00, // Total budget
    perAgent: 2.00, // Max per agent
    perModel: {
      'gpt-4o': 5.00,
      'claude-3-opus': 3.00
    }
  }
});

// Monitor in real-time
os.on('budget:warning', (data) => {
  console.log(`Warning: ${data.utilization}% of budget used`);
});

os.on('budget:killswitch', (data) => {
  console.log('Budget exceeded - session terminated');
});

// Get usage report
const report = os.getUsageReport(session.id);
console.log(`Total cost: $${report.totalCost}`);
console.log(`Tokens used: ${report.totalTokens}`);
```

## 🔒 Security & Compliance

- **Data Protection**: End-to-end encryption for sensitive sessions
- **PII Redaction**: Automatic detection and redaction
- **Audit Trail**: Complete session history and replay capability
- **Access Control**: Role-based permissions (RBAC)
- **Compliance**: SOC2, HIPAA-ready architecture

## 📈 Roadmap

### V1.0 (60-90 days)
- [ ] Agent Studio - Visual workflow builder
- [ ] Team Spaces - Collaboration features
- [ ] Advanced Visualizations - Charts, diagrams
- [ ] Webhook Integrations

### V2.0 (120-180 days)
- [ ] Voice Mode - Real-time transcription
- [ ] Autonomous Research - Bounded web search
- [ ] API/CLI - Programmatic access
- [ ] Enterprise Governance - SAML, audit export

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🚨 Important Notes

1. **API Keys Required**: You need OpenAI/Anthropic/Gemini API keys
2. **Costs**: This tool uses real API calls - monitor your usage
3. **Citations**: The system will reject uncited claims by default
4. **Privacy**: Never commit API keys or sensitive documents

## 💡 Philosophy

Decision OS embodies three core principles:

1. **Evidence-Based**: Every claim must be grounded in provided documents
2. **Cost-Conscious**: Every token is tracked and budgeted
3. **Action-Oriented**: Every session produces clear decisions with owners

## 🆘 Support

- Documentation: [docs.decision-os.com](https://docs.decision-os.com)
- Issues: [GitHub Issues](https://github.com/yourusername/decision-os/issues)
- Discord: [Join our community](https://discord.gg/decision-os)

---

**Built for founders, operators, and investors who need board-grade analysis in hours, not weeks.**

