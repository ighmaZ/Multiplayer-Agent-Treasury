// components/chat/ChatMessages.tsx
// Chat transcript UI for user/assistant messages

'use client';

import React from 'react';

import type { ChatMessage } from '@/app/types/chat';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping?: boolean;
}

function TypingIndicator(): React.JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" />
    </div>
  );
}

export function ChatMessages({ messages, isTyping }: Readonly<ChatMessagesProps>): React.JSX.Element {
  return (
    <div className="space-y-3">
      {messages.map(message => {
        const isUser = message.role === 'user';
        return (
          <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ring-1
                ${isUser
                  ? 'bg-zinc-900 text-white ring-zinc-900/10'
                  : 'bg-white text-zinc-800 ring-zinc-200/70'
                }
              `}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        );
      })}

      {isTyping && (
        <div className="flex justify-start">
          <div className="rounded-2xl bg-white px-4 py-2.5 text-sm text-zinc-600 shadow-sm ring-1 ring-zinc-200/70">
            <TypingIndicator />
          </div>
        </div>
      )}
    </div>
  );
}
