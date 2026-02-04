// lib/agents/graph.ts
// LangGraph workflow definition for CFO Agent

import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { AgentState, createInitialState } from './state';
import { pdfProcessorNode } from './nodes/pdfProcessor';
import { walletScannerNode } from './nodes/walletScanner';
import { cfoAssistantNode } from './nodes/cfoAssistant';

// Define state annotation using LangGraph's Annotation API
const AgentStateAnnotation = Annotation.Root({
  pdfBuffer: Annotation<Buffer | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
  fileName: Annotation<string>({
    value: (x, y) => y ?? x ?? '',
    default: () => '',
  }),
  currentStep: Annotation<string>({
    value: (x, y) => y ?? x ?? 'idle',
    default: () => 'idle',
  }),
  invoiceData: Annotation<any>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
  securityScan: Annotation<any>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
  recommendation: Annotation<any>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
  logs: Annotation<any[]>({
    value: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  error: Annotation<string | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
});

/**
 * Create the CFO Agent workflow graph
 * 
 * Workflow:
 * 1. PDF Processor → Extract invoice data
 * 2. Wallet Scanner → Check wallet security
 * 3. CFO Assistant → Generate recommendation
 */
export function createCFOAgentGraph() {
  // Define the state graph using Annotation with method chaining
  // Method chaining is required for TypeScript to correctly infer node names
  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode('pdfProcessor', async (state: any) => {
      return await pdfProcessorNode(state);
    })
    .addNode('walletScanner', async (state: any) => {
      return await walletScannerNode(state);
    })
    .addNode('cfoAssistant', async (state: any) => {
      return await cfoAssistantNode(state);
    })
    .addEdge(START, 'pdfProcessor')
    .addEdge('pdfProcessor', 'walletScanner')
    .addEdge('walletScanner', 'cfoAssistant')
    .addEdge('cfoAssistant', END);

  // Compile the graph
  return workflow.compile();
}

/**
 * Run the CFO agent workflow
 * @param pdfBuffer - The PDF file buffer
 * @param fileName - Name of the PDF file
 * @returns Final agent state with all results
 */
export async function runCFOAgent(
  pdfBuffer: Buffer,
  fileName: string
): Promise<AgentState> {
  console.log('🚀 Starting CFO Agent Workflow...');
  console.log(`📄 File: ${fileName}`);
  
  // Create the graph
  const graph = createCFOAgentGraph();
  
  // Create initial state
  const initialState = createInitialState(pdfBuffer, fileName);
  
  // Run the workflow
  const finalState = await graph.invoke(initialState);
  
  console.log('CFO Agent Workflow Complete');
  
  return finalState as AgentState;
}
