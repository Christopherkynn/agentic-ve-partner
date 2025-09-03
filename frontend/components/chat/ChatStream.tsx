"use client";
import type { FC } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { id: string; fileName: string; chunkIndex: number }[];
}

interface Props {
  messages: ChatMessage[];
}

const ChatStream: FC<Props> = ({ messages }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-2xl px-4 py-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'}`}>
            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {msg.citations.map(cit => (
                  <span key={cit.id} className="text-xs bg-white text-gray-700 border rounded px-1 py-0.5 cursor-pointer">
                    {cit.fileName}#{cit.chunkIndex}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatStream;