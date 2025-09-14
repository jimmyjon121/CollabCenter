// Citation Tracker - Validate claims against source documents
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export class CitationTracker {
  constructor(config = {}) {
    this.config = {
      minConfidence: 0.7,
      requireExactQuote: false,
      maxCitationDistance: 500, // characters from claim to source
      citationFormats: ['inline', 'footnote', 'endnote'],
      ...config
    };
    
    this.citations = new Map();
    this.uncitedClaims = new Map();
  }

  async validate(claims, documents) {
    const validationResults = {
      citations: [],
      uncitedClaims: [],
      warnings: []
    };

    for (const claim of claims) {
      const citation = await this.findCitation(claim, documents);
      
      if (citation) {
        validationResults.citations.push(citation);
        this.citations.set(citation.id, citation);
      } else {
        validationResults.uncitedClaims.push(claim.text || claim);
        this.uncitedClaims.set(uuidv4(), {
          claim: claim.text || claim,
          timestamp: Date.now(),
          attempted: true
        });
        
        // Add warning for uncited claim
        validationResults.warnings.push({
          type: 'uncited_claim',
          claim: claim.text || claim,
          suggestion: 'This claim requires a citation from the provided documents'
        });
      }
    }

    logger.info(`Citation validation: ${validationResults.citations.length} cited, ${validationResults.uncitedClaims.length} uncited`);
    
    return validationResults;
  }

  async findCitation(claim, documents) {
    const claimText = typeof claim === 'string' ? claim : claim.text;
    const claimKeywords = this.extractKeywords(claimText);
    
    let bestMatch = null;
    let bestScore = 0;

    for (const doc of documents) {
      // Search through document chunks
      const chunks = doc.chunks || [doc];
      
      for (const chunk of chunks) {
        const score = this.calculateRelevance(claimText, chunk.text, claimKeywords);
        
        if (score > bestScore && score >= this.config.minConfidence) {
          bestScore = score;
          bestMatch = {
            chunk,
            document: doc,
            score
          };
        }
      }
    }

    if (bestMatch) {
      return this.createCitation(claim, bestMatch);
    }
    
    return null;
  }

  calculateRelevance(claim, source, keywords) {
    // Normalize texts
    const claimLower = claim.toLowerCase();
    const sourceLower = source.toLowerCase();
    
    // Check for exact quote
    if (this.config.requireExactQuote) {
      // Look for quoted text in claim
      const quotes = claim.match(/"([^"]+)"/g) || [];
      for (const quote of quotes) {
        const cleanQuote = quote.replace(/"/g, '').toLowerCase();
        if (sourceLower.includes(cleanQuote)) {
          return 1.0; // Perfect match for exact quote
        }
      }
    }
    
    // Keyword matching
    let keywordMatches = 0;
    let totalKeywords = keywords.length;
    
    for (const keyword of keywords) {
      if (sourceLower.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    }
    
    const keywordScore = totalKeywords > 0 ? keywordMatches / totalKeywords : 0;
    
    // Fuzzy matching for paraphrases
    const fuzzyScore = this.fuzzyMatch(claimLower, sourceLower);
    
    // Combine scores
    const finalScore = (keywordScore * 0.6) + (fuzzyScore * 0.4);
    
    return finalScore;
  }

  fuzzyMatch(claim, source) {
    // Split into words
    const claimWords = claim.split(/\s+/);
    const sourceWords = source.split(/\s+/);
    
    // Find common words
    const commonWords = claimWords.filter(word => 
      sourceWords.some(srcWord => 
        srcWord.includes(word) || word.includes(srcWord)
      )
    );
    
    // Calculate similarity
    const similarity = commonWords.length / claimWords.length;
    
    // Check proximity of matching words
    if (commonWords.length >= 3) {
      // Check if matching words appear close together in source
      const positions = commonWords.map(word => source.indexOf(word));
      const maxDistance = Math.max(...positions) - Math.min(...positions);
      
      if (maxDistance <= this.config.maxCitationDistance) {
        return Math.min(1.0, similarity * 1.2); // Boost score for proximity
      }
    }
    
    return similarity;
  }

  extractKeywords(text) {
    // Remove common words and extract important terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'may', 'might', 'can', 'shall', 'must',
      'if', 'then', 'else', 'when', 'where', 'why', 'how', 'what', 'which',
      'who', 'whom', 'whose', 'this', 'that', 'these', 'those', 'it', 'its'
    ]);
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !stopWords.has(word) &&
        !word.match(/^\d+$/) // Not just numbers
      );
    
    // Extract unique important words
    const uniqueWords = [...new Set(words)];
    
    // Prioritize longer words (often more specific)
    return uniqueWords.sort((a, b) => b.length - a.length).slice(0, 10);
  }

  createCitation(claim, match) {
    const citation = {
      id: uuidv4(),
      claim: typeof claim === 'string' ? claim : claim.text,
      source: {
        documentId: match.document.id,
        documentName: match.document.name || 'Unknown',
        chunkId: match.chunk.id,
        page: match.chunk.page,
        text: this.extractRelevantPassage(claim, match.chunk.text),
        confidence: match.score
      },
      createdAt: Date.now(),
      format: this.config.citationFormats[0]
    };
    
    // Add position information if available
    if (match.chunk.startOffset !== undefined) {
      citation.source.startOffset = match.chunk.startOffset;
      citation.source.endOffset = match.chunk.endOffset;
    }
    
    return citation;
  }

  extractRelevantPassage(claim, sourceText, maxLength = 300) {
    const claimKeywords = this.extractKeywords(
      typeof claim === 'string' ? claim : claim.text
    );
    
    // Find the most relevant section of source text
    const sentences = sourceText.split(/[.!?]+/);
    let bestSentence = '';
    let bestScore = 0;
    
    for (const sentence of sentences) {
      const score = claimKeywords.filter(kw => 
        sentence.toLowerCase().includes(kw)
      ).length;
      
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence;
      }
    }
    
    // If found, include surrounding context
    if (bestSentence) {
      const index = sourceText.indexOf(bestSentence);
      const start = Math.max(0, index - 50);
      const end = Math.min(sourceText.length, index + bestSentence.length + 50);
      let passage = sourceText.substring(start, end).trim();
      
      // Add ellipsis if truncated
      if (start > 0) passage = '...' + passage;
      if (end < sourceText.length) passage = passage + '...';
      
      return passage;
    }
    
    // Fallback to first part of source
    return sourceText.substring(0, maxLength) + '...';
  }

  formatCitation(citation, format = null) {
    const fmt = format || citation.format || this.config.citationFormats[0];
    
    switch (fmt) {
      case 'inline':
        return this.formatInline(citation);
      case 'footnote':
        return this.formatFootnote(citation);
      case 'endnote':
        return this.formatEndnote(citation);
      default:
        return this.formatInline(citation);
    }
  }

  formatInline(citation) {
    const { source } = citation;
    const page = source.page ? `, p. ${source.page}` : '';
    return `(${source.documentName}${page})`;
  }

  formatFootnote(citation, number) {
    const { source } = citation;
    const page = source.page ? `, page ${source.page}` : '';
    return `[${number}] ${source.documentName}${page}: "${source.text}"`;
  }

  formatEndnote(citation, number) {
    const { source } = citation;
    return {
      marker: `[${number}]`,
      note: `${number}. ${source.documentName}, ${source.page ? `page ${source.page}, ` : ''}"${source.text}"`
    };
  }

  generateCitationReport(sessionId = null) {
    const citations = sessionId 
      ? Array.from(this.citations.values()).filter(c => c.sessionId === sessionId)
      : Array.from(this.citations.values());
    
    const uncited = sessionId
      ? Array.from(this.uncitedClaims.values()).filter(c => c.sessionId === sessionId)
      : Array.from(this.uncitedClaims.values());
    
    // Group citations by document
    const byDocument = {};
    citations.forEach(citation => {
      const docId = citation.source.documentId;
      if (!byDocument[docId]) {
        byDocument[docId] = {
          documentName: citation.source.documentName,
          citations: []
        };
      }
      byDocument[docId].citations.push(citation);
    });
    
    // Calculate statistics
    const stats = {
      totalCitations: citations.length,
      totalUncited: uncited.length,
      citationRate: citations.length / (citations.length + uncited.length),
      averageConfidence: citations.reduce((sum, c) => sum + c.source.confidence, 0) / citations.length,
      documentsUsed: Object.keys(byDocument).length
    };
    
    return {
      stats,
      byDocument,
      uncitedClaims: uncited.map(u => u.claim),
      timeline: [...citations, ...uncited]
        .sort((a, b) => (a.createdAt || a.timestamp) - (b.createdAt || b.timestamp))
        .map(item => ({
          type: item.id ? 'citation' : 'uncited',
          text: item.claim,
          timestamp: item.createdAt || item.timestamp,
          confidence: item.source?.confidence
        }))
    };
  }

  exportCitations(format = 'markdown') {
    const report = this.generateCitationReport();
    
    switch (format) {
      case 'markdown':
        return this.exportAsMarkdown(report);
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'bibtex':
        return this.exportAsBibTeX(report);
      default:
        return report;
    }
  }

  exportAsMarkdown(report) {
    let md = '# Citation Report\n\n';
    
    // Statistics
    md += '## Statistics\n\n';
    md += `- Total Citations: ${report.stats.totalCitations}\n`;
    md += `- Uncited Claims: ${report.stats.totalUncited}\n`;
    md += `- Citation Rate: ${(report.stats.citationRate * 100).toFixed(1)}%\n`;
    md += `- Average Confidence: ${(report.stats.averageConfidence * 100).toFixed(1)}%\n`;
    md += `- Documents Used: ${report.stats.documentsUsed}\n\n`;
    
    // Citations by document
    md += '## Citations by Document\n\n';
    for (const [docId, doc] of Object.entries(report.byDocument)) {
      md += `### ${doc.documentName}\n\n`;
      doc.citations.forEach((citation, i) => {
        md += `${i + 1}. **Claim**: ${citation.claim}\n`;
        md += `   **Source**: "${citation.source.text}"\n`;
        md += `   **Page**: ${citation.source.page || 'N/A'}, **Confidence**: ${(citation.source.confidence * 100).toFixed(1)}%\n\n`;
      });
    }
    
    // Uncited claims
    if (report.uncitedClaims.length > 0) {
      md += '## Uncited Claims\n\n';
      report.uncitedClaims.forEach((claim, i) => {
        md += `${i + 1}. ${claim}\n`;
      });
    }
    
    return md;
  }

  exportAsBibTeX(report) {
    let bibtex = '';
    const usedDocs = new Set();
    
    for (const [docId, doc] of Object.entries(report.byDocument)) {
      if (!usedDocs.has(docId)) {
        bibtex += `@misc{${docId.substring(0, 8)},\n`;
        bibtex += `  title = {${doc.documentName}},\n`;
        bibtex += `  year = {${new Date().getFullYear()}},\n`;
        bibtex += `  note = {Internal document}\n`;
        bibtex += `}\n\n`;
        usedDocs.add(docId);
      }
    }
    
    return bibtex;
  }

  clear() {
    this.citations.clear();
    this.uncitedClaims.clear();
  }
}

