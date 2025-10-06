import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// Initialize OpenRouter client
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// Available models
export const AI_MODELS = {
  GEMINI_FLASH: 'google/gemini-2.5-flash-lite',
  CLAUDE_SONNET: 'anthropic/claude-3.5-sonnet',
  CLAUDE_HAIKU: 'anthropic/claude-3-haiku',
  GPT4_TURBO: 'openai/gpt-4-turbo',
  GPT4: 'openai/gpt-4',
  LLAMA_70B: 'meta-llama/llama-3.1-70b-instruct',
} as const;

// Default model for code generation
export const DEFAULT_MODEL = AI_MODELS.GEMINI_FLASH;

// Model configurations
export const MODEL_CONFIGS = {
  [AI_MODELS.GEMINI_FLASH]: {
    maxTokens: 8192,
    temperature: 0.1,
    topP: 0.9,
  },
  [AI_MODELS.CLAUDE_SONNET]: {
    maxTokens: 4096,
    temperature: 0.1,
    topP: 0.9,
  },
  [AI_MODELS.CLAUDE_HAIKU]: {
    maxTokens: 2048,
    temperature: 0.1,
    topP: 0.9,
  },
  [AI_MODELS.GPT4_TURBO]: {
    maxTokens: 4096,
    temperature: 0.1,
    topP: 0.9,
  },
  [AI_MODELS.GPT4]: {
    maxTokens: 2048,
    temperature: 0.1,
    topP: 0.9,
  },
  [AI_MODELS.LLAMA_70B]: {
    maxTokens: 2048,
    temperature: 0.1,
    topP: 0.9,
  },
} as const;

// Get model configuration
export function getModelConfig(model: string) {
  return MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS] || MODEL_CONFIGS[DEFAULT_MODEL];
}
