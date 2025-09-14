// ClearHive Health Strategic Configuration
// This module integrates ClearHive's business context into Decision OS Pro

export const CLEARHIVE_CONTEXT = {
  company: {
    name: 'ClearHive Health LLC',
    tagline: 'The aftercare operations layer for behavioral health',
    industry: 'Healthcare Technology / Behavioral Health',
    stage: 'Pre-Seed / Early Revenue',
    founded: 'September 1, 2025',
    
    mission: 'To standardize and streamline aftercare coordination in behavioral health, ensuring no patient falls through the cracks during critical care transitions.',
    
    vision: 'Every behavioral health discharge supported by intelligent, compliant coordination that connects patients, families, and providers seamlessly.'
  },
  
  leadership: {
    ceo: {
      name: 'Michael Giresi',
      role: 'CEO & Co-Founder',
      ownership: '35% (+5% vesting)',
      focus: ['Revenue growth', 'Customer acquisition', 'Clinical partnerships'],
      kpis: ['ARR', 'Pilot conversions', 'NPS', 'Provider network size']
    },
    cpo: {
      name: 'Christopher J.M. Molina',
      role: 'CPO & Co-Founder',
      ownership: '65%',
      focus: ['Product strategy', 'Technical architecture', 'Compliance', 'User experience'],
      kpis: ['Feature velocity', 'Platform uptime', 'User adoption', 'Compliance score']
    }
  },
  
  businessModel: {
    revenue: {
      saas: {
        description: 'Monthly subscription per facility',
        pricing: '$2,000-5,000/month',
        target: 'Treatment centers, PHP/IOP programs'
      },
      implementation: {
        description: 'One-time setup and training',
        pricing: '$2,000-5,000',
        includes: ['EMR integration', 'Staff training', 'Workflow configuration']
      },
      enterprise: {
        description: 'Multi-facility networks',
        pricing: 'Custom (10+ facilities)',
        features: ['Centralized reporting', 'Network analytics', 'Custom integrations']
      }
    },
    
    costs: {
      development: {
        monthly: 8000,
        includes: ['Engineering', 'Infrastructure', 'Tools']
      },
      sales: {
        monthly: 4000,
        includes: ['Sales team', 'Marketing', 'Conferences']
      },
      operations: {
        monthly: 3000,
        includes: ['Customer success', 'Support', 'Compliance']
      }
    }
  },
  
  market: {
    tam: {
      value: 8500000000, // $8.5B
      description: 'Total US behavioral health software market'
    },
    sam: {
      value: 1200000000, // $1.2B
      description: 'Aftercare coordination and discharge planning segment'
    },
    som: {
      value: 120000000, // $120M
      description: 'Achievable market share in 5 years'
    },
    
    competitors: [
      {
        name: 'Bamboo Health',
        strengths: ['Market presence', 'EMR integrations'],
        weaknesses: ['Not aftercare-focused', 'Complex implementation']
      },
      {
        name: 'Kipu Health',
        strengths: ['Full EMR solution', 'Established base'],
        weaknesses: ['Expensive', 'Not specialized for aftercare']
      },
      {
        name: 'Manual processes',
        strengths: ['Familiar to staff', 'No tech adoption'],
        weaknesses: ['Time-consuming', 'Error-prone', 'No visibility']
      }
    ],
    
    differentiators: [
      'Aftercare-first design philosophy',
      'Built by practitioners for practitioners',
      'Family communication portal included',
      'Compliance automation (HIPAA, 42 CFR Part 2)',
      'Rapid implementation (days not months)'
    ]
  },
  
  metrics: {
    current: {
      mrr: 0,
      arr: 0,
      customers: 0,
      pilots: 3,
      runway: 6 // months
    },
    
    targets: {
      q1_2025: {
        pilots: 5,
        conversions: 2,
        mrr: 10000
      },
      q2_2025: {
        customers: 5,
        mrr: 20000,
        arr: 240000
      },
      q3_2025: {
        customers: 10,
        mrr: 40000,
        arr: 480000
      },
      q4_2025: {
        customers: 15,
        mrr: 65000,
        arr: 780000
      }
    }
  },
  
  risks: {
    market: [
      'Long sales cycles in healthcare',
      'Budget constraints at treatment centers',
      'Competing priorities for IT resources'
    ],
    regulatory: [
      'Evolving behavioral health regulations',
      'State-by-state compliance variations',
      'HIPAA and 42 CFR Part 2 complexity'
    ],
    operational: [
      'Scaling customer success',
      'Maintaining high touch support',
      'EMR integration complexity'
    ],
    financial: [
      'Limited runway without funding',
      'Customer concentration risk',
      'Seasonal budget cycles'
    ]
  },
  
  milestones: {
    completed: [
      { date: '2025-09-01', milestone: 'Company formation', status: 'complete' },
      { date: '2025-09-15', milestone: 'MVP development', status: 'complete' },
      { date: '2025-10-01', milestone: 'First pilot launch', status: 'complete' }
    ],
    upcoming: [
      { date: '2025-12-15', milestone: 'First paid customer', status: 'pending' },
      { date: '2026-01-31', milestone: 'Break-even MRR ($15k)', status: 'pending' },
      { date: '2026-03-31', milestone: 'Series Seed funding', status: 'pending' },
      { date: '2026-06-30', milestone: '25 customers / $100k MRR', status: 'pending' }
    ]
  },
  
  strategies: {
    growth: [
      'Land and expand within behavioral health networks',
      'Partner with EMR vendors for distribution',
      'Focus on adolescent treatment centers initially',
      'Build case studies from pilot successes'
    ],
    product: [
      'Mobile app for discharge coordinators',
      'AI-powered referral matching',
      'Outcomes tracking and reporting',
      'Insurance verification integration'
    ],
    fundraising: [
      'Target healthcare-focused angels',
      'Leverage pilot data for validation',
      'Position as compliance-first solution',
      'Emphasize founder-market fit'
    ]
  }
};

// Executive advisory configurations specific to ClearHive
export const CLEARHIVE_ADVISORS = {
  healthcare_expert: {
    name: 'Healthcare Operations Expert',
    expertise: ['Behavioral health operations', 'Clinical workflows', 'Regulatory compliance'],
    perspective: 'Focus on clinical outcomes and operational efficiency'
  },
  
  investor_perspective: {
    name: 'Healthcare Investor',
    expertise: ['SaaS metrics', 'Healthcare markets', 'Growth strategies'],
    perspective: 'Evaluate scalability, unit economics, and market opportunity'
  },
  
  customer_voice: {
    name: 'Treatment Center Executive',
    expertise: ['Facility operations', 'Discharge planning', 'Staff workflows'],
    perspective: 'Prioritize ease of use, staff adoption, and measurable outcomes'
  },
  
  compliance_advisor: {
    name: 'Healthcare Compliance Officer',
    expertise: ['HIPAA', '42 CFR Part 2', 'State regulations'],
    perspective: 'Ensure bulletproof compliance and audit readiness'
  }
};

// Decision templates for ClearHive
export const CLEARHIVE_TEMPLATES = {
  'investor-update': {
    name: 'Monthly Investor Update',
    sections: ['Metrics', 'Wins', 'Challenges', 'Asks', 'Runway']
  },
  
  'customer-pipeline': {
    name: 'Customer Pipeline Review',
    sections: ['Pilots', 'Conversions', 'At Risk', 'Expansion', 'Referrals']
  },
  
  'product-roadmap': {
    name: 'Product Roadmap Planning',
    sections: ['Customer requests', 'Technical debt', 'Competitive features', 'Innovation']
  },
  
  'board-meeting': {
    name: 'Board Meeting Prep',
    sections: ['Executive summary', 'Financials', 'Strategic initiatives', 'Risk assessment']
  }
};