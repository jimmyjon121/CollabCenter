// PDF Parser with pdf-parse wrapper and security sanitization
import * as fs from 'fs/promises';
import * as path from 'path';

// Dynamic import for pdf-parse to handle optional dependency
let pdfParse: any = null;
try {
  pdfParse = require('pdf-parse');
} catch (error) {
  console.log('PDF parsing disabled - install pdf-parse to enable');
}

export interface PDFPage {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pages: number;
  fileSize: number;
  fileName: string;
}

export interface ParsedPDF {
  metadata: PDFMetadata;
  pages: PDFPage[];
  rawText: string;
  hash: string;
}

export class PDFParser {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly ALLOWED_EXTENSIONS = ['.pdf'];
  private static readonly DANGEROUS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
    /<link[^>]*>.*?<\/link>/gi,
    /<meta[^>]*>.*?<\/meta>/gi,
    /<style[^>]*>.*?<\/style>/gi
  ];

  static isAvailable(): boolean {
    return pdfParse !== null;
  }

  static async parsePDF(filePath: string): Promise<ParsedPDF> {
    if (!this.isAvailable()) {
      throw new Error('PDF parsing not available - install pdf-parse');
    }

    // Validate file
    await this.validateFile(filePath);

    // Read file
    const fileBuffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);
    
    // Parse PDF
    const pdfData = await pdfParse(fileBuffer, {
      max: 0, // Parse all pages
      version: 'v1.10.100' // Use specific version for consistency
    });

    // Extract metadata
    const metadata: PDFMetadata = {
      title: this.sanitizeString(pdfData.info?.Title),
      author: this.sanitizeString(pdfData.info?.Author),
      subject: this.sanitizeString(pdfData.info?.Subject),
      creator: this.sanitizeString(pdfData.info?.Creator),
      producer: this.sanitizeString(pdfData.info?.Producer),
      creationDate: pdfData.info?.CreationDate ? new Date(pdfData.info.CreationDate) : undefined,
      modificationDate: pdfData.info?.ModDate ? new Date(pdfData.info.ModDate) : undefined,
      pages: pdfData.numpages,
      fileSize: stats.size,
      fileName: path.basename(filePath)
    };

    // Split into pages and sanitize
    const pages: PDFPage[] = [];
    const pageTexts = this.splitIntoPages(pdfData.text, pdfData.numpages);
    
    for (let i = 0; i < pageTexts.length; i++) {
      pages.push({
        pageNumber: i + 1,
        text: this.sanitizeText(pageTexts[i]),
        width: 612, // Standard PDF page width
        height: 792  // Standard PDF page height
      });
    }

    // Generate content hash for reproducibility
    const hash = this.generateContentHash(pdfData.text);

    return {
      metadata,
      pages,
      rawText: this.sanitizeText(pdfData.text),
      hash
    };
  }

  private static async validateFile(filePath: string): Promise<void> {
    // Check file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`PDF file not found: ${filePath}`);
    }

    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`Invalid file type: ${ext}. Only PDF files are supported.`);
    }

    // Check file size
    const stats = await fs.stat(filePath);
    if (stats.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large: ${stats.size} bytes. Maximum size is ${this.MAX_FILE_SIZE} bytes.`);
    }
  }

  private static splitIntoPages(text: string, numPages: number): string[] {
    // Simple page splitting - in practice, you might want more sophisticated logic
    const words = text.split(/\s+/);
    const wordsPerPage = Math.ceil(words.length / numPages);
    const pages: string[] = [];

    for (let i = 0; i < numPages; i++) {
      const start = i * wordsPerPage;
      const end = Math.min(start + wordsPerPage, words.length);
      pages.push(words.slice(start, end).join(' '));
    }

    return pages;
  }

  private static sanitizeText(text: string): string {
    if (!text) return '';

    let sanitized = text;

    // Remove dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return sanitized;
  }

  private static sanitizeString(str: any): string | undefined {
    if (typeof str !== 'string') return undefined;
    return this.sanitizeText(str);
  }

  private static generateContentHash(text: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  static async extractTextFromPage(pdfPath: string, pageNumber: number): Promise<string> {
    const parsed = await this.parsePDF(pdfPath);
    const page = parsed.pages.find(p => p.pageNumber === pageNumber);
    return page ? page.text : '';
  }

  static async getPageCount(pdfPath: string): Promise<number> {
    const parsed = await this.parsePDF(pdfPath);
    return parsed.metadata.pages;
  }
}

