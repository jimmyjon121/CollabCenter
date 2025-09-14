// Citation Enforcement System
export interface CitationAnchor {
  fileHash: string;
  fileName: string;
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  text: string;
  confidence: number;
}

export interface Citation {
  id: string;
  claim: string;
  anchors: CitationAnchor[];
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CitationConfig {
  requireCitation: boolean;
  minConfidence: number;
  maxAnchorsPerClaim: number;
  autoVerify: boolean;
}

export class CitationManager {
  private citations: Map<string, Citation> = new Map();
  private config: CitationConfig;

  constructor(config: CitationConfig = {
    requireCitation: true,
    minConfidence: 0.7,
    maxAnchorsPerClaim: 5,
    autoVerify: false
  }) {
    this.config = config;
  }

  // Extract claims from text and check for citations
  extractClaims(text: string): { claim: string; hasCitation: boolean; citation?: Citation }[] {
    const claims: { claim: string; hasCitation: boolean; citation?: Citation }[] = [];
    
    // Split text into sentences (simple approach)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length === 0) continue;
      
      // Check if this sentence has a citation
      const citation = this.findCitationForClaim(trimmed);
      const hasCitation = citation !== null;
      
      claims.push({
        claim: trimmed,
        hasCitation,
        citation: citation || undefined
      });
    }
    
    return claims;
  }

  // Find existing citation for a claim
  private findCitationForClaim(claim: string): Citation | null {
    for (const citation of this.citations.values()) {
      if (this.claimsMatch(claim, citation.claim)) {
        return citation;
      }
    }
    return null;
  }

  // Check if two claims are similar enough to be the same
  private claimsMatch(claim1: string, claim2: string): boolean {
    const similarity = this.calculateSimilarity(claim1, claim2);
    return similarity > 0.8; // 80% similarity threshold
  }

  // Calculate string similarity using Jaccard index
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // Add a new citation
  addCitation(claim: string, anchors: CitationAnchor[]): Citation {
    const citation: Citation = {
      id: this.generateId(),
      claim: claim.trim(),
      anchors: anchors.filter(anchor => anchor.confidence >= this.config.minConfidence),
      verified: this.config.autoVerify,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.citations.set(citation.id, citation);
    return citation;
  }

  // Verify a citation by checking if anchors are valid
  verifyCitation(citationId: string, isValid: boolean): boolean {
    const citation = this.citations.get(citationId);
    if (!citation) return false;

    citation.verified = isValid;
    citation.updatedAt = new Date().toISOString();
    
    this.citations.set(citationId, citation);
    return true;
  }

  // Get all citations for a claim
  getCitationsForClaim(claim: string): Citation[] {
    const results: Citation[] = [];
    
    for (const citation of this.citations.values()) {
      if (this.claimsMatch(claim, citation.claim)) {
        results.push(citation);
      }
    }
    
    return results;
  }

  // Get all unverified citations
  getUnverifiedCitations(): Citation[] {
    return Array.from(this.citations.values()).filter(c => !c.verified);
  }

  // Get citation by ID
  getCitation(citationId: string): Citation | undefined {
    return this.citations.get(citationId);
  }

  // Update citation anchors
  updateCitationAnchors(citationId: string, anchors: CitationAnchor[]): boolean {
    const citation = this.citations.get(citationId);
    if (!citation) return false;

    citation.anchors = anchors.filter(anchor => anchor.confidence >= this.config.minConfidence);
    citation.updatedAt = new Date().toISOString();
    
    this.citations.set(citationId, citation);
    return true;
  }

  // Delete citation
  deleteCitation(citationId: string): boolean {
    return this.citations.delete(citationId);
  }

  // Get all citations
  getAllCitations(): Citation[] {
    return Array.from(this.citations.values());
  }

  // Check if text has any uncited claims
  hasUncitedClaims(text: string): boolean {
    if (!this.config.requireCitation) return false;
    
    const claims = this.extractClaims(text);
    return claims.some(claim => !claim.hasCitation);
  }

  // Get uncited claims from text
  getUncitedClaims(text: string): string[] {
    const claims = this.extractClaims(text);
    return claims
      .filter(claim => !claim.hasCitation)
      .map(claim => claim.claim);
  }

  // Generate citation markdown for display
  generateCitationMarkdown(text: string): string {
    const claims = this.extractClaims(text);
    let result = text;
    let citationCounter = 1;
    const citations: Citation[] = [];

    for (const claim of claims) {
      if (claim.hasCitation && claim.citation) {
        citations.push(claim.citation);
        result = result.replace(claim.claim, `${claim.claim} [${citationCounter}]`);
        citationCounter++;
      } else if (this.config.requireCitation) {
        // Mark uncited claims with warning
        result = result.replace(claim.claim, `${claim.claim} ⚠️`);
      }
    }

    // Add citation list at the end
    if (citations.length > 0) {
      result += '\n\n**Citations:**\n';
      citations.forEach((citation, index) => {
        result += `[${index + 1}] ${citation.claim}\n`;
        citation.anchors.forEach(anchor => {
          result += `   - ${anchor.fileName}, page ${anchor.pageNumber}\n`;
        });
      });
    }

    return result;
  }

  // Export citations to JSON
  exportCitations(): string {
    return JSON.stringify(Array.from(this.citations.values()), null, 2);
  }

  // Import citations from JSON
  importCitations(jsonData: string): boolean {
    try {
      const citations: Citation[] = JSON.parse(jsonData);
      for (const citation of citations) {
        this.citations.set(citation.id, citation);
      }
      return true;
    } catch (error) {
      console.error('Failed to import citations:', error);
      return false;
    }
  }

  // Clear all citations
  clearCitations(): void {
    this.citations.clear();
  }

  // Update configuration
  updateConfig(newConfig: Partial<CitationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): CitationConfig {
    return { ...this.config };
  }

  // Generate unique ID
  private generateId(): string {
    return `cite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get citation statistics
  getStats(): {
    totalCitations: number;
    verifiedCitations: number;
    unverifiedCitations: number;
    averageAnchorsPerCitation: number;
  } {
    const citations = Array.from(this.citations.values());
    const verified = citations.filter(c => c.verified).length;
    const totalAnchors = citations.reduce((sum, c) => sum + c.anchors.length, 0);
    
    return {
      totalCitations: citations.length,
      verifiedCitations: verified,
      unverifiedCitations: citations.length - verified,
      averageAnchorsPerCitation: citations.length > 0 ? totalAnchors / citations.length : 0
    };
  }
}

