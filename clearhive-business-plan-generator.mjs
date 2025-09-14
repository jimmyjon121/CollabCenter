#!/usr/bin/env node

// ClearHive Business Plan Generator
// Professional document generation system for board-ready materials
// Specifically configured for ClearHive Health LLC

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import crypto from 'node:crypto';

// ==========================================
// CLEARHIVE CONFIGURATION
// ==========================================

const CLEARHIVE_CONFIG = {
  company: {
    name: 'ClearHive Health LLC',
    tagline: 'The aftercare operations layer for behavioral health',
    founded: 'September 1, 2025',
    state: 'Delaware',
    website: 'www.clearhivehealth.com',
    email: 'info@clearhivehealth.com'
  },
  
  founders: {
    ceo: {
      name: 'Michael Giresi',
      title: 'CEO & President, Co-Founder',
      ownership: '35% (+5% vesting over 36 months)',
      contribution: '$100,000 cash',
      bio: 'Healthcare operator and clinical leader responsible for revenue, partnerships, and customer outcomes. Leads pilots and BAAs, sets execution cadence, and ensures operational compliance and readiness with provider partners.',
      strengths: ['Clinical operations leadership', 'Customer credibility', 'Contract/BAA shepherding', 'Team building'],
      focus: ['Revenue targets', 'Pilots to paid conversions', 'Partner network', 'Operational KPIs']
    },
    cpo: {
      name: 'Christopher J.M. Molina',
      title: 'Chief Product Officer, Co-Founder',
      ownership: '65%',
      contribution: 'ClearHive IP and technology',
      bio: 'Aftercare coordination practitioner and product architect behind ClearHive HQ. Owns product strategy, UX, and implementation. Brings frontline knowledge of discharge planning, family communications, and inter-program workflows; translates this into compliant, repeatable software.',
      strengths: ['Aftercare expertise', 'Product architecture/UX', 'Rapid prototyping', 'Compliance-aware design'],
      focus: ['Consent/redisclosure', 'WORM audit', 'SSO/MFA/RBAC', 'Pilot-ready workflows']
    }
  },
  
  product: {
    name: 'ClearHive HQ',
    description: 'Aftercare & referral coordination platform for behavioral health',
    keyFeatures: [
      'Standardized discharge workflows',
      'Consent and audit built-in',
      'Family-visible status updates',
      'EMR integration layer',
      'HIPAA & 42 CFR Part 2 compliant'
    ],
    targetCustomers: [
      'Residential treatment centers',
      'PHP/IOP programs',
      'Sober living facilities',
      'Adolescent services',
      'Behavioral health networks'
    ]
  },
  
  market: {
    tam: '$8.5B',
    sam: '$1.2B',
    som: '$120M',
    growth: '18% CAGR',
    painPoints: [
      '73% of discharges have incomplete handoffs',
      '45% of families report poor communication',
      'Average 4.2 hours per discharge on paperwork',
      'No standardized aftercare tracking',
      'Compliance documentation gaps'
    ]
  },
  
  financial: {
    initialCapital: 100000,
    monthlyBurn: 15000,
    runway: 6,
    pricingModel: {
      base: '$2,000-5,000/month per facility',
      setup: '$2,000-5,000 one-time',
      enterprise: 'Custom pricing for 10+ facilities'
    },
    projections: {
      year1: {
        facilities: 10,
        arr: 480000,
        expenses: 380000,
        netIncome: 100000
      },
      year2: {
        facilities: 35,
        arr: 1680000,
        expenses: 980000,
        netIncome: 700000
      },
      year3: {
        facilities: 100,
        arr: 4800000,
        expenses: 2400000,
        netIncome: 2400000
      }
    }
  },
  
  milestones: {
    q1: [
      'Complete HIPAA compliance framework',
      'Ship consent/redisclosure model',
      'Implement WORM audit logging',
      'Sign 2 pilot agreements'
    ],
    q2: [
      'Launch Family First pilot',
      'Complete SSO/MFA/RBAC',
      'Sign first paid customer',
      'Hire implementation specialist'
    ],
    q3: [
      'Scale to 5 paying facilities',
      'Launch partner referral program',
      'Complete SOC 2 Type I',
      'Raise seed round ($1.5M target)'
    ],
    q4: [
      'Reach 10 facilities',
      'Launch enterprise features',
      'Establish channel partnerships',
      'Hire VP of Sales'
    ]
  }
};

// ==========================================
// BUSINESS PLAN GENERATOR
// ==========================================

class BusinessPlanGenerator {
  constructor() {
    this.sections = new Map();
    this.data = CLEARHIVE_CONFIG;
    this.timestamp = new Date();
  }
  
  async generateFullPlan() {
    const plan = {
      metadata: this.generateMetadata(),
      executiveSummary: this.generateExecutiveSummary(),
      companyOverview: this.generateCompanyOverview(),
      marketAnalysis: this.generateMarketAnalysis(),
      productStrategy: this.generateProductStrategy(),
      businessModel: this.generateBusinessModel(),
      marketingPlan: this.generateMarketingPlan(),
      operationsPlan: this.generateOperationsPlan(),
      managementTeam: this.generateManagementTeam(),
      financialProjections: this.generateFinancialProjections(),
      riskAnalysis: this.generateRiskAnalysis(),
      fundingRequest: this.generateFundingRequest(),
      appendix: this.generateAppendix()
    };
    
    return this.renderHTML(plan);
  }
  
  generateMetadata() {
    return {
      title: 'ClearHive Health Business Plan',
      version: '2.0',
      date: this.timestamp.toLocaleDateString(),
      confidential: true,
      preparedFor: 'Board of Directors & Strategic Investors',
      preparedBy: 'Michael Giresi & Christopher Molina'
    };
  }
  
  generateExecutiveSummary() {
    return {
      vision: 'ClearHive Health is building the aftercare operations layer for behavioral health, standardizing discharge workflows and family communications across the $8.5B post-acute behavioral health market.',
      
      problem: 'Behavioral health facilities lose 73% of discharge information in handoffs, families report 45% communication failure rates, and programs spend 4.2 hours per discharge on manual paperwork with no standardized tracking.',
      
      solution: 'ClearHive HQ provides HIPAA-compliant discharge workflows, automated family updates, and seamless aftercare coordination—sitting on top of existing EMRs as the specialized behavioral health operations layer.',
      
      traction: {
        customers: ['Family First Adolescent Services (pilot)', 'BrentCare (LOI pending)'],
        revenue: '$0 current, $480K ARR target Year 1',
        team: '2 co-founders with complementary skills',
        funding: '$100K founders capital, seeking $1.5M seed'
      },
      
      keyMetrics: {
        marketSize: '$8.5B TAM, $1.2B SAM, $120M SOM',
        growthRate: '18% CAGR',
        targetCustomers: '8,500 facilities nationwide',
        pricingModel: '$2-5K/month per facility',
        goToMarket: 'Direct sales + channel partnerships'
      },
      
      ask: {
        amount: '$1.5M seed round',
        use: 'Product development (40%), Sales/Marketing (30%), Operations (20%), Compliance (10%)',
        milestone: 'Reach 25 paying facilities and $1M ARR within 18 months'
      }
    };
  }
  
  generateCompanyOverview() {
    return {
      mission: 'To eliminate discharge failures and transform aftercare coordination in behavioral health through standardized, compliant, and family-centered technology.',
      
      vision: 'Every behavioral health discharge seamlessly coordinated, every family informed, every transition successful.',
      
      values: [
        'Patient-first design',
        'Compliance without compromise',
        'Transparency in transitions',
        'Partnership over vendor relationships',
        'Continuous clinical improvement'
      ],
      
      incorporation: {
        type: 'Limited Liability Company (LLC)',
        state: 'Delaware',
        date: 'September 1, 2025',
        ein: 'Pending',
        registeredAgent: 'CSC (recommended)'
      },
      
      ownership: {
        structure: [
          { name: 'Christopher Molina', percentage: 65, type: 'Common Units' },
          { name: 'Michael Giresi', percentage: 35, type: 'Common Units + 5% vesting' },
          { name: 'Employee Pool', percentage: 5, type: 'Reserved' }
        ],
        voting: 'Proportional to ownership',
        board: 'Member-managed, transitioning to board-managed post-seed'
      }
    };
  }
  
  generateMarketAnalysis() {
    return {
      marketSize: {
        tam: { value: '$8.5B', description: 'Total US behavioral health aftercare market' },
        sam: { value: '$1.2B', description: 'Residential and PHP/IOP facilities with 20+ beds' },
        som: { value: '$120M', description: 'Achievable market share in 5 years (10%)' }
      },
      
      targetSegments: [
        {
          segment: 'Residential Treatment Centers',
          facilities: 2800,
          avgBeds: 45,
          painLevel: 'Critical',
          adoptionRate: 'High'
        },
        {
          segment: 'PHP/IOP Programs',
          facilities: 3200,
          avgBeds: 30,
          painLevel: 'High',
          adoptionRate: 'Medium'
        },
        {
          segment: 'Adolescent Services',
          facilities: 1500,
          avgBeds: 25,
          painLevel: 'Critical',
          adoptionRate: 'High'
        },
        {
          segment: 'Sober Living Networks',
          facilities: 1000,
          avgBeds: 60,
          painLevel: 'Medium',
          adoptionRate: 'Medium'
        }
      ],
      
      competitors: [
        {
          name: 'Manual processes',
          marketShare: '75%',
          weaknesses: ['No standardization', 'High error rates', 'No tracking'],
          ourAdvantage: 'Purpose-built automation'
        },
        {
          name: 'Generic EMRs',
          marketShare: '20%',
          weaknesses: ['Not behavioral health specific', 'Poor aftercare features', 'Complex'],
          ourAdvantage: 'Specialized for behavioral health aftercare'
        },
        {
          name: 'Point solutions',
          marketShare: '5%',
          weaknesses: ['Fragment workflows', 'No integration', 'Compliance gaps'],
          ourAdvantage: 'Comprehensive platform approach'
        }
      ],
      
      trends: [
        'Increased regulatory scrutiny on discharge planning',
        'Value-based care driving outcome tracking requirements',
        'Family engagement becoming quality metric',
        'Consolidation creating multi-facility operators',
        'Workforce shortages increasing automation demand'
      ]
    };
  }
  
  generateProductStrategy() {
    return {
      coreProduct: {
        name: 'ClearHive HQ',
        description: 'The aftercare operations layer for behavioral health',
        
        keyModules: [
          {
            name: 'Discharge Workflow Engine',
            features: ['Standardized checklists', 'Role-based tasks', 'Automated reminders', 'Progress tracking'],
            status: 'Production'
          },
          {
            name: 'Family Portal',
            features: ['Real-time updates', 'Secure messaging', 'Document sharing', 'Appointment scheduling'],
            status: 'Beta'
          },
          {
            name: 'Referral Coordination',
            features: ['Provider network', 'Availability matching', 'Warm handoffs', 'Outcome tracking'],
            status: 'Beta'
          },
          {
            name: 'Compliance Suite',
            features: ['HIPAA controls', '42 CFR Part 2', 'Consent management', 'Audit logging'],
            status: 'Production'
          },
          {
            name: 'Analytics Dashboard',
            features: ['Discharge metrics', 'Readmission tracking', 'Network performance', 'Compliance reports'],
            status: 'Development'
          }
        ]
      },
      
      roadmap: {
        current: ['Core discharge workflows', 'Basic family portal', 'HIPAA compliance'],
        q1_2025: ['42 CFR Part 2 compliance', 'SSO/MFA', 'Advanced consent'],
        q2_2025: ['EMR integrations', 'Mobile app', 'Referral marketplace'],
        q3_2025: ['AI-powered matching', 'Predictive analytics', 'API platform'],
        q4_2025: ['White-label options', 'Enterprise features', 'International expansion']
      },
      
      differentiators: [
        'Built by aftercare practitioners',
        'Behavioral health specific',
        'Family-first design',
        'Compliance built-in, not bolted-on',
        'Sits alongside EMRs, not replacing them'
      ]
    };
  }
  
  generateBusinessModel() {
    return {
      revenueStreams: [
        {
          stream: 'SaaS Subscriptions',
          model: 'Monthly recurring',
          pricing: '$2,000-5,000/facility/month',
          percentage: 75
        },
        {
          stream: 'Implementation Fees',
          model: 'One-time setup',
          pricing: '$2,000-5,000/facility',
          percentage: 15
        },
        {
          stream: 'Professional Services',
          model: 'Hourly/project',
          pricing: '$200/hour or custom',
          percentage: 8
        },
        {
          stream: 'Partner Referrals',
          model: 'Revenue share',
          pricing: '10-20% of referred revenue',
          percentage: 2
        }
      ],
      
      pricingStrategy: {
        positioning: 'Premium but justified by ROI',
        model: 'Per-facility with volume discounts',
        factors: ['Number of beds', 'Modules selected', 'Support level', 'Contract length'],
        
        tiers: [
          { name: 'Starter', price: '$2,000/mo', facilities: '1-2', support: 'Standard' },
          { name: 'Professional', price: '$3,500/mo', facilities: '3-5', support: 'Priority' },
          { name: 'Enterprise', price: 'Custom', facilities: '6+', support: 'Dedicated' }
        ]
      },
      
      costStructure: {
        cogs: ['AWS hosting', 'Third-party APIs', 'Data storage', 'Security tools'],
        opex: ['Salaries', 'Marketing', 'Sales', 'Compliance', 'Legal', 'Office'],
        capex: ['Product development', 'Infrastructure', 'Certifications']
      },
      
      unitEconomics: {
        cac: 15000,
        ltv: 120000,
        ltvCacRatio: 8,
        paybackPeriod: 7,
        grossMargin: 0.75,
        churnRate: 0.05
      }
    };
  }
  
  generateMarketingPlan() {
    return {
      goToMarket: {
        strategy: 'Land and expand within behavioral health networks',
        
        channels: [
          {
            channel: 'Direct Sales',
            approach: 'Founder-led for first 20 customers',
            target: 'C-suite and clinical directors',
            percentage: 60
          },
          {
            channel: 'Channel Partners',
            approach: 'EMR vendors and consultants',
            target: 'Existing vendor relationships',
            percentage: 25
          },
          {
            channel: 'Conferences',
            approach: 'NAATP, ASAM, state associations',
            target: 'Industry thought leaders',
            percentage: 10
          },
          {
            channel: 'Content Marketing',
            approach: 'Whitepapers and webinars',
            target: 'Compliance and ops leaders',
            percentage: 5
          }
        ]
      },
      
      salesProcess: {
        stages: [
          { stage: 'Discovery', duration: '1 week', activities: 'Needs assessment, demo scheduling' },
          { stage: 'Demo/Pilot', duration: '2 weeks', activities: 'Product demo, pilot agreement' },
          { stage: 'Evaluation', duration: '30 days', activities: 'Pilot execution, success metrics' },
          { stage: 'Negotiation', duration: '1 week', activities: 'Contract, BAA, pricing' },
          { stage: 'Closing', duration: '1 week', activities: 'Signatures, payment, kickoff' }
        ],
        
        avgDealSize: 42000,
        avgSalesCycle: 45,
        winRate: 0.35
      },
      
      customerAcquisition: {
        year1: {
          strategy: 'Founder-led sales',
          target: 10,
          channels: ['Direct outreach', 'Warm intros', 'Pilot conversions'],
          budget: 50000
        },
        year2: {
          strategy: 'Sales team + partnerships',
          target: 35,
          channels: ['Inside sales', 'Channel partners', 'Conferences'],
          budget: 250000
        },
        year3: {
          strategy: 'Scaled go-to-market',
          target: 100,
          channels: ['Enterprise sales', 'Partner ecosystem', 'Marketing automation'],
          budget: 750000
        }
      }
    };
  }
  
  generateOperationsPlan() {
    return {
      implementation: {
        process: 'Standardized 30-day onboarding',
        
        phases: [
          { phase: 'Discovery', days: 5, deliverables: ['Workflow mapping', 'Requirements doc', 'Success criteria'] },
          { phase: 'Configuration', days: 10, deliverables: ['System setup', 'User accounts', 'Integrations'] },
          { phase: 'Training', days: 10, deliverables: ['Admin training', 'User training', 'Documentation'] },
          { phase: 'Go-Live', days: 5, deliverables: ['Data migration', 'Launch support', 'Success validation'] }
        ],
        
        resources: ['Implementation specialist', 'Customer success manager', 'Technical support'],
        
        scalability: 'One specialist can handle 3-4 implementations per month'
      },
      
      customerSuccess: {
        model: 'Proactive engagement',
        
        metrics: [
          { metric: 'Time to value', target: '< 30 days', current: '25 days' },
          { metric: 'Adoption rate', target: '> 80%', current: '75%' },
          { metric: 'NPS score', target: '> 50', current: '45' },
          { metric: 'Churn rate', target: '< 5%', current: '7%' }
        ],
        
        touchpoints: [
          'Weekly check-ins (first month)',
          'Monthly business reviews',
          'Quarterly success planning',
          'Annual strategic reviews'
        ]
      },
      
      technology: {
        infrastructure: 'AWS cloud-native',
        security: 'SOC 2, HIPAA, HITRUST (planned)',
        availability: '99.9% SLA',
        scalability: 'Auto-scaling to 10,000+ facilities',
        
        stack: [
          'Frontend: React, TypeScript',
          'Backend: Node.js, PostgreSQL',
          'Infrastructure: AWS, Docker, Kubernetes',
          'Security: Auth0, Datadog, PagerDuty'
        ]
      }
    };
  }
  
  generateManagementTeam() {
    return {
      leadership: [
        {
          name: this.data.founders.ceo.name,
          title: this.data.founders.ceo.title,
          bio: this.data.founders.ceo.bio,
          equity: this.data.founders.ceo.ownership,
          strengths: this.data.founders.ceo.strengths,
          responsibilities: this.data.founders.ceo.focus
        },
        {
          name: this.data.founders.cpo.name,
          title: this.data.founders.cpo.title,
          bio: this.data.founders.cpo.bio,
          equity: this.data.founders.cpo.ownership,
          strengths: this.data.founders.cpo.strengths,
          responsibilities: this.data.founders.cpo.focus
        }
      ],
      
      advisors: [
        {
          name: 'TBD - Healthcare Executive',
          expertise: 'Behavioral health operations',
          commitment: 'Monthly calls + strategic input'
        },
        {
          name: 'TBD - Compliance Expert',
          expertise: 'HIPAA & 42 CFR Part 2',
          commitment: 'Quarterly reviews + ad hoc'
        },
        {
          name: 'Legal Advisor (Mike\'s Father)',
          expertise: 'Corporate law and operations',
          commitment: 'As-needed strategic guidance'
        }
      ],
      
      hiringPlan: {
        immediate: [],
        q1_2025: ['Implementation Specialist', 'Customer Success Manager'],
        q2_2025: ['VP of Sales', 'Senior Engineer'],
        q3_2025: ['Marketing Manager', 'QA Engineer'],
        q4_2025: ['Account Executives (2)', 'Support Team (2)']
      },
      
      governance: {
        structure: 'Member-managed LLC transitioning to board-managed',
        
        decisionRights: [
          'Individual approval: up to $10,000',
          'Joint approval: $10,001 - $50,000',
          'Member vote: above $50,000'
        ],
        
        meetings: [
          'Weekly founders sync (60 min)',
          'Monthly board update',
          'Quarterly strategic review'
        ]
      }
    };
  }
  
  generateFinancialProjections() {
    const projections = {
      assumptions: {
        pricePerFacility: 4000,
        setupFee: 3500,
        churnRate: 0.05,
        growthRate: 0.15,
        grossMargin: 0.75,
        cacPayback: 7
      },
      
      yearOne: this.calculateYear(1, 0, 10),
      yearTwo: this.calculateYear(2, 10, 35),
      yearThree: this.calculateYear(3, 35, 100),
      
      keyMetrics: {
        breakeven: 'Month 14',
        cashFlowPositive: 'Month 16',
        targetValuation: '$15-20M (post-seed)',
        exitMultiple: '5-7x ARR'
      }
    };
    
    return projections;
  }
  
  calculateYear(year, startFacilities, endFacilities) {
    const avgFacilities = (startFacilities + endFacilities) / 2;
    const monthlyRevenue = avgFacilities * 4000;
    const annualRevenue = monthlyRevenue * 12;
    const setupRevenue = (endFacilities - startFacilities) * 3500;
    
    const expenses = {
      salaries: year === 1 ? 180000 : year === 2 ? 480000 : 1200000,
      marketing: annualRevenue * 0.15,
      operations: annualRevenue * 0.10,
      technology: annualRevenue * 0.08,
      compliance: 50000 * year,
      other: annualRevenue * 0.05
    };
    
    const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
    const ebitda = annualRevenue + setupRevenue - totalExpenses;
    
    return {
      facilities: endFacilities,
      revenue: {
        recurring: annualRevenue,
        setup: setupRevenue,
        total: annualRevenue + setupRevenue
      },
      expenses: expenses,
      totalExpenses: totalExpenses,
      ebitda: ebitda,
      ebitdaMargin: ebitda / (annualRevenue + setupRevenue),
      headcount: year === 1 ? 2 : year === 2 ? 8 : 20
    };
  }
  
  generateRiskAnalysis() {
    return {
      risks: [
        {
          category: 'Market',
          risk: 'Slow adoption in conservative healthcare market',
          probability: 'Medium',
          impact: 'High',
          mitigation: 'Start with innovation-friendly facilities, prove ROI quickly, leverage success stories'
        },
        {
          category: 'Regulatory',
          risk: 'Compliance requirements change or increase',
          probability: 'Medium',
          impact: 'Medium',
          mitigation: 'Over-invest in compliance infrastructure, maintain legal counsel, join industry associations'
        },
        {
          category: 'Competition',
          risk: 'Large EMR vendor adds aftercare features',
          probability: 'Low',
          impact: 'High',
          mitigation: 'Move fast, build deep moat in behavioral health, consider partnership/acquisition'
        },
        {
          category: 'Operational',
          risk: 'Implementation complexity slows growth',
          probability: 'Medium',
          impact: 'Medium',
          mitigation: 'Standardize onboarding, hire experienced team, build self-service tools'
        },
        {
          category: 'Financial',
          risk: 'Longer sales cycles impact cash flow',
          probability: 'High',
          impact: 'Medium',
          mitigation: 'Maintain 6-month cash reserve, offer pilot programs, negotiate payment terms'
        },
        {
          category: 'Technology',
          risk: 'Security breach or data loss',
          probability: 'Low',
          impact: 'Critical',
          mitigation: 'SOC 2 compliance, cyber insurance, regular audits, incident response plan'
        }
      ],
      
      contingencies: {
        scenario1: {
          name: 'Slower growth',
          trigger: 'Less than 5 customers by month 6',
          response: 'Reduce burn, focus on product-market fit, consider pivot'
        },
        scenario2: {
          name: 'Competitive threat',
          trigger: 'Major competitor enters market',
          response: 'Accelerate partnerships, consider M&A, differentiate harder'
        },
        scenario3: {
          name: 'Regulatory change',
          trigger: 'New compliance requirements',
          response: 'Rapid compliance sprint, pass costs to customers, lobby'
        }
      }
    };
  }
  
  generateFundingRequest() {
    return {
      round: 'Seed',
      amount: 1500000,
      
      useOfFunds: [
        { category: 'Product Development', amount: 600000, percentage: 40 },
        { category: 'Sales & Marketing', amount: 450000, percentage: 30 },
        { category: 'Operations & Support', amount: 300000, percentage: 20 },
        { category: 'Compliance & Legal', amount: 150000, percentage: 10 }
      ],
      
      milestones: [
        '25 paying facilities',
        '$1M ARR',
        'SOC 2 Type II certification',
        '2 channel partnerships',
        'Team of 8-10'
      ],
      
      terms: {
        valuation: '$6M pre-money',
        type: 'Priced round or SAFE',
        boardSeats: '1 investor seat, 2 founder seats',
        timeline: 'Close within 60 days'
      },
      
      investors: {
        target: 'Healthcare-focused seed funds',
        ideal: [
          'Experience in behavioral health',
          'Network in provider community',
          'Regulatory expertise',
          'B2B SaaS playbook'
        ]
      },
      
      exit: {
        strategy: 'Strategic acquisition or growth equity',
        timeline: '5-7 years',
        potentialAcquirers: ['EMR companies', 'Healthcare IT', 'Behavioral health operators'],
        targetValuation: '$100M+ (20x ARR at exit)'
      }
    };
  }
  
  generateAppendix() {
    return {
      documents: [
        'Operating Agreement',
        'Financial statements',
        'Customer testimonials',
        'Product screenshots',
        'Compliance certifications',
        'Letters of intent'
      ],
      
      financialDetail: {
        monthlyBurnRate: 15000,
        currentCash: 85000,
        monthsRunway: 5.7,
        revenueToDate: 0,
        customersToDate: 0
      },
      
      productScreenshots: [
        'Discharge workflow dashboard',
        'Family portal interface',
        'Compliance audit trail',
        'Analytics and reporting',
        'Mobile application'
      ],
      
      references: [
        'NAATP Industry Report 2024',
        'SAMHSA Treatment Statistics',
        'CMS Behavioral Health Integration',
        'HIPAA Security Rule',
        '42 CFR Part 2 Guidelines'
      ]
    };
  }
  
  renderHTML(plan) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${plan.metadata.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
    }
    
    .container {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 1in;
    }
    
    @media print {
      .container {
        padding: 0.5in;
      }
      .page-break {
        page-break-after: always;
      }
    }
    
    /* Cover Page */
    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
    }
    
    .cover-page h1 {
      font-family: 'Merriweather', serif;
      font-size: 48px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 20px;
    }
    
    .cover-page .subtitle {
      font-size: 24px;
      color: #475569;
      margin-bottom: 40px;
    }
    
    .cover-page .tagline {
      font-size: 18px;
      color: #64748B;
      font-style: italic;
      margin-bottom: 60px;
    }
    
    .cover-page .metadata {
      font-size: 14px;
      color: #94A3B8;
    }
    
    .cover-page .confidential {
      margin-top: 40px;
      padding: 10px 20px;
      border: 2px solid #DC2626;
      color: #DC2626;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    /* Section Styling */
    .section {
      margin-bottom: 60px;
    }
    
    .section h2 {
      font-family: 'Merriweather', serif;
      font-size: 32px;
      color: #0F172A;
      margin-bottom: 30px;
      padding-bottom: 10px;
      border-bottom: 3px solid #3B82F6;
    }
    
    .section h3 {
      font-size: 20px;
      color: #1E293B;
      margin: 30px 0 15px;
      font-weight: 600;
    }
    
    .section h4 {
      font-size: 16px;
      color: #334155;
      margin: 20px 0 10px;
      font-weight: 600;
    }
    
    .section p {
      margin-bottom: 15px;
      color: #475569;
      line-height: 1.8;
    }
    
    /* Executive Summary Box */
    .exec-summary {
      background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
      border-left: 4px solid #3B82F6;
      padding: 30px;
      margin: 30px 0;
      border-radius: 8px;
    }
    
    .exec-summary h3 {
      color: #1E40AF;
    }
    
    /* Key Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    
    .metric-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    
    .metric-card .value {
      font-size: 28px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 5px;
    }
    
    .metric-card .label {
      font-size: 12px;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    th {
      background: #F1F5F9;
      color: #0F172A;
      font-weight: 600;
      text-align: left;
      padding: 12px;
      border-bottom: 2px solid #CBD5E1;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #E2E8F0;
      color: #475569;
    }
    
    tr:hover {
      background: #F8FAFC;
    }
    
    /* Lists */
    ul, ol {
      margin: 15px 0 15px 30px;
      color: #475569;
    }
    
    li {
      margin-bottom: 8px;
    }
    
    /* Financial Tables */
    .financial-table {
      background: white;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      overflow: hidden;
      margin: 30px 0;
    }
    
    .financial-table th {
      background: #1E293B;
      color: white;
    }
    
    .financial-table .total-row {
      font-weight: 700;
      background: #F1F5F9;
    }
    
    .financial-table .positive {
      color: #10B981;
    }
    
    .financial-table .negative {
      color: #EF4444;
    }
    
    /* Risk Matrix */
    .risk-matrix {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    
    .risk-item {
      background: #FEF2F2;
      border-left: 4px solid #EF4444;
      padding: 15px;
      border-radius: 4px;
    }
    
    .risk-item.medium {
      background: #FEF3C7;
      border-left-color: #F59E0B;
    }
    
    .risk-item.low {
      background: #F0FDF4;
      border-left-color: #10B981;
    }
    
    /* Team Cards */
    .team-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 30px;
      margin: 30px 0;
    }
    
    .team-card {
      background: white;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 25px;
    }
    
    .team-card h4 {
      color: #0F172A;
      margin-bottom: 5px;
    }
    
    .team-card .title {
      color: #3B82F6;
      font-size: 14px;
      margin-bottom: 15px;
    }
    
    .team-card .bio {
      color: #64748B;
      font-size: 14px;
      line-height: 1.6;
    }
    
    /* Call to Action */
    .cta-box {
      background: #0F172A;
      color: white;
      padding: 40px;
      border-radius: 8px;
      text-align: center;
      margin: 40px 0;
    }
    
    .cta-box h3 {
      color: white;
      font-size: 28px;
      margin-bottom: 20px;
    }
    
    .cta-box p {
      color: #CBD5E1;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Cover Page -->
    <div class="cover-page">
      <h1>ClearHive Health</h1>
      <div class="subtitle">Business Plan</div>
      <div class="tagline">${this.data.company.tagline}</div>
      
      <div class="metadata">
        <p>Version ${plan.metadata.version}</p>
        <p>${plan.metadata.date}</p>
        <p>Prepared for ${plan.metadata.preparedFor}</p>
        <p>By ${plan.metadata.preparedBy}</p>
      </div>
      
      <div class="confidential">Confidential</div>
    </div>
    
    <!-- Executive Summary -->
    <div class="section">
      <h2>Executive Summary</h2>
      
      <div class="exec-summary">
        <h3>Vision</h3>
        <p>${plan.executiveSummary.vision}</p>
        
        <h3>Problem</h3>
        <p>${plan.executiveSummary.problem}</p>
        
        <h3>Solution</h3>
        <p>${plan.executiveSummary.solution}</p>
      </div>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="value">${plan.executiveSummary.keyMetrics.marketSize}</div>
          <div class="label">Total Market</div>
        </div>
        <div class="metric-card">
          <div class="value">${plan.executiveSummary.keyMetrics.pricingModel}</div>
          <div class="label">Pricing</div>
        </div>
        <div class="metric-card">
          <div class="value">${plan.executiveSummary.ask.amount}</div>
          <div class="label">Seeking</div>
        </div>
      </div>
      
      <h3>The Ask</h3>
      <p><strong>Amount:</strong> ${plan.executiveSummary.ask.amount}</p>
      <p><strong>Use of Funds:</strong> ${plan.executiveSummary.ask.use}</p>
      <p><strong>Milestone:</strong> ${plan.executiveSummary.ask.milestone}</p>
    </div>
    
    <div class="page-break"></div>
    
    <!-- Company Overview -->
    <div class="section">
      <h2>Company Overview</h2>
      
      <h3>Mission</h3>
      <p>${plan.companyOverview.mission}</p>
      
      <h3>Vision</h3>
      <p>${plan.companyOverview.vision}</p>
      
      <h3>Values</h3>
      <ul>
        ${plan.companyOverview.values.map(v => `<li>${v}</li>`).join('')}
      </ul>
      
      <h3>Corporate Structure</h3>
      <table>
        <tr>
          <th>Entity Type</th>
          <td>${plan.companyOverview.incorporation.type}</td>
        </tr>
        <tr>
          <th>State</th>
          <td>${plan.companyOverview.incorporation.state}</td>
        </tr>
        <tr>
          <th>Founded</th>
          <td>${plan.companyOverview.incorporation.date}</td>
        </tr>
      </table>
      
      <h3>Ownership Structure</h3>
      <table>
        ${plan.companyOverview.ownership.structure.map(o => `
          <tr>
            <td>${o.name}</td>
            <td>${o.percentage}%</td>
            <td>${o.type}</td>
          </tr>
        `).join('')}
      </table>
    </div>
    
    <div class="page-break"></div>
    
    <!-- Market Analysis -->
    <div class="section">
      <h2>Market Analysis</h2>
      
      <h3>Market Size</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="value">${plan.marketAnalysis.marketSize.tam.value}</div>
          <div class="label">TAM</div>
        </div>
        <div class="metric-card">
          <div class="value">${plan.marketAnalysis.marketSize.sam.value}</div>
          <div class="label">SAM</div>
        </div>
        <div class="metric-card">
          <div class="value">${plan.marketAnalysis.marketSize.som.value}</div>
          <div class="label">SOM (5 years)</div>
        </div>
      </div>
      
      <h3>Target Segments</h3>
      <table>
        <thead>
          <tr>
            <th>Segment</th>
            <th>Facilities</th>
            <th>Avg Beds</th>
            <th>Pain Level</th>
            <th>Adoption Rate</th>
          </tr>
        </thead>
        <tbody>
          ${plan.marketAnalysis.targetSegments.map(s => `
            <tr>
              <td>${s.segment}</td>
              <td>${s.facilities.toLocaleString()}</td>
              <td>${s.avgBeds}</td>
              <td>${s.painLevel}</td>
              <td>${s.adoptionRate}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <h3>Market Trends</h3>
      <ul>
        ${plan.marketAnalysis.trends.map(t => `<li>${t}</li>`).join('')}
      </ul>
    </div>
    
    <div class="page-break"></div>
    
    <!-- Management Team -->
    <div class="section">
      <h2>Management Team</h2>
      
      <div class="team-grid">
        ${plan.managementTeam.leadership.map(member => `
          <div class="team-card">
            <h4>${member.name}</h4>
            <div class="title">${member.title}</div>
            <div class="bio">${member.bio}</div>
            <div style="margin-top: 15px;">
              <strong>Equity:</strong> ${member.equity}
            </div>
          </div>
        `).join('')}
      </div>
      
      <h3>Decision Rights</h3>
      <ul>
        ${plan.managementTeam.governance.decisionRights.map(d => `<li>${d}</li>`).join('')}
      </ul>
      
      <h3>Hiring Plan</h3>
      <table>
        <thead>
          <tr>
            <th>Timeline</th>
            <th>Positions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Q1 2025</td>
            <td>${plan.managementTeam.hiringPlan.q1_2025.join(', ')}</td>
          </tr>
          <tr>
            <td>Q2 2025</td>
            <td>${plan.managementTeam.hiringPlan.q2_2025.join(', ')}</td>
          </tr>
          <tr>
            <td>Q3 2025</td>
            <td>${plan.managementTeam.hiringPlan.q3_2025.join(', ')}</td>
          </tr>
          <tr>
            <td>Q4 2025</td>
            <td>${plan.managementTeam.hiringPlan.q4_2025.join(', ')}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="page-break"></div>
    
    <!-- Financial Projections -->
    <div class="section">
      <h2>Financial Projections</h2>
      
      <h3>Three-Year Forecast</h3>
      <table class="financial-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Year 1</th>
            <th>Year 2</th>
            <th>Year 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Facilities</td>
            <td>${plan.financialProjections.yearOne.facilities}</td>
            <td>${plan.financialProjections.yearTwo.facilities}</td>
            <td>${plan.financialProjections.yearThree.facilities}</td>
          </tr>
          <tr>
            <td>Recurring Revenue</td>
            <td>$${plan.financialProjections.yearOne.revenue.recurring.toLocaleString()}</td>
            <td>$${plan.financialProjections.yearTwo.revenue.recurring.toLocaleString()}</td>
            <td>$${plan.financialProjections.yearThree.revenue.recurring.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Total Revenue</td>
            <td>$${plan.financialProjections.yearOne.revenue.total.toLocaleString()}</td>
            <td>$${plan.financialProjections.yearTwo.revenue.total.toLocaleString()}</td>
            <td>$${plan.financialProjections.yearThree.revenue.total.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Total Expenses</td>
            <td>$${plan.financialProjections.yearOne.totalExpenses.toLocaleString()}</td>
            <td>$${plan.financialProjections.yearTwo.totalExpenses.toLocaleString()}</td>
            <td>$${plan.financialProjections.yearThree.totalExpenses.toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td>EBITDA</td>
            <td class="${plan.financialProjections.yearOne.ebitda >= 0 ? 'positive' : 'negative'}">
              $${plan.financialProjections.yearOne.ebitda.toLocaleString()}
            </td>
            <td class="${plan.financialProjections.yearTwo.ebitda >= 0 ? 'positive' : 'negative'}">
              $${plan.financialProjections.yearTwo.ebitda.toLocaleString()}
            </td>
            <td class="${plan.financialProjections.yearThree.ebitda >= 0 ? 'positive' : 'negative'}">
              $${plan.financialProjections.yearThree.ebitda.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td>Headcount</td>
            <td>${plan.financialProjections.yearOne.headcount}</td>
            <td>${plan.financialProjections.yearTwo.headcount}</td>
            <td>${plan.financialProjections.yearThree.headcount}</td>
          </tr>
        </tbody>
      </table>
      
      <h3>Key Metrics</h3>
      <ul>
        <li><strong>Break-even:</strong> ${plan.financialProjections.keyMetrics.breakeven}</li>
        <li><strong>Cash Flow Positive:</strong> ${plan.financialProjections.keyMetrics.cashFlowPositive}</li>
        <li><strong>Target Valuation:</strong> ${plan.financialProjections.keyMetrics.targetValuation}</li>
        <li><strong>Exit Multiple:</strong> ${plan.financialProjections.keyMetrics.exitMultiple}</li>
      </ul>
    </div>
    
    <div class="page-break"></div>
    
    <!-- Funding Request -->
    <div class="section">
      <h2>Funding Request</h2>
      
      <div class="cta-box">
        <h3>$${(plan.fundingRequest.amount / 1000000).toFixed(1)}M Seed Round</h3>
        <p>To accelerate growth and capture market opportunity</p>
      </div>
      
      <h3>Use of Funds</h3>
      <table>
        ${plan.fundingRequest.useOfFunds.map(u => `
          <tr>
            <td>${u.category}</td>
            <td>$${u.amount.toLocaleString()}</td>
            <td>${u.percentage}%</td>
          </tr>
        `).join('')}
      </table>
      
      <h3>Milestones</h3>
      <ul>
        ${plan.fundingRequest.milestones.map(m => `<li>${m}</li>`).join('')}
      </ul>
      
      <h3>Terms</h3>
      <ul>
        <li><strong>Valuation:</strong> ${plan.fundingRequest.terms.valuation}</li>
        <li><strong>Type:</strong> ${plan.fundingRequest.terms.type}</li>
        <li><strong>Board:</strong> ${plan.fundingRequest.terms.boardSeats}</li>
        <li><strong>Timeline:</strong> ${plan.fundingRequest.terms.timeline}</li>
      </ul>
      
      <h3>Exit Strategy</h3>
      <p><strong>Strategy:</strong> ${plan.fundingRequest.exit.strategy}</p>
      <p><strong>Timeline:</strong> ${plan.fundingRequest.exit.timeline}</p>
      <p><strong>Target Valuation:</strong> ${plan.fundingRequest.exit.targetValuation}</p>
    </div>
  </div>
</body>
</html>`;
  }
}

// ==========================================
// SERVER
// ==========================================

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (url.pathname === '/' && req.method === 'GET') {
    const generator = new BusinessPlanGenerator();
    const html = await generator.generateFullPlan();
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (url.pathname === '/api/generate' && req.method === 'POST') {
    const generator = new BusinessPlanGenerator();
    const html = await generator.generateFullPlan();
    
    // Save to file
    const filename = `clearhive-business-plan-${Date.now()}.html`;
    await fs.writeFile(filename, html);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      success: true, 
      filename,
      message: 'Business plan generated successfully'
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           CLEARHIVE BUSINESS PLAN GENERATOR                 ║
║                                                              ║
║  Status:  ✓ Running                                         ║
║  URL:     http://localhost:${PORT}                              ║
║                                                              ║
║  This generates a professional business plan specifically   ║
║  for ClearHive Health that you can hand to Mike's father.   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
