// app/api/chat/route.ts
// API route for assistant chat responses

import { NextRequest, NextResponse } from 'next/server';

import { generateChatResponse } from '@/app/lib/services/geminiService';
import type { ChatHistoryMessage } from '@/app/types/chat';

interface ChatRequestBody {
  message: string;
  hasFile?: boolean;
  fileName?: string | null;
  history?: ChatHistoryMessage[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;

    const message = body?.message?.trim();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const reply = await generateChatResponse({
      message,
      hasFile: Boolean(body.hasFile),
      fileName: body.fileName ?? null,
      history: Array.isArray(body.history) ? body.history : [],
    });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('❌ Chat API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate response',
      },
      { status: 500 }
    );
  }
}
