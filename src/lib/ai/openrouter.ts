/**
 * OpenRouter AI Configuration - AI model provider setup
 * Configures OpenRouter SDK for AI-powered code generation
 * Features: Gemini Flash model, streaming support, model configuration
 * Used in: Chat API route for AI responses and code generation
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Initialize OpenRouter client
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// Available models
export const AI_MODELS = {
  GEMINI_FLASH: "google/gemini-2.5-flash-lite",
  GLM: "z-ai/glm-4.6:exacto",
  CLAUDE_SONNET: "anthropic/claude-3.5-sonnet",
  CLAUDE_HAIKU: "anthropic/claude-haiku-4.5",
  GPT4_TURBO: "openai/gpt-4-turbo",
  GPT4: "openai/gpt-4",
  LLAMA_70B: "meta-llama/llama-3.1-70b-instruct",
} as const;

// Default model for code generation
export const DEFAULT_MODEL = AI_MODELS.GLM;

// Model configurations (no maxTokens - let models use their native limits)
export const MODEL_CONFIGS = {
  [AI_MODELS.GEMINI_FLASH]: {
    temperature: 0.1,
    topP: 0.9,
  },
  [AI_MODELS.CLAUDE_SONNET]: {
    temperature: 0.1,
    topP: 0.9,
  },
  [AI_MODELS.CLAUDE_HAIKU]: {
    temperature: 0.1,
    topP: 0.9,
  },
  [AI_MODELS.GPT4_TURBO]: {
    temperature: 0.1,
    topP: 0.9,
  },
  [AI_MODELS.GPT4]: {
    temperature: 0.1,
    topP: 0.9,
  },
  [AI_MODELS.LLAMA_70B]: {
    temperature: 0.1,
    topP: 0.9,
  },
  [AI_MODELS.GLM]: {
    temperature: 0.1,
    topP: 0.9,
  },
} as const;

// Get model configuration
export function getModelConfig(model: string) {
  return (
    MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS] ||
    MODEL_CONFIGS[DEFAULT_MODEL]
  );
}
