// app/api/treasury/execute/route.ts
// POST endpoint to execute a treasury plan via Circle wallets
// Uses SSE streaming to report step-by-step progress

import { NextRequest } from 'next/server';
import { executeTreasuryPlan, TreasuryPlan, ExecutionStep } from '@/app/lib/services/treasuryManager';

function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  const encoder = new TextEncoder();
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(message));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { treasuryPlan } = body as { treasuryPlan: TreasuryPlan };

    if (!treasuryPlan) {
      return new Response(
        JSON.stringify({ error: 'Missing treasuryPlan in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!treasuryPlan.canExecute) {
      return new Response(
        JSON.stringify({ error: treasuryPlan.reason || 'Plan cannot be executed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream execution progress via SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial event
          sendEvent(controller, 'execution_start', {
            steps: treasuryPlan.steps,
            message: 'Execution started',
          });

          const result = await executeTreasuryPlan(
            treasuryPlan,
            (stepId: string, update: Partial<ExecutionStep>) => {
              sendEvent(controller, 'step_update', { stepId, ...update });
            }
          );

          if (result.success) {
            sendEvent(controller, 'execution_complete', {
              success: true,
              message: 'All steps completed successfully',
            });
          } else {
            sendEvent(controller, 'execution_error', {
              success: false,
              error: result.error,
            });
          }
        } catch (error) {
          console.error('Execution stream error:', error);
          sendEvent(controller, 'execution_error', {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown execution error',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Treasury Execute Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to execute transaction',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
