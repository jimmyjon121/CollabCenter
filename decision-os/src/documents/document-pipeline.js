// Document Pipeline - Ingestion, chunking, and retrieval
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { parse as csvParse } from 'csv-parse/sync';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { encoding_for_model } from 'tiktoken';
import { logger } from '../utils/logger.js';

export class DocumentPipeline {
  constructor(config = {}) {
    this.config = {
      chunkSize: 1000, // tokens
      chunkOverlap: 200, // tokens
      minChunkSize: 100,
      maxChunkSize: 2000,
      enableOCR: false,
      supportedFormats: ['.pdf', '.docx', '.doc', '.txt', '.md', '.csv'],
      ...config
    };
    
    this.tokenizer = encoding_for_model('gpt-4');
    this.documents = new Map();
    this.chunks = new Map();
  }

  async ingest(filePath, metadata = {}) {
    const startTime = Date.now();
    logger.info(`Ingesting document: ${filePath}`);

    try {
      // Determine file type
      const ext = this.getFileExtension(filePath);
      if (!this.config.supportedFormats.includes(ext)) {
        throw new Error(`Unsupported file format: ${ext}`);
      }

      // Parse document
      const content = await this.parseDocument(filePath, ext);
      
      // Create document record
      const documentId = uuidv4();
      const document = {
        id: documentId,
        path: filePath,
        name: this.getFileName(filePath),
        format: ext,
        content: content.text,
        metadata: {
          ...metadata,
          ...content.metadata,
          pages: content.pages || 1,
          wordCount: this.countWords(content.text),
          hash: this.hashContent(content.text),
          ingestedAt: Date.now(),
          processingTime: Date.now() - startTime
        },
        chunks: []
      };

      // Chunk document
      const chunks = await this.chunkDocument(document);
      document.chunks = chunks.map(c => c.id);

      // Store document and chunks
      this.documents.set(documentId, document);
      chunks.forEach(chunk => {
        this.chunks.set(chunk.id, chunk);
      });

      logger.info(`Document ingested: ${documentId} (${chunks.length} chunks, ${Date.now() - startTime}ms)`);
      
      return {
        documentId,
        document,
        chunks: chunks.length,
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      logger.error(`Document ingestion failed: ${error.message}`);
      throw error;
    }
  }

  async parseDocument(filePath, format) {
    const buffer = await readFile(filePath);
    
    switch (format) {
      case '.pdf':
        return await this.parsePDF(buffer);
      case '.docx':
      case '.doc':
        return await this.parseWord(buffer);
      case '.txt':
      case '.md':
        return this.parseText(buffer);
      case '.csv':
        return this.parseCSV(buffer);
      default:
        throw new Error(`Parser not implemented for ${format}`);
    }
  }

  async parsePDF(buffer) {
    try {
      const data = await pdfParse(buffer);
      
      // Extract metadata
      const metadata = {
        author: data.info?.Author,
        title: data.info?.Title,
        subject: data.info?.Subject,
        keywords: data.info?.Keywords,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate,
        modificationDate: data.info?.ModDate,
        pages: data.numpages
      };

      // Extract text with page markers
      let textWithPages = '';
      if (data.pages) {
        data.pages.forEach((page, index) => {
          textWithPages += `\n[PAGE ${index + 1}]\n${page.text}\n`;
        });
      } else {
        textWithPages = data.text;
      }

      return {
        text: textWithPages,
        metadata,
        pages: data.numpages
      };
    } catch (error) {
      logger.error(`PDF parsing error: ${error.message}`);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  async parseWord(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      if (result.messages.length > 0) {
        logger.warn('Word parsing warnings:', result.messages);
      }

      return {
        text: result.value,
        metadata: {},
        pages: Math.ceil(result.value.length / 3000) // Rough estimate
      };
    } catch (error) {
      logger.error(`Word parsing error: ${error.message}`);
      throw new Error(`Failed to parse Word document: ${error.message}`);
    }
  }

  parseText(buffer) {
    const text = buffer.toString('utf-8');
    return {
      text,
      metadata: {},
      pages: Math.ceil(text.length / 3000)
    };
  }

  parseCSV(buffer) {
    try {
      const records = csvParse(buffer, {
        columns: true,
        skip_empty_lines: true
      });

      // Convert CSV to structured text
      const headers = Object.keys(records[0] || {});
      let text = `CSV Data with ${records.length} rows and ${headers.length} columns\n\n`;
      text += `Columns: ${headers.join(', ')}\n\n`;
      
      // Include sample rows
      const sampleSize = Math.min(10, records.length);
      text += `Sample data (first ${sampleSize} rows):\n`;
      records.slice(0, sampleSize).forEach((row, i) => {
        text += `\nRow ${i + 1}:\n`;
        Object.entries(row).forEach(([key, value]) => {
          text += `  ${key}: ${value}\n`;
        });
      });

      // Add summary statistics if numeric columns exist
      const numericColumns = headers.filter(h => 
        records.some(r => !isNaN(parseFloat(r[h])))
      );
      
      if (numericColumns.length > 0) {
        text += `\n\nNumeric columns summary:\n`;
        numericColumns.forEach(col => {
          const values = records.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
          if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            text += `  ${col}: min=${min}, max=${max}, avg=${avg.toFixed(2)}\n`;
          }
        });
      }

      return {
        text,
        metadata: {
          rows: records.length,
          columns: headers.length,
          headers: headers
        },
        pages: 1
      };
    } catch (error) {
      logger.error(`CSV parsing error: ${error.message}`);
      throw new Error(`Failed to parse CSV: ${error.message}`);
    }
  }

  async chunkDocument(document) {
    const chunks = [];
    const text = document.content;
    
    // Split by pages if available
    const pagePattern = /\[PAGE (\d+)\]/g;
    const pages = text.split(pagePattern);
    
    let currentPage = 1;
    let globalOffset = 0;
    
    for (let i = 0; i < pages.length; i++) {
      // Handle page markers
      if (i % 2 === 1) {
        currentPage = parseInt(pages[i]);
        continue;
      }
      
      const pageText = pages[i];
      if (!pageText.trim()) continue;
      
      // Chunk the page text
      const pageChunks = this.chunkText(pageText, currentPage, globalOffset);
      chunks.push(...pageChunks.map(chunk => ({
        ...chunk,
        documentId: document.id,
        documentName: document.name
      })));
      
      globalOffset += pageText.length;
    }

    // If no page markers, chunk entire document
    if (chunks.length === 0) {
      const docChunks = this.chunkText(text, 1, 0);
      chunks.push(...docChunks.map(chunk => ({
        ...chunk,
        documentId: document.id,
        documentName: document.name
      })));
    }

    return chunks;
  }

  chunkText(text, pageNumber = 1, globalOffset = 0) {
    const chunks = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let currentTokens = 0;
    let chunkStart = globalOffset;
    
    for (const sentence of sentences) {
      const sentenceTokens = this.countTokens(sentence);
      
      // Check if adding sentence exceeds chunk size
      if (currentTokens + sentenceTokens > this.config.chunkSize && currentChunk) {
        // Save current chunk
        chunks.push(this.createChunk(
          currentChunk,
          pageNumber,
          chunkStart,
          chunkStart + currentChunk.length
        ));
        
        // Start new chunk with overlap
        const overlap = this.getOverlapText(currentChunk, this.config.chunkOverlap);
        currentChunk = overlap + sentence;
        currentTokens = this.countTokens(currentChunk);
        chunkStart = chunkStart + currentChunk.length - overlap.length;
      } else {
        currentChunk += sentence + ' ';
        currentTokens += sentenceTokens;
      }
    }
    
    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(
        currentChunk,
        pageNumber,
        chunkStart,
        chunkStart + currentChunk.length
      ));
    }
    
    return chunks;
  }

  createChunk(text, pageNumber, startOffset, endOffset) {
    return {
      id: uuidv4(),
      text: text.trim(),
      page: pageNumber,
      startOffset,
      endOffset,
      tokens: this.countTokens(text),
      hash: this.hashContent(text),
      metadata: {
        sentences: this.splitIntoSentences(text).length,
        wordCount: this.countWords(text)
      }
    };
  }

  splitIntoSentences(text) {
    // Improved sentence splitting
    const sentenceEnders = /[.!?]+[\s\n]+/g;
    const sentences = text.split(sentenceEnders);
    
    // Handle edge cases
    return sentences.filter(s => s.trim().length > 0).map(s => {
      // Restore sentence enders if needed
      if (!s.match(/[.!?]$/)) {
        const nextChar = text[text.indexOf(s) + s.length];
        if (nextChar && '.!?'.includes(nextChar)) {
          return s + nextChar;
        }
      }
      return s;
    });
  }

  getOverlapText(text, overlapTokens) {
    const words = text.split(/\s+/);
    const targetWords = Math.ceil(overlapTokens / 1.3); // Rough token to word ratio
    return words.slice(-targetWords).join(' ');
  }

  countTokens(text) {
    try {
      return this.tokenizer.encode(text).length;
    } catch {
      // Fallback to rough estimate
      return Math.ceil(text.length / 4);
    }
  }

  countWords(text) {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  hashContent(content) {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  getFileExtension(filePath) {
    const parts = filePath.split('.');
    return '.' + parts[parts.length - 1].toLowerCase();
  }

  getFileName(filePath) {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1];
  }

  // Retrieval methods
  async findRelevantChunks(query, limit = 5, documentIds = null) {
    const queryTokens = this.tokenizer.encode(query.toLowerCase());
    const scores = [];
    
    for (const [chunkId, chunk] of this.chunks) {
      // Filter by document if specified
      if (documentIds && !documentIds.includes(chunk.documentId)) {
        continue;
      }
      
      // Simple keyword matching (to be replaced with embeddings)
      const chunkTokens = this.tokenizer.encode(chunk.text.toLowerCase());
      const score = this.calculateSimilarity(queryTokens, chunkTokens);
      
      scores.push({
        chunkId,
        chunk,
        score
      });
    }
    
    // Sort by score and return top chunks
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, limit).map(s => ({
      ...s.chunk,
      relevanceScore: s.score
    }));
  }

  calculateSimilarity(tokens1, tokens2) {
    // Simple Jaccard similarity (to be replaced with cosine similarity of embeddings)
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  getDocument(documentId) {
    return this.documents.get(documentId);
  }

  getChunk(chunkId) {
    return this.chunks.get(chunkId);
  }

  getDocumentChunks(documentId) {
    const document = this.documents.get(documentId);
    if (!document) return [];
    
    return document.chunks.map(chunkId => this.chunks.get(chunkId)).filter(Boolean);
  }

  // Export for debugging
  exportDocument(documentId, includeChunks = false) {
    const document = this.documents.get(documentId);
    if (!document) return null;
    
    const exported = { ...document };
    
    if (includeChunks) {
      exported.chunks = this.getDocumentChunks(documentId);
    }
    
    return exported;
  }

  clear() {
    this.documents.clear();
    this.chunks.clear();
  }
}

