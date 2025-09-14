# Decision OS - System Architecture

## Core Philosophy
**"Citations or it didn't happen"** - Every claim must be grounded in evidence.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Decision OS Platform                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │   Voice/Live │  │     API      │      │
│  │   (React)    │  │     Mode     │  │   Gateway    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐     │
│  │              Orchestration Engine                   │     │
│  │  • Agent Management  • Cost Control  • Templates    │     │
│  └──────────────────────┬──────────────────────────────┘     │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐     │
│  │                  Core Services                       │     │
│  ├──────────────┬──────────────┬───────────────────────┤     │
│  │  Document    │  Financial   │    Output             │     │
│  │  Pipeline    │   Engine     │   Generator           │     │
│  │              │              │                       │     │
│  │ • PDF Parse  │ • Pro Forma  │ • Board Packets      │     │
│  │ • Chunking   │ • Scenarios  │ • Reports            │     │
│  │ • Citations  │ • Valuation  │ • Visualizations     │     │
│  └──────────────┴──────────────┴───────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐      │
│  │              Data & Storage Layer                   │      │
│  │  • Session Store  • Document Store  • Templates     │      │
│  │  • Audit Log     • Vector DB       • Cache         │      │
│  └────────────────────────────────────────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Orchestration Engine (`/engine`)
- **Agent Orchestrator**: Manages multi-agent workflows
- **Cost Governor**: Token tracking, budget enforcement, kill switches
- **Session Manager**: State persistence, replay, recovery
- **Template Engine**: Workflow templates and configurations

### 2. Document Pipeline (`/documents`)
- **Ingestion**: PDF, DOCX, MD, CSV parsing
- **Chunker**: Semantic chunking with overlap
- **Retriever**: Vector search + keyword fallback
- **Citation Tracker**: Source mapping and validation

### 3. Financial Engine (`/financial`)
- **Pro Forma Builder**: Dynamic financial models
- **Scenario Lab**: Sensitivity analysis
- **Valuation Models**: DCF, multiples, comps
- **Metrics Calculator**: CAC, LTV, burn, runway

### 4. Agent System (`/agents`)
- **Role Definitions**: CFO, Legal, Tech, Strategy, etc.
- **Reasoning Chains**: Multi-step verification
- **Critique Loops**: Cross-agent validation
- **Consensus Engine**: Convergence detection

### 5. Output Generator (`/outputs`)
- **Board Packet Builder**: Structured document assembly
- **Visualization Engine**: Charts, diagrams, roadmaps
- **Export Pipeline**: HTML, MD, PDF, DOCX
- **Citation Formatter**: Inline references, footnotes

### 6. Governance (`/governance`)
- **Audit Logger**: Full session tracking
- **Cost Monitor**: Real-time spend tracking
- **Access Control**: RBAC, team permissions
- **Compliance**: PII redaction, retention policies

## Technology Stack

### Backend
- **Runtime**: Node.js 20+ (ESM modules)
- **Framework**: Fastify (high performance)
- **Database**: PostgreSQL (sessions) + Redis (cache)
- **Vector Store**: Pinecone/Weaviate (embeddings)
- **Queue**: BullMQ (async jobs)

### AI Providers
- **Primary**: OpenAI GPT-4o, Anthropic Claude
- **Embeddings**: OpenAI text-embedding-3
- **Voice**: Whisper (transcription), ElevenLabs (synthesis)

### Frontend
- **Framework**: React 18 + TypeScript
- **State**: Zustand (simple) or Redux Toolkit
- **UI**: Tailwind + Radix UI
- **Canvas**: Konva.js or Fabric.js
- **Charts**: Recharts or D3.js

### Infrastructure
- **Deployment**: Docker + Kubernetes
- **Storage**: S3-compatible (documents)
- **CDN**: CloudFlare (static assets)
- **Monitoring**: OpenTelemetry + Grafana

## Data Models

### Session
```typescript
interface Session {
  id: string;
  workspace_id: string;
  user_id: string;
  status: 'active' | 'completed' | 'failed';
  config: {
    agents: AgentConfig[];
    budget: BudgetConfig;
    template?: string;
  };
  state: {
    messages: Message[];
    documents: Document[];
    decisions: Decision[];
    actions: ActionItem[];
    citations: Citation[];
  };
  metrics: {
    tokens_used: number;
    cost_usd: number;
    duration_ms: number;
  };
  outputs: {
    board_packet?: string;
    pro_forma?: ProForma;
    exports: Export[];
  };
  created_at: Date;
  updated_at: Date;
}
```

### Citation
```typescript
interface Citation {
  id: string;
  claim: string;
  source: {
    document_id: string;
    page?: number;
    chunk_id: string;
    text: string;
    confidence: number;
  };
  agent_id: string;
  timestamp: Date;
}
```

### Financial Model
```typescript
interface ProForma {
  id: string;
  scenarios: {
    base: FinancialScenario;
    bear: FinancialScenario;
    bull: FinancialScenario;
  };
  assumptions: Assumption[];
  sensitivity: SensitivityAnalysis;
  valuation: ValuationOutput;
}
```

## Security & Compliance

### Data Protection
- End-to-end encryption for sensitive sessions
- PII detection and auto-redaction
- Configurable retention policies
- Right to deletion (GDPR)

### Access Control
- JWT-based authentication
- Role-based permissions (RBAC)
- Team workspaces with isolation
- SSO integration (SAML/OAuth)

### Audit & Compliance
- Immutable audit log
- Session replay capability
- Cost attribution by user/team
- Compliance reporting (SOC2, HIPAA)

## Performance Targets

- **Response Time**: < 2s for first token
- **Document Processing**: 100 pages in < 30s
- **Concurrent Sessions**: 1000+ active
- **Citation Accuracy**: > 95%
- **Cost Prediction**: ± 10% accuracy
- **Uptime**: 99.9% SLA

## Extension Points

### V1.0 Features
- Agent Studio (visual workflow builder)
- Team collaboration (comments, mentions)
- Advanced visualizations (Mermaid, PlantUML)
- Webhook integrations

### V2.0 Features
- Voice mode with real-time transcription
- Autonomous research agents
- API/CLI for programmatic access
- Enterprise governance suite

## Development Principles

1. **Modular First**: Every component should be independently testable
2. **Citation Required**: No claims without sources
3. **Cost Aware**: Every token counts and is tracked
4. **Audit Everything**: Full session reproducibility
5. **Fail Gracefully**: Degraded service over downtime
6. **User Trust**: Transparent about confidence and limitations

