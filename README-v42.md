# 🚀 Roundtable Pro v4.2 Enhanced - Autonomous AI Discussion Platform

## 🎯 Overview
Roundtable Pro is a sophisticated AI-powered business planning platform that orchestrates multiple AI models (OpenAI, Anthropic, Google Gemini) to simulate a virtual boardroom with specialized expert advisors. The AI participants engage in **natural, autonomous back-and-forth discussions** without requiring constant user prompting.

## ✨ Key Features

### 🤖 Autonomous AI Discussions
- AI models engage in natural conversations, referencing each other by name
- Intelligent discussion continuation based on consensus and new insights
- Auto-injection of thought-provoking questions
- Dynamic round extension for productive discussions

### 📑 PDF Document Processing
- **NEW**: Upload and analyze PDF documents as context for discussions
- Automatic PDF text extraction and parsing
- PDF content integrated into AI advisor discussions
- Special commands for PDF-focused analysis

### 👥 8 Specialized AI Roles
- **Strategic Advisor**: Market positioning and growth strategies
- **Virtual CFO**: Financial analysis and projections
- **VC Partner**: Investment perspective and challenges
- **Technical Advisor**: Technical feasibility and architecture
- **Marketing Director**: Go-to-market and growth strategies
- **COO**: Operations and execution
- **Customer Advocate**: User experience and market fit
- **Legal Counsel**: Compliance and legal considerations

## 🚀 Getting Started

### Installation
```bash
# Clone the repository
git clone https://github.com/jimmyjon121/CollabCenter.git
cd CollabCenter

# Install dependencies
npm install

# Start the server
node roundtable-v42-enhanced.mjs
```

### Configuration Options

#### Option 1: Environment Variables (Recommended)
```bash
OPENAI_API_KEY=sk-... ANTHROPIC_API_KEY=sk-ant-... node roundtable-v42-enhanced.mjs
```

#### Option 2: Hardcode in Source
Edit lines 19-22 in `roundtable-v42-enhanced.mjs`:
```javascript
const OPENAI_API_KEY = 'sk-...'; // Your OpenAI key
const ANTHROPIC_API_KEY = 'sk-ant-...'; // Your Anthropic key
const GEMINI_API_KEY = 'AI...'; // Your Google AI key
```

#### Option 3: Web UI Configuration
1. Open http://localhost:3000
2. Click "API Keys" button
3. Enter your keys in the secure form
4. Keys are stored in browser session storage

## 💡 Usage Examples

### Autonomous Discussion
```
/autodiscuss healthcare AI startup strategy
```
AI advisors will engage in open-ended discussion, questioning each other and building consensus naturally.

### PDF Analysis
1. Drag & drop a PDF into the upload area
2. Use commands:
   - `/analyze` - Analyze all uploaded documents
   - `/pdf` - Focus specifically on PDF content
   - Or just chat normally - PDFs provide context automatically

### Simulate Real Meetings
```
/simulate Series A board meeting
```
Creates realistic meeting dynamics with appropriate urgency.

### Business Templates
```
/template series-a-prep
```
Runs structured multi-round discussions for specific scenarios.

## 📋 Available Commands

### Discussion Commands
- `/discuss [rounds] [topic]` - Structured discussion
- `/autodiscuss [topic]` - Autonomous open-ended discussion
- `/simulate [scenario]` - Realistic meeting simulation
- `/debate [topic]` - Structured debate format
- `/workshop [area]` - Collaborative problem-solving
- `/consensus` - Seek agreement on discussed points

### Analysis Commands
- `/analyze` - Analyze uploaded documents
- `/pdf` - Focus on PDF documents
- `/financials` - Financial deep-dive
- `/metrics` - Key metrics analysis
- `/competitors` - Competitive analysis
- `/score` - Decision scoring

### Business Planning
- `/template [name]` - Run business planning template
- `/plan [section]` - Draft business plan section
- `/pitch` - Create elevator pitch
- `/mvp` - MVP feature prioritization

## 📄 Document Upload

### Supported Formats
- **PDF** (.pdf) - Full text extraction
- Text (.txt)
- Markdown (.md) 
- CSV (.csv)
- JSON (.json)

### Upload Methods
1. Drag & drop files onto the upload area
2. Click "browse" to select files
3. Multiple files supported
4. 10KB limit per document (configurable)

## 🔧 Advanced Features

### Memory System
- Sessions automatically saved
- Previous discussions recalled for context
- Decisions and action items tracked

### Export Options
- PDF (requires puppeteer)
- HTML
- Markdown
- Slides (HTML presentation)

### Rate Limiting & Security
- 20 requests/minute per IP
- Optional Bearer token authentication
- Document content sanitization
- Prompt injection protection

## 🏗️ Architecture

### Technology Stack
- Node.js 18+ (ES Modules)
- HTTP server (no framework dependencies)
- Server-Sent Events for streaming
- pdf-parse for PDF processing

### AI Provider Support
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3 family)
- Google (Gemini models)
- Perplexity (web search)

## 📊 Business Templates

1. **Series A Preparation** - Comprehensive fundraising prep
2. **Product-Market Fit Analysis** - Evaluate and improve PMF
3. **Go-to-Market Strategy** - GTM planning
4. **HIPAA Compliance Review** - Healthcare compliance
5. **Competitive Analysis** - Competitive landscape review
6. **Pivot Analysis** - Should we pivot decision framework

## 🛠️ Troubleshooting

### PDF Upload Issues
- Ensure pdf-parse is installed: `npm install pdf-parse`
- Check console for "✓ PDF support enabled"
- PDFs must be under 10KB after text extraction

### API Key Issues
- Verify keys are correctly formatted
- Use the "Test Keys" button in API configuration
- Check for rate limits on your API accounts

### Performance
- Limit concurrent AI participants for faster responses
- Use "Budget" preset for cost-effective testing
- Monitor the cost estimate in the UI

## 🔐 Security Notes

- API keys in browser are session-only
- Never commit hardcoded API keys to version control
- Use environment variables in production
- Enable authentication with ROUNDTABLE_TOKEN for public deployments

## 🚀 What's New in v4.2

- ✨ Autonomous AI discussions without constant prompting
- 📑 Full PDF document support with text extraction
- 🔑 Dynamic API key configuration via web UI
- 🤖 Enhanced dialogue with natural back-and-forth
- 📊 Intelligent discussion management with auto-stop
- 🎭 Realistic meeting simulations

---

**Note**: This is an experimental AI tool. Always review AI-generated content for accuracy and appropriateness before using in business contexts.
