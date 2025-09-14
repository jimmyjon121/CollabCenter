// Decision OS - Main Entry Point
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { config } from 'dotenv';
import { Orchestrator } from './engine/orchestrator.js';
import { DocumentPipeline } from './documents/document-pipeline.js';
import { FinancialEngine } from './financial/financial-engine.js';
import { BoardPacketGenerator } from './outputs/board-packet-generator.js';
import { setupDatabase } from './db/setup.js';
import { logger } from './utils/logger.js';

// Load environment variables
config();

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please set them in your .env file');
  process.exit(1);
}

// Initialize Fastify
const app = Fastify({
  logger: true,
  bodyLimit: 50 * 1024 * 1024, // 50MB for file uploads
});

// Register plugins
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
});

await app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'change-this-secret-in-production'
});

await app.register(websocket);

// Initialize core services
const orchestrator = new Orchestrator({
  defaultBudgetUSD: parseFloat(process.env.DEFAULT_BUDGET || '5.00'),
  killSwitchThreshold: parseFloat(process.env.KILL_SWITCH_THRESHOLD || '0.95')
});

const documentPipeline = new DocumentPipeline();
const financialEngine = new FinancialEngine();
const boardPacketGenerator = new BoardPacketGenerator();

// Health check
app.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    timestamp: Date.now(),
    services: {
      orchestrator: 'ready',
      documents: 'ready',
      financial: 'ready'
    }
  };
});

// Session endpoints
app.post('/api/sessions', async (request, reply) => {
  try {
    const session = await orchestrator.createSession({
      userId: request.user?.id || 'anonymous',
      workspaceId: request.body.workspaceId || 'default',
      agents: request.body.agents,
      budget: request.body.budget,
      template: request.body.template,
      documents: request.body.documents
    });
    
    return {
      success: true,
      session: {
        id: session.id,
        status: session.status,
        config: session.config,
        metrics: session.metrics
      }
    };
  } catch (error) {
    logger.error('Session creation failed:', error);
    reply.code(500);
    return { success: false, error: error.message };
  }
});

app.get('/api/sessions/:sessionId', async (request, reply) => {
  const session = orchestrator.sessions.get(request.params.sessionId);
  if (!session) {
    reply.code(404);
    return { error: 'Session not found' };
  }
  return session;
});

// Discussion endpoint
app.post('/api/sessions/:sessionId/discuss', async (request, reply) => {
  try {
    const result = await orchestrator.runDiscussion(
      request.params.sessionId,
      request.body.prompt,
      request.body.options
    );
    
    return {
      success: true,
      session: result
    };
  } catch (error) {
    logger.error('Discussion failed:', error);
    reply.code(500);
    return { success: false, error: error.message };
  }
});

// Document upload
app.post('/api/documents/upload', async (request, reply) => {
  const parts = request.parts();
  const documents = [];
  
  for await (const part of parts) {
    if (part.file) {
      // Save file temporarily
      const buffer = await part.file.toBuffer();
      const tempPath = `/tmp/${part.filename}`;
      await require('fs').promises.writeFile(tempPath, buffer);
      
      // Ingest document
      const result = await documentPipeline.ingest(tempPath, {
        originalName: part.filename,
        uploadedBy: request.user?.id || 'anonymous'
      });
      
      documents.push(result);
    }
  }
  
  return {
    success: true,
    documents
  };
});

// Financial modeling
app.post('/api/financial/proforma', async (request, reply) => {
  try {
    const proForma = await financialEngine.buildProForma(request.body);
    return {
      success: true,
      proForma
    };
  } catch (error) {
    logger.error('Pro forma generation failed:', error);
    reply.code(500);
    return { success: false, error: error.message };
  }
});

// Board packet generation
app.post('/api/sessions/:sessionId/board-packet', async (request, reply) => {
  try {
    const packet = await orchestrator.generateBoardPacket(request.params.sessionId);
    return {
      success: true,
      packet
    };
  } catch (error) {
    logger.error('Board packet generation failed:', error);
    reply.code(500);
    return { success: false, error: error.message };
  }
});

// WebSocket for real-time updates
app.get('/ws', { websocket: true }, (connection, req) => {
  connection.socket.on('message', message => {
    const data = JSON.parse(message.toString());
    
    switch (data.type) {
      case 'subscribe':
        // Subscribe to session events
        const sessionId = data.sessionId;
        
        orchestrator.on('agent:responded', (event) => {
          if (event.sessionId === sessionId) {
            connection.socket.send(JSON.stringify({
              type: 'agent:responded',
              data: event
            }));
          }
        });
        
        orchestrator.on('budget:warning', (event) => {
          if (event.sessionId === sessionId) {
            connection.socket.send(JSON.stringify({
              type: 'budget:warning',
              data: event
            }));
          }
        });
        
        connection.socket.send(JSON.stringify({
          type: 'subscribed',
          sessionId
        }));
        break;
        
      case 'interject':
        orchestrator.requestInterjection(data.sessionId);
        break;
        
      case 'pause':
        orchestrator.pauseSession(data.sessionId);
        break;
        
      case 'resume':
        orchestrator.resumeSession(data.sessionId);
        break;
        
      case 'kill':
        orchestrator.killSession(data.sessionId);
        break;
    }
  });
});

// Session control endpoints
app.post('/api/sessions/:sessionId/pause', async (request, reply) => {
  orchestrator.pauseSession(request.params.sessionId);
  return { success: true };
});

app.post('/api/sessions/:sessionId/resume', async (request, reply) => {
  orchestrator.resumeSession(request.params.sessionId);
  return { success: true };
});

app.post('/api/sessions/:sessionId/kill', async (request, reply) => {
  orchestrator.killSession(request.params.sessionId);
  return { success: true };
});

// Usage and billing
app.get('/api/sessions/:sessionId/usage', async (request, reply) => {
  const report = orchestrator.costGovernor.getUsageReport(request.params.sessionId);
  if (!report) {
    reply.code(404);
    return { error: 'Session not found' };
  }
  return report;
});

// Export endpoints
app.get('/api/sessions/:sessionId/export', async (request, reply) => {
  const format = request.query.format || 'pdf';
  const session = orchestrator.sessions.get(request.params.sessionId);
  
  if (!session) {
    reply.code(404);
    return { error: 'Session not found' };
  }
  
  // Generate export based on format
  let content;
  let contentType;
  
  switch (format) {
    case 'pdf':
      content = await boardPacketGenerator.generatePDF(session);
      contentType = 'application/pdf';
      break;
    case 'markdown':
      content = await boardPacketGenerator.generateMarkdown(session);
      contentType = 'text/markdown';
      break;
    case 'json':
      content = JSON.stringify(session, null, 2);
      contentType = 'application/json';
      break;
    default:
      reply.code(400);
      return { error: 'Invalid format' };
  }
  
  reply.type(contentType);
  reply.header('Content-Disposition', `attachment; filename="session-${session.id}.${format}"`);
  return content;
});

// Error handler
app.setErrorHandler((error, request, reply) => {
  logger.error('Unhandled error:', error);
  reply.code(500);
  return {
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  };
});

// Initialize database
async function initialize() {
  try {
    logger.info('Initializing database...');
    await setupDatabase();
    
    logger.info('Starting Decision OS server...');
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    
    logger.info(`Decision OS running on http://${host}:${port}`);
    logger.info('Configuration:');
    logger.info(`  Default Budget: $${process.env.DEFAULT_BUDGET || '5.00'}`);
    logger.info(`  Kill Switch: ${(parseFloat(process.env.KILL_SWITCH_THRESHOLD || '0.95') * 100).toFixed(0)}%`);
    logger.info(`  OpenAI: ${process.env.OPENAI_API_KEY ? '✓' : '✗'}`);
    logger.info(`  Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗'}`);
    logger.info(`  Gemini: ${process.env.GEMINI_API_KEY ? '✓' : '✗'}`);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await app.close();
  process.exit(0);
});

// Start the server
initialize();

// Export for programmatic use
export { orchestrator, documentPipeline, financialEngine, boardPacketGenerator };

