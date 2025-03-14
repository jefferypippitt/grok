import { xai } from '@ai-sdk/xai';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Make sure to set the XAI_API_KEY environment variable
  const result = streamText({
    model: xai('grok-2-1212'), // Using the latest Grok model
    system: 'You are a helpful assistant powered by Grok. You provide accurate, helpful, and friendly responses.',
    messages,
  });

  return result.toDataStreamResponse();
} 