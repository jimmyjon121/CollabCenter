// PDF Chunking and Storage System
import * as fs from 'fs/promises';
import * as path from 'path';
import { PDFParser, ParsedPDF } from './parser';

export interface PDFChunk {
  id: string;
  content: string;
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  tokenCount: number;
  fileHash: string;
  fileName: string;
  metadata: {
    chunkIndex: number;
    totalChunks: number;
    overlapTokens: number;
  };
}

export interface PDFAnchor {
  fileHash: string;
  fileName: string;
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  text: string;
}

export interface StoredPDF {
  hash: string;
  fileName: string;
  metadata: any;
  chunks: PDFChunk[];
  anchors: PDFAnchor[];
  createdAt: string;
  updatedAt: string;
}

export class PDFChunker {
  private static readonly CHUNK_SIZE_TOKENS = 768; // Target chunk size
  private static readonly OVERLAP_TOKENS = 153; // 20% overlap
  private static readonly MIN_CHUNK_SIZE = 256; // Minimum chunk size
  private static readonly MAX_CHUNK_SIZE = 1024; // Maximum chunk size

  static async chunkPDF(pdfPath: string): Promise<StoredPDF> {
    if (!PDFParser.isAvailable()) {
      throw new Error('PDF parsing not available');
    }

    // Parse PDF
    const parsedPDF = await PDFParser.parsePDF(pdfPath);
    
    // Create chunks
    const chunks = await this.createChunks(parsedPDF);
    
    // Extract anchors
    const anchors = this.extractAnchors(parsedPDF, chunks);
    
    // Create stored PDF object
    const storedPDF: StoredPDF = {
      hash: parsedPDF.hash,
      fileName: parsedPDF.metadata.fileName,
      metadata: parsedPDF.metadata,
      chunks,
      anchors,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return storedPDF;
  }

  private static async createChunks(parsedPDF: ParsedPDF): Promise<PDFChunk[]> {
    const chunks: PDFChunk[] = [];
    let chunkIndex = 0;

    for (const page of parsedPDF.pages) {
      const pageChunks = this.chunkPageText(page, parsedPDF.hash, parsedPDF.metadata.fileName, chunkIndex);
      chunks.push(...pageChunks);
      chunkIndex += pageChunks.length;
    }

    return chunks;
  }

  private static chunkPageText(page: any, fileHash: string, fileName: string, startChunkIndex: number): PDFChunk[] {
    const chunks: PDFChunk[] = [];
    const text = page.text;
    const words = text.split(/\s+/);
    
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let startOffset = 0;
    let chunkIndex = startChunkIndex;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordTokens = this.estimateTokenCount(word);
      
      // If adding this word would exceed max chunk size, finalize current chunk
      if (currentTokens + wordTokens > this.MAX_CHUNK_SIZE && currentChunk.length > 0) {
        const chunk = this.createChunk(
          currentChunk.join(' '),
          page.pageNumber,
          startOffset,
          startOffset + currentChunk.join(' ').length,
          fileHash,
          fileName,
          chunkIndex,
          chunks.length
        );
        
        if (chunk.tokenCount >= this.MIN_CHUNK_SIZE) {
          chunks.push(chunk);
          chunkIndex++;
        }

        // Start new chunk with overlap
        const overlapWords = this.getOverlapWords(currentChunk);
        currentChunk = overlapWords;
        currentTokens = this.estimateTokenCount(overlapWords.join(' '));
        startOffset += currentChunk.join(' ').length - overlapWords.join(' ').length;
      }

      currentChunk.push(word);
      currentTokens += wordTokens;

      // If we've reached target size, create chunk
      if (currentTokens >= this.CHUNK_SIZE_TOKENS) {
        const chunk = this.createChunk(
          currentChunk.join(' '),
          page.pageNumber,
          startOffset,
          startOffset + currentChunk.join(' ').length,
          fileHash,
          fileName,
          chunkIndex,
          chunks.length
        );
        
        if (chunk.tokenCount >= this.MIN_CHUNK_SIZE) {
          chunks.push(chunk);
          chunkIndex++;
        }

        // Start new chunk with overlap
        const overlapWords = this.getOverlapWords(currentChunk);
        currentChunk = overlapWords;
        currentTokens = this.estimateTokenCount(overlapWords.join(' '));
        startOffset += currentChunk.join(' ').length - overlapWords.join(' ').length;
      }
    }

    // Handle remaining text
    if (currentChunk.length > 0) {
      const chunk = this.createChunk(
        currentChunk.join(' '),
        page.pageNumber,
        startOffset,
        startOffset + currentChunk.join(' ').length,
        fileHash,
        fileName,
        chunkIndex,
        chunks.length
      );
      
      if (chunk.tokenCount >= this.MIN_CHUNK_SIZE) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  private static createChunk(
    content: string,
    pageNumber: number,
    startOffset: number,
    endOffset: number,
    fileHash: string,
    fileName: string,
    chunkIndex: number,
    totalChunks: number
  ): PDFChunk {
    const tokenCount = this.estimateTokenCount(content);
    
    return {
      id: `${fileHash}-${chunkIndex}`,
      content: content.trim(),
      pageNumber,
      startOffset,
      endOffset,
      tokenCount,
      fileHash,
      fileName,
      metadata: {
        chunkIndex,
        totalChunks,
        overlapTokens: this.OVERLAP_TOKENS
      }
    };
  }

  private static getOverlapWords(words: string[]): string[] {
    const overlapCount = Math.floor(this.OVERLAP_TOKENS / 2); // Rough word count for overlap
    return words.slice(-overlapCount);
  }

  private static estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private static extractAnchors(parsedPDF: ParsedPDF, chunks: PDFChunk[]): PDFAnchor[] {
    const anchors: PDFAnchor[] = [];

    for (const chunk of chunks) {
      // Create anchor for each chunk
      anchors.push({
        fileHash: chunk.fileHash,
        fileName: chunk.fileName,
        pageNumber: chunk.pageNumber,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        text: chunk.content.substring(0, 100) + '...' // Preview text
      });
    }

    return anchors;
  }

  static async savePDF(storedPDF: StoredPDF, outputDir: string): Promise<string> {
    const fileName = `${storedPDF.hash}.json`;
    const filePath = path.join(outputDir, fileName);
    
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(storedPDF, null, 2));
    
    return filePath;
  }

  static async loadPDF(filePath: string): Promise<StoredPDF> {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  }

  static async searchChunks(storedPDF: StoredPDF, query: string): Promise<PDFChunk[]> {
    const queryLower = query.toLowerCase();
    
    return storedPDF.chunks.filter(chunk => 
      chunk.content.toLowerCase().includes(queryLower)
    );
  }

  static async getChunkById(storedPDF: StoredPDF, chunkId: string): Promise<PDFChunk | undefined> {
    return storedPDF.chunks.find(chunk => chunk.id === chunkId);
  }

  static async getChunksByPage(storedPDF: StoredPDF, pageNumber: number): Promise<PDFChunk[]> {
    return storedPDF.chunks.filter(chunk => chunk.pageNumber === pageNumber);
  }
}

