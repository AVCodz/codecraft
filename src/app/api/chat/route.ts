import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { openrouter, DEFAULT_MODEL, getModelConfig } from '@/lib/ai/openrouter';
import { SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { aiTools } from '@/lib/ai/tools';
import { createMessage, updateProject } from '@/lib/appwrite/database';
import { getCurrentUser } from '@/lib/appwrite/auth';
import { getSessionFromCookies } from '@/lib/appwrite/session';

export async function POST(req: NextRequest) {
  try {
    const { messages, projectId, userId, model = DEFAULT_MODEL } = await req.json();

    console.log('[Chat API] Request:', { projectId, userId, model, messageCount: messages.length });

    if (!userId || !projectId) {
      console.error('[Chat API] Missing fields:', { userId, projectId });
      return new Response('Missing required fields', { status: 400 });
    }

    const modelConfig = getModelConfig(model);

    // Create user message in database
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        try {
          await createMessage({
            projectId,
            userId,
            role: 'user',
            content: lastMessage.content,
            sequence: messages.length - 1,
          });
          console.log('[Chat API] User message saved');
        } catch (error) {
          console.error('[Chat API] Failed to save user message:', error);
        }
      }
    }

    // Stream AI response
    const result = await streamText({
      model: openrouter.languageModel(model),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      tools: {
        create_file: {
          description: aiTools.create_file.description,
          inputSchema: aiTools.create_file.parameters,
          execute: async (params: any) => {
            return aiTools.create_file.execute(params, { projectId });
          },
        },
        update_file: {
          description: aiTools.update_file.description,
          inputSchema: aiTools.update_file.parameters,
          execute: async (params: any) => {
            return aiTools.update_file.execute(params, { projectId });
          },
        },
        list_files: {
          description: aiTools.list_files.description,
          inputSchema: aiTools.list_files.parameters,
          execute: async (params: any) => {
            return aiTools.list_files.execute(params);
          },
        },
      },

      onFinish: async (result) => {
        try {
          // Save assistant message to database
          await createMessage({
            projectId,
            userId,
            role: 'assistant',
            content: result.text,
            metadata: {
              model,
              tokens: result.usage?.totalTokens,
              duration: Date.now(),
            },
            sequence: messages.length,
          });

          // Update project's lastMessageAt
          await updateProject(projectId, {
            lastMessageAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Error saving assistant message:', error);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('[Chat API] Error:', error);
    console.error('[Chat API] Error details:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
