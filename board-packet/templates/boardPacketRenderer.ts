// Board Packet HTML Renderer with Tailwind CSS
import { BoardPacketData } from '../exports/boardPacket';

export function renderBoardPacketHTML(data: BoardPacketData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Board Packet - ${data.metadata.period}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      .no-print { display: none; }
      .page-break { page-break-after: always; }
    }
    .risk-matrix-cell {
      min-height: 100px;
      border: 1px solid #e5e7eb;
    }
  </style>
</head>
<body class="bg-white text-gray-900 font-sans">
  <!-- Header -->
  <div class="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-8 no-print">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-4xl font-bold mb-2">Board Packet</h1>
      <p class="text-xl opacity-90">${data.metadata.period}</p>
      <p class="text-sm opacity-75 mt-2">Generated: ${new Date(data.metadata.generatedAt).toLocaleString()}</p>
    </div>
  </div>

  <!-- Navigation -->
  <nav class="bg-gray-100 border-b sticky top-0 z-10 no-print">
    <div class="max-w-6xl mx-auto px-8 py-4">
      <div class="flex space-x-6 text-sm">
        <a href="#executive-summary" class="text-blue-600 hover:text-blue-800">Executive Summary</a>
        <a href="#90-day-plan" class="text-blue-600 hover:text-blue-800">90-Day Plan</a>
        <a href="#financials" class="text-blue-600 hover:text-blue-800">Financials</a>
        <a href="#risks" class="text-blue-600 hover:text-blue-800">Risks</a>
        <a href="#actions" class="text-blue-600 hover:text-blue-800">Actions</a>
      </div>
    </div>
  </nav>

  <div class="max-w-6xl mx-auto px-8 py-8">
    <!-- Executive Summary -->
    <section id="executive-summary" class="mb-12">
      <h2 class="text-3xl font-bold mb-6 text-gray-900 border-b-2 border-blue-600 pb-2">Executive Summary</h2>
      
      <div class="bg-blue-50 border-l-4 border-blue-600 p-6 mb-6">
        <p class="text-gray-700 leading-relaxed">${data.sections.executiveSummary.overview}</p>
      </div>

      <div class="grid md:grid-cols-2 gap-6 mb-6">
        <!-- Key Highlights -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-xl font-semibold mb-4 text-gray-800">Key Highlights</h3>
          <ul class="space-y-2">
            ${data.sections.executiveSummary.keyHighlights.map(h => 
              `<li class="flex items-start">
                <svg class="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span class="text-gray-700">${h}</span>
              </li>`
            ).join('')}
          </ul>
        </div>

        <!-- Performance Snapshot -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-xl font-semibold mb-4 text-gray-800">Performance Snapshot</h3>
          <div class="space-y-3">
            ${data.sections.executiveSummary.performanceSnapshot.map(p => `
              <div class="flex justify-between items-center">
                <span class="text-gray-600">${p.metric}</span>
                <div class="flex items-center">
                  <span class="font-semibold mr-2">${p.value}</span>
                  ${p.trend === 'up' ? 
                    '<svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>' :
                    p.trend === 'down' ?
                    '<svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>' :
                    '<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>'
                  }
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Critical Decisions -->
      ${data.sections.executiveSummary.criticalDecisions.length > 0 ? `
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-xl font-semibold mb-4 text-gray-800">Critical Decisions</h3>
          <div class="space-y-4">
            ${data.sections.executiveSummary.criticalDecisions.map((d, i) => `
              <div class="border-l-4 border-blue-500 pl-4">
                <h4 class="font-semibold text-gray-800">${i + 1}. ${d.decision}</h4>
                <p class="text-sm text-gray-600 mt-1"><strong>Rationale:</strong> ${d.rationale}</p>
                <p class="text-sm text-gray-600"><strong>Impact:</strong> ${d.impact}</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </section>

    <div class="page-break"></div>

    <!-- 90-Day Plan -->
    <section id="90-day-plan" class="mb-12">
      <h2 class="text-3xl font-bold mb-6 text-gray-900 border-b-2 border-green-600 pb-2">90-Day Plan</h2>
      
      <!-- Objectives -->
      <div class="mb-8">
        <h3 class="text-2xl font-semibold mb-4 text-gray-800">Strategic Objectives</h3>
        <div class="grid gap-6">
          ${data.sections.ninetyDayPlan.objectives.map(obj => `
            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-start mb-3">
                <h4 class="text-lg font-semibold text-gray-800">${obj.title}</h4>
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${
                  obj.status === 'on-track' ? 'bg-green-100 text-green-800' :
                  obj.status === 'at-risk' ? 'bg-red-100 text-red-800' :
                  obj.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }">${obj.status.replace('-', ' ').toUpperCase()}</span>
              </div>
              <p class="text-gray-600 mb-3">${obj.description}</p>
              <div class="mb-3">
                <p class="text-sm font-semibold text-gray-700 mb-2">Key Results:</p>
                <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                  ${obj.keyResults.map(kr => `<li>${kr}</li>`).join('')}
                </ul>
              </div>
              <p class="text-sm text-gray-500"><strong>Owner:</strong> ${obj.owner}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Milestones -->
      <div class="mb-8">
        <h3 class="text-2xl font-semibold mb-4 text-gray-800">Key Milestones</h3>
        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="relative">
            ${data.sections.ninetyDayPlan.milestones.map((m, i) => `
              <div class="flex items-center mb-6 ${i === data.sections.ninetyDayPlan.milestones.length - 1 ? '' : 'pb-6 border-l-2 border-gray-300 ml-3'}">
                <div class="absolute -left-2 w-6 h-6 bg-blue-600 rounded-full border-4 border-white"></div>
                <div class="ml-8">
                  <div class="flex items-center mb-1">
                    <span class="text-sm font-semibold text-gray-500 mr-4">${m.date}</span>
                    <span class="text-sm text-gray-500">Owner: ${m.owner}</span>
                  </div>
                  <p class="font-semibold text-gray-800">${m.milestone}</p>
                  ${m.dependencies.length > 0 ? 
                    `<p class="text-sm text-gray-600 mt-1">Dependencies: ${m.dependencies.join(', ')}</p>` : ''
                  }
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Resource Requirements -->
      <div>
        <h3 class="text-2xl font-semibold mb-4 text-gray-800">Resource Requirements</h3>
        <div class="bg-white rounded-lg shadow-md p-6">
          <table class="w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left pb-3 text-gray-700">Type</th>
                <th class="text-left pb-3 text-gray-700">Amount</th>
                <th class="text-left pb-3 text-gray-700">Justification</th>
              </tr>
            </thead>
            <tbody>
              ${data.sections.ninetyDayPlan.resourceRequirements.map(r => `
                <tr class="border-b">
                  <td class="py-3 text-gray-600">${r.type}</td>
                  <td class="py-3 font-semibold">${r.amount}</td>
                  <td class="py-3 text-gray-600">${r.justification}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div class="page-break"></div>

    <!-- Financials -->
    <section id="financials" class="mb-12">
      <h2 class="text-3xl font-bold mb-6 text-gray-900 border-b-2 border-purple-600 pb-2">Financials</h2>
      
      <div class="bg-purple-50 border-l-4 border-purple-600 p-6 mb-6">
        <p class="text-gray-700">${data.sections.financials.summary}</p>
      </div>

      <div class="grid md:grid-cols-2 gap-6 mb-6">
        <!-- Current Quarter -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-xl font-semibold mb-4 text-gray-800">Current Quarter</h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">Revenue</span>
              <span class="font-semibold text-green-600">$${data.sections.financials.currentQuarter.revenue.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Expenses</span>
              <span class="font-semibold text-red-600">$${data.sections.financials.currentQuarter.expenses.toLocaleString()}</span>
            </div>
            <div class="flex justify-between border-t pt-3">
              <span class="text-gray-600">Burn Rate</span>
              <span class="font-semibold">$${data.sections.financials.currentQuarter.burnRate.toLocaleString()}/mo</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Runway</span>
              <span class="font-semibold text-blue-600">${data.sections.financials.currentQuarter.runway}</span>
            </div>
          </div>
        </div>

        <!-- Key Metrics -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-xl font-semibold mb-4 text-gray-800">Key Metrics</h3>
          <div class="space-y-3">
            ${data.sections.financials.keyMetrics.map(m => `
              <div>
                <div class="flex justify-between items-center mb-1">
                  <span class="text-sm text-gray-600">${m.metric}</span>
                  <span class="text-xs px-2 py-1 rounded ${
                    m.status === 'on-track' ? 'bg-green-100 text-green-800' :
                    m.status === 'at-risk' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }">${m.status.replace('-', ' ')}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm">Current: <strong>${m.current}</strong></span>
                  <span class="text-sm">Target: <strong>${m.target}</strong></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Projections Chart -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-semibold mb-4 text-gray-800">Quarterly Projections</h3>
        <table class="w-full">
          <thead>
            <tr class="border-b">
              <th class="text-left pb-3 text-gray-700">Quarter</th>
              <th class="text-right pb-3 text-gray-700">Revenue</th>
              <th class="text-right pb-3 text-gray-700">Expenses</th>
              <th class="text-right pb-3 text-gray-700">Net Income</th>
            </tr>
          </thead>
          <tbody>
            ${data.sections.financials.projections.map(p => `
              <tr class="border-b">
                <td class="py-3 text-gray-600">${p.quarter}</td>
                <td class="py-3 text-right ${p.revenue > 0 ? 'text-green-600' : 'text-gray-600'}">
                  $${p.revenue.toLocaleString()}
                </td>
                <td class="py-3 text-right text-red-600">
                  $${p.expenses.toLocaleString()}
                </td>
                <td class="py-3 text-right font-semibold ${p.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}">
                  $${p.netIncome.toLocaleString()}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <div class="page-break"></div>

    <!-- Risks -->
    <section id="risks" class="mb-12">
      <h2 class="text-3xl font-bold mb-6 text-gray-900 border-b-2 border-red-600 pb-2">Risk Assessment</h2>
      
      <div class="bg-red-50 border-l-4 border-red-600 p-6 mb-6">
        <p class="text-gray-700">${data.sections.risks.summary}</p>
      </div>

      <!-- Risk Matrix -->
      <div class="mb-8">
        <h3 class="text-2xl font-semibold mb-4 text-gray-800">Risk Matrix</h3>
        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="risk-matrix-cell bg-red-100 p-4">
              <h4 class="font-semibold text-red-800 mb-2">High Impact / High Likelihood</h4>
              <ul class="text-sm text-gray-700 space-y-1">
                ${data.sections.risks.riskMatrix.highImpactHighLikelihood.map(r => 
                  `<li>• ${r}</li>`
                ).join('')}
              </ul>
            </div>
            <div class="risk-matrix-cell bg-yellow-100 p-4">
              <h4 class="font-semibold text-yellow-800 mb-2">High Impact / Low Likelihood</h4>
              <ul class="text-sm text-gray-700 space-y-1">
                ${data.sections.risks.riskMatrix.highImpactLowLikelihood.map(r => 
                  `<li>• ${r}</li>`
                ).join('')}
              </ul>
            </div>
            <div class="risk-matrix-cell bg-yellow-50 p-4">
              <h4 class="font-semibold text-yellow-700 mb-2">Low Impact / High Likelihood</h4>
              <ul class="text-sm text-gray-700 space-y-1">
                ${data.sections.risks.riskMatrix.lowImpactHighLikelihood.map(r => 
                  `<li>• ${r}</li>`
                ).join('')}
              </ul>
            </div>
            <div class="risk-matrix-cell bg-green-50 p-4">
              <h4 class="font-semibold text-green-700 mb-2">Low Impact / Low Likelihood</h4>
              <ul class="text-sm text-gray-700 space-y-1">
                ${data.sections.risks.riskMatrix.lowImpactLowLikelihood.map(r => 
                  `<li>• ${r}</li>`
                ).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Risks Detail -->
      <div>
        <h3 class="text-2xl font-semibold mb-4 text-gray-800">Risk Register</h3>
        <div class="space-y-4">
          ${data.sections.risks.topRisks.map(r => `
            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-start mb-3">
                <h4 class="text-lg font-semibold text-gray-800">${r.risk}</h4>
                <div class="flex space-x-2">
                  <span class="px-3 py-1 rounded-full text-xs font-semibold ${
                    r.severity === 'critical' ? 'bg-purple-100 text-purple-800' :
                    r.severity === 'high' ? 'bg-red-100 text-red-800' :
                    r.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }">${r.severity.toUpperCase()}</span>
                  <span class="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                    ${r.likelihood.toUpperCase()}
                  </span>
                </div>
              </div>
              <div class="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-gray-600"><strong>Impact:</strong> ${r.impact}</p>
                  <p class="text-gray-600 mt-2"><strong>Owner:</strong> ${r.owner}</p>
                </div>
                <div>
                  <p class="text-gray-600"><strong>Mitigation:</strong> ${r.mitigation}</p>
                  <p class="text-gray-600 mt-2"><strong>Status:</strong> 
                    <span class="font-semibold ${
                      r.status === 'resolved' ? 'text-green-600' :
                      r.status === 'mitigating' ? 'text-blue-600' :
                      r.status === 'monitoring' ? 'text-yellow-600' :
                      'text-gray-600'
                    }">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
                  </p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <div class="page-break"></div>

    <!-- Actions -->
    <section id="actions" class="mb-12">
      <h2 class="text-3xl font-bold mb-6 text-gray-900 border-b-2 border-orange-600 pb-2">Action Items</h2>
      
      <!-- Immediate Actions -->
      <div class="mb-8">
        <h3 class="text-2xl font-semibold mb-4 text-gray-800">Immediate Actions</h3>
        <div class="bg-white rounded-lg shadow-md p-6">
          <table class="w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left pb-3 text-gray-700">Action</th>
                <th class="text-left pb-3 text-gray-700">Owner</th>
                <th class="text-left pb-3 text-gray-700">Due Date</th>
                <th class="text-left pb-3 text-gray-700">Priority</th>
                <th class="text-left pb-3 text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.sections.actions.immediateActions.map(a => `
                <tr class="border-b">
                  <td class="py-3">
                    <p class="text-gray-800">${a.action}</p>
                    ${a.blockers && a.blockers.length > 0 ? 
                      `<p class="text-xs text-red-600 mt-1">Blocked by: ${a.blockers.join(', ')}</p>` : ''
                    }
                  </td>
                  <td class="py-3 text-gray-600">${a.owner}</td>
                  <td class="py-3 text-gray-600">${a.dueDate}</td>
                  <td class="py-3">
                    <span class="px-2 py-1 rounded text-xs font-semibold ${
                      a.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      a.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      a.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }">${a.priority.toUpperCase()}</span>
                  </td>
                  <td class="py-3">
                    <span class="px-2 py-1 rounded text-xs font-semibold ${
                      a.status === 'completed' ? 'bg-green-100 text-green-800' :
                      a.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      a.status === 'blocked' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }">${a.status.replace('-', ' ').toUpperCase()}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Follow-ups -->
      ${data.sections.actions.followUps.length > 0 ? `
        <div>
          <h3 class="text-2xl font-semibold mb-4 text-gray-800">Follow-up Items</h3>
          <div class="grid md:grid-cols-2 gap-4">
            ${data.sections.actions.followUps.map(f => `
              <div class="bg-white rounded-lg shadow-md p-4">
                <h4 class="font-semibold text-gray-800 mb-2">${f.item}</h4>
                <div class="text-sm text-gray-600 space-y-1">
                  <p><strong>Owner:</strong> ${f.owner}</p>
                  <p><strong>Next Step:</strong> ${f.nextStep}</p>
                  <p><strong>Timeline:</strong> ${f.timeline}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </section>

    <!-- Footer -->
    <footer class="mt-16 pt-8 border-t text-center text-sm text-gray-500">
      <p>Prepared by ${data.metadata.preparedBy}</p>
      <p>Session ID: ${data.metadata.sessionId}</p>
      <p class="mt-2">© ${new Date().getFullYear()} Roundtable AI Advisory Board - Confidential</p>
    </footer>
  </div>

  <!-- Print Button -->
  <div class="fixed bottom-8 right-8 no-print">
    <button onclick="window.print()" class="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition">
      Print Board Packet
    </button>
  </div>
</body>
</html>
  `;
}

