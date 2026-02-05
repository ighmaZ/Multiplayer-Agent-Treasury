// app/api/agents/stream/route.ts
// Streaming API route for real-time agent workflow with SSE

import { NextRequest } from 'next/server';
import { AgentState, createInitialState, ThinkingLog, createThinkingLog } from '@/app/lib/agents/state';
import { extractInvoiceFromPDF, streamInvoiceExtraction, streamCFORecommendation } from '@/app/lib/services/geminiService';
import { scanWalletAddress } from '@/app/lib/services/etherscanService';

/**
 * Send SSE event through controller
 */
function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  const encoder = new TextEncoder();
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(message));
}

/**
 * Create a throttled event sender to reduce UI flickering
 * Only sends updates every intervalMs or when content grows significantly
 */
function createThrottledSender(
  controller: ReadableStreamDefaultController,
  intervalMs: number = 100
) {
  let lastSentTime = 0;
  let lastSentLength = 0;
  
  return (event: string, data: unknown, forceUpdate: boolean = false) => {
    const now = Date.now();
    const currentLength = typeof data === 'object' && data !== null && 'reasoning' in data 
      ? (data as { reasoning: string }).reasoning.length 
      : 0;
    
    // Send if: forced, time elapsed, or content grew significantly (50+ chars)
    if (forceUpdate || 
        (now - lastSentTime >= intervalMs) || 
        (currentLength - lastSentLength >= 50)) {
      sendEvent(controller, event, data);
      lastSentTime = now;
      lastSentLength = currentLength;
    }
  };
}

/**
 * PDF Processor with REAL LLM streaming
 */
async function pdfProcessorWithStream(
  state: AgentState,
  controller: ReadableStreamDefaultController
): Promise<AgentState> {
  console.log('📄 PDF Processor Node: Starting real LLM streaming extraction...');

  try {
    if (!state.pdfBuffer) {
      throw new Error('No PDF buffer provided');
    }

    // Send initial status
    sendEvent(controller, 'thinking', createThinkingLog(
      'pdfProcessor',
      'thinking',
      'Starting PDF analysis...',
      { progress: 5 }
    ));

    let accumulatedReasoning = '';
    let invoiceData = null;
    
    // Create throttled sender for smoother UI updates
    const throttledSend = createThrottledSender(controller, 100);

    // Stream real LLM reasoning
    for await (const chunk of streamInvoiceExtraction(state.pdfBuffer, state.fileName)) {
      if (chunk.type === 'reasoning') {
        accumulatedReasoning += chunk.content;
        
        // Send throttled updates to reduce UI flickering
        throttledSend('thinking', createThinkingLog(
          'pdfProcessor',
          'processing',
          accumulatedReasoning,
          { 
            progress: Math.min(90, 10 + (accumulatedReasoning.length / 20))
          }
        ));
      } else if (chunk.type === 'result') {
        invoiceData = chunk.content;
      }
    }
    
    // Send final accumulated state
    sendEvent(controller, 'thinking', createThinkingLog(
      'pdfProcessor',
      'processing',
      accumulatedReasoning,
      { progress: 95 }
    ));

    if (!invoiceData || typeof invoiceData === 'string') {
      throw new Error('Failed to extract invoice data');
    }

    // Validate address
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(invoiceData.walletAddress);
    if (!isValidAddress) {
      throw new Error(`Invalid Ethereum address format: ${invoiceData.walletAddress}`);
    }

    // Send success
    sendEvent(controller, 'thinking', createThinkingLog(
      'pdfProcessor',
      'success',
      `Extraction complete! Found wallet ${invoiceData.walletAddress.substring(0, 10)}...`,
      {
        progress: 100,
        data: {
          walletAddress: invoiceData.walletAddress,
          amount: invoiceData.amount,
          recipient: invoiceData.recipient,
          purpose: invoiceData.purpose,
        }
      }
    ));

    console.log('✅ PDF Processor Node: Extraction complete');

    return {
      ...state,
      invoiceData,
      currentStep: 'scanning',
    };

  } catch (error) {
    console.error('❌ PDF Processor Node Error:', error);

    sendEvent(controller, 'thinking', createThinkingLog(
      'pdfProcessor',
      'error',
      `Error during extraction: ${error instanceof Error ? error.message : 'Unknown error'}`,
    ));

    return {
      ...state,
      currentStep: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Wallet Scanner with streaming
 */
async function walletScannerWithStream(
  state: AgentState,
  controller: ReadableStreamDefaultController
): Promise<AgentState> {
  console.log('🔍 Wallet Scanner Node: Starting security scan...');

  try {
    if (!state.invoiceData?.walletAddress) {
      throw new Error('No wallet address available for scanning');
    }

    const walletAddress = state.invoiceData.walletAddress;

    // Send initial thinking state
    sendEvent(controller, 'thinking', createThinkingLog(
      'walletScanner',
      'thinking',
      `Initiating security scan on wallet address ${walletAddress.substring(0, 12)}... Checking blockchain history, contract verification status, and known risk indicators.`,
      { progress: 15 }
    ));

    await new Promise(resolve => setTimeout(resolve, 700));

    sendEvent(controller, 'thinking', createThinkingLog(
      'walletScanner',
      'processing',
      'Querying Etherscan API for transaction history, contract details, and any security labels or tags associated with this address...',
      { progress: 40 }
    ));

    const securityScan = await scanWalletAddress(walletAddress);

    await new Promise(resolve => setTimeout(resolve, 400));

    const riskEmoji = securityScan.riskScore >= 70 ? 'High' : securityScan.riskScore >= 40 ? 'Medium' : 'Low';

    sendEvent(controller, 'thinking', createThinkingLog(
      'walletScanner',
      'processing',
      `Analysis complete. Risk assessment: ${riskEmoji} (${securityScan.riskScore}/100). Checking for ${securityScan.warnings.length} warning flags and contract verification status...`,
      {
        progress: 75,
        details: [
          `Risk Score: ${securityScan.riskScore}/100 (${riskEmoji})`,
          `Transactions: ${securityScan.transactionCount}`,
          `Contract: ${securityScan.isContract ? (securityScan.isVerified ? 'Verified ✓' : 'Unverified ⚠') : 'EOA'}`,
          ...(securityScan.warnings.length > 0 ? [`Warnings: ${securityScan.warnings.length} found`] : []),
        ]
      }
    ));

    await new Promise(resolve => setTimeout(resolve, 500));

    // Send success
    sendEvent(controller, 'thinking', createThinkingLog(
      'walletScanner',
      'success',
      `Security scan finalized. ${riskEmoji} risk profile confirmed. ${securityScan.warnings.length > 0 ? 'Multiple warnings detected - will factor into recommendation.' : 'No major red flags detected.'} Proceeding to CFO analysis...`,
      {
        progress: 100,
        data: securityScan
      }
    ));

    console.log('✅ Wallet Scanner Node: Scan complete');

    return {
      ...state,
      securityScan,
      currentStep: 'analyzing',
    };

  } catch (error) {
    console.error('❌ Wallet Scanner Node Error:', error);

    sendEvent(controller, 'thinking', createThinkingLog(
      'walletScanner',
      'error',
      `Security scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    ));

    return {
      ...state,
      currentStep: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * CFO Assistant with REAL LLM streaming
 */
async function cfoAssistantWithStream(
  state: AgentState,
  controller: ReadableStreamDefaultController
): Promise<AgentState> {
  console.log('🤖 CFO Assistant Node: Starting real LLM streaming analysis...');

  try {
    if (!state.invoiceData || !state.securityScan) {
      throw new Error('Missing required data for analysis');
    }

    // Send initial status
    sendEvent(controller, 'thinking', createThinkingLog(
      'cfoAssistant',
      'thinking',
      'Starting CFO analysis...',
      { progress: 5 }
    ));

    let accumulatedReasoning = '';
    let recommendation = null;
    
    // Create throttled sender for smoother UI updates
    const throttledSend = createThrottledSender(controller, 100);

    // Stream real LLM reasoning
    for await (const chunk of streamCFORecommendation(
      state.invoiceData,
      {
        riskScore: state.securityScan.riskScore,
        isContract: state.securityScan.isContract,
        isVerified: state.securityScan.isVerified,
        warnings: state.securityScan.warnings,
      }
    )) {
      if (chunk.type === 'reasoning') {
        accumulatedReasoning += chunk.content;
        
        // Send throttled updates to reduce UI flickering
        throttledSend('thinking', createThinkingLog(
          'cfoAssistant',
          'processing',
          accumulatedReasoning,
          { 
            progress: Math.min(90, 10 + (accumulatedReasoning.length / 20))
          }
        ));
      } else if (chunk.type === 'result') {
        recommendation = chunk.content;
      }
    }
    
    // Send final accumulated state
    sendEvent(controller, 'thinking', createThinkingLog(
      'cfoAssistant',
      'processing',
      accumulatedReasoning,
      { progress: 95 }
    ));

    if (!recommendation || typeof recommendation === 'string') {
      throw new Error('Failed to generate recommendation');
    }

    // Send success
    sendEvent(controller, 'thinking', createThinkingLog(
      'cfoAssistant',
      'success',
      `Analysis complete: ${recommendation.recommendation}`,
      {
        progress: 100,
        data: recommendation
      }
    ));

    // Send complete event
    sendEvent(controller, 'complete', {
      ...state,
      recommendation,
      currentStep: 'complete',
    });

    console.log('✅ CFO Assistant Node: Recommendation generated');

    return {
      ...state,
      recommendation,
      currentStep: 'complete',
    };

  } catch (error) {
    console.error('❌ CFO Assistant Node Error:', error);

    sendEvent(controller, 'thinking', createThinkingLog(
      'cfoAssistant',
      'error',
      `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    ));

    return {
      ...state,
      currentStep: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * POST handler for streaming agent workflow
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (file.type !== 'application/pdf') {
      return new Response(
        JSON.stringify({ error: 'File must be a PDF' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File size must be less than 10MB' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Create stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let state = createInitialState(pdfBuffer, file.name);

          // Run workflow with streaming
          state = await pdfProcessorWithStream(state, controller);

          if (state.currentStep === 'error') {
            sendEvent(controller, 'error', { error: state.error });
            controller.close();
            return;
          }

          state = await walletScannerWithStream(state, controller);

          if (state.currentStep === 'error') {
            sendEvent(controller, 'error', { error: state.error });
            controller.close();
            return;
          }

          state = await cfoAssistantWithStream(state, controller);

          if (state.currentStep === 'error') {
            sendEvent(controller, 'error', { error: state.error });
          }

        } catch (error) {
          console.error('Streaming error:', error);
          sendEvent(controller, 'error', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
