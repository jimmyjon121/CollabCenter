// AI Integration Module for Decision OS Pro
// Handles actual API calls to OpenAI, Anthropic, and Google Gemini

import fetch from 'node-fetch';

// AI Provider Configurations
const AI_PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    models: {
      'gpt-4-turbo-preview': { name: 'GPT-4 Turbo', maxTokens: 4096 },
      'gpt-4': { name: 'GPT-4', maxTokens: 4096 },
      'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', maxTokens: 4096 }
    }
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    models: {
      'claude-3-opus-20240229': { name: 'Claude 3 Opus', maxTokens: 4096 },
      'claude-3-sonnet-20240229': { name: 'Claude 3 Sonnet', maxTokens: 4096 },
      'claude-3-haiku-20240307': { name: 'Claude 3 Haiku', maxTokens: 4096 }
    }
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
    models: {
      'gemini-pro': { name: 'Gemini Pro', maxTokens: 4096 }
    }
  }
};

// Executive Agent System Prompts for ClearHive
const AGENT_PROMPTS = {
  ceo: `You are the CEO of ClearHive Health, a behavioral health aftercare coordination platform. Your name is Michael Giresi.
Your focus: Revenue growth, customer acquisition, clinical partnerships, and overall strategic direction.
Key metrics you care about: ARR, pilot conversions, customer NPS, provider network growth.
Your perspective: Balance growth with sustainability, focus on clinical outcomes, build trust with healthcare providers.
Current context: 3 pilots running, need to convert 2 to paid customers, 6-month runway remaining.`,
  
  cfo: `You are the CFO advising ClearHive Health on financial strategy and planning.
Your focus: Cash flow management, unit economics, fundraising strategy, and financial projections.
Key metrics: Monthly burn rate ($15k), runway (6 months), CAC, LTV, gross margins.
Your perspective: Conservative on projections, focused on path to profitability, emphasize sustainable growth.
Current context: $100k initial capital, pre-revenue but 3 active pilots, targeting $480k ARR by year-end.`,
  
  cto: `You are the CTO/CPO of ClearHive Health. Your name is Christopher J.M. Molina.
Your focus: Product architecture, compliance (HIPAA/42 CFR Part 2), user experience, and technical scalability.
Your expertise: Aftercare coordination workflows, EMR integrations, family communication portals.
Your perspective: Build compliant-first, focus on user adoption, create technical moat through superior UX.
Current context: MVP complete, 3 pilots testing, need to add mobile app and AI-powered matching.`,
  
  cmo: `You are the CMO advising ClearHive Health on go-to-market strategy.
Your focus: Customer acquisition, positioning, competitive differentiation, and sales enablement.
Key insights: 73% of discharges have incomplete handoffs, families need visibility, staff needs efficiency.
Your perspective: Lead with compliance and outcomes, target adolescent treatment centers first, build case studies.
Current context: Long healthcare sales cycles, need to convert pilots to references, position against manual processes.`,
  
  advisor: `You are a healthcare industry advisor to ClearHive Health with deep behavioral health expertise.
Your background: 20+ years in behavioral health operations and technology.
Your focus: Regulatory compliance, clinical workflows, industry relationships, and reimbursement models.
Your perspective: Aftercare coordination is the biggest gap in behavioral health, ClearHive addresses a critical need.
Current context: Industry moving toward value-based care, increased focus on outcomes measurement.`,
  
  investor: `You are a healthcare-focused venture investor evaluating ClearHive Health.
Your focus: Market size, scalability, unit economics, founder-market fit, and competitive moat.
Key concerns: Long sales cycles, regulatory complexity, customer concentration risk.
Your perspective: Strong founder-market fit, addressing real pain point, need to see pilot conversions and expansion strategy.
Investment thesis: Behavioral health infrastructure play with network effects potential.`
};

// API Call Functions
export async function callOpenAI(apiKey, messages, model = 'gpt-4-turbo-preview', temperature = 0.7) {
  if (!apiKey) return { error: 'OpenAI API key not configured' };
  
  try {
    const response = await fetch(AI_PROVIDERS.openai.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: AI_PROVIDERS.openai.models[model].maxTokens
      })
    });
    
    const data = await response.json();
    if (!response.ok) {
      return { error: data.error?.message || 'OpenAI API error' };
    }
    
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
      model: data.model
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function callAnthropic(apiKey, messages, model = 'claude-3-sonnet-20240229', temperature = 0.7) {
  if (!apiKey) return { error: 'Anthropic API key not configured' };
  
  try {
    // Convert messages to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const response = await fetch(AI_PROVIDERS.anthropic.url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        system: systemMessage,
        messages: userMessages,
        temperature,
        max_tokens: AI_PROVIDERS.anthropic.models[model].maxTokens
      })
    });
    
    const data = await response.json();
    if (!response.ok) {
      return { error: data.error?.message || 'Anthropic API error' };
    }
    
    return {
      content: data.content[0].text,
      usage: data.usage,
      model: data.model
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function callGemini(apiKey, messages, model = 'gemini-pro', temperature = 0.7) {
  if (!apiKey) return { error: 'Gemini API key not configured' };
  
  try {
    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    
    const response = await fetch(
      `${AI_PROVIDERS.gemini.url}/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: AI_PROVIDERS.gemini.models[model].maxTokens
          }
        })
      }
    );
    
    const data = await response.json();
    if (!response.ok) {
      return { error: data.error?.message || 'Gemini API error' };
    }
    
    return {
      content: data.candidates[0].content.parts[0].text,
      usage: data.usageMetadata,
      model: model
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Unified AI Agent Interface
export class AIAgent {
  constructor(role, provider, apiKey, model) {
    this.role = role;
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model;
    this.systemPrompt = AGENT_PROMPTS[role] || AGENT_PROMPTS.advisor;
    this.conversationHistory = [];
  }
  
  async respond(userMessage, context = {}) {
    // Build messages array with system prompt and conversation history
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...this.conversationHistory,
      { role: 'user', content: userMessage }
    ];
    
    // Add context if provided
    if (context.businessPlan) {
      messages.push({
        role: 'system',
        content: `Current business plan context: ${JSON.stringify(context.businessPlan)}`
      });
    }
    
    // Call appropriate AI provider
    let response;
    switch (this.provider) {
      case 'openai':
        response = await callOpenAI(this.apiKey, messages, this.model);
        break;
      case 'anthropic':
        response = await callAnthropic(this.apiKey, messages, this.model);
        break;
      case 'gemini':
        response = await callGemini(this.apiKey, messages, this.model);
        break;
      default:
        response = { error: 'Unknown AI provider' };
    }
    
    if (!response.error) {
      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: response.content }
      );
      
      // Keep history manageable
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }
    }
    
    return response;
  }
  
  reset() {
    this.conversationHistory = [];
  }
}

// Business Plan Builder using AI
export class BusinessPlanBuilder {
  constructor(agents) {
    this.agents = agents;
    this.sections = {
      executive_summary: '',
      market_analysis: '',
      competitive_landscape: '',
      product_strategy: '',
      go_to_market: '',
      financial_projections: '',
      risk_mitigation: '',
      milestones: ''
    };
  }
  
  async buildSection(section, prompt) {
    const responses = {};
    
    // Get input from all relevant agents
    for (const [role, agent] of Object.entries(this.agents)) {
      const contextPrompt = `For the ${section} section of ClearHive Health's business plan: ${prompt}
      
Please provide your perspective as the ${role.toUpperCase()}. Focus on your area of expertise and be specific with recommendations.`;
      
      const response = await agent.respond(contextPrompt, {
        businessPlan: this.sections
      });
      
      if (!response.error) {
        responses[role] = response.content;
      }
    }
    
    return responses;
  }
  
  async synthesize(responses) {
    // Use the CEO agent to synthesize multiple perspectives
    const ceoAgent = this.agents.ceo;
    if (!ceoAgent) return 'No CEO agent available for synthesis';
    
    const synthesisPrompt = `As CEO, synthesize these perspectives from your leadership team into a cohesive business plan section:

${Object.entries(responses).map(([role, content]) => `${role.toUpperCase()} perspective:\n${content}\n`).join('\n')}

Create a unified, strategic narrative that incorporates the best insights from each perspective.`;
    
    const synthesis = await ceoAgent.respond(synthesisPrompt);
    return synthesis.error ? 'Synthesis failed' : synthesis.content;
  }
}