/**
 * OpenRouter API Service for StoryCrafter
 */
import { DEFAULT_WORD_LIMIT } from '../config/storyLimits';
import {
  buildCharacterDescriptionMessages,
  buildMemoryUpdateMessages,
  buildPremiseFromSetupMessages,
  buildStorySegmentMessages,
} from '../utils/storyPrompts';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const OPENROUTER_REFERER = 'https://github.com/google/antigravity';
const OPENROUTER_TITLE = 'StoryCrafter AI Co-Writer';

// Default model specified by the user
export const DEFAULT_MODEL = 'deepseek/deepseek-chat';

export const AVAILABLE_MODELS = [
  // --- DeepSeek ---
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (Chat)' },
  { id: 'deepseek/deepseek-coder', name: 'DeepSeek Coder V2' },
  
  // --- Anthropic ---
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },

  // --- OpenAI ---
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'openai/o1-preview', name: 'OpenAI o1 Preview' },
  { id: 'openai/o1-mini', name: 'OpenAI o1 Mini' },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },

  // --- Meta Llama ---
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B Instruct' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct' },
  { id: 'meta-llama/llama-3.2-3b-instruct', name: 'Llama 3.2 3B Instruct' },
  { id: 'meta-llama/llama-3.2-1b-instruct', name: 'Llama 3.2 1B Instruct' },
  { id: 'meta-llama/llama-3-8b-instruct', name: 'Llama 3 8B' },
  { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B' },

  // --- Google Gemini ---
  { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Exp)' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini 1.5 Pro' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash' },
  { id: 'google/gemini-flash-1.5-8b', name: 'Gemini 1.5 Flash 8B' },

  // --- Mistral ---
  { id: 'mistralai/mistral-large', name: 'Mistral Large 2' },
  { id: 'mistralai/mixtral-8x22b-instruct', name: 'Mixtral 8x22B' },
  { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B' },
  { id: 'mistralai/mistral-nemo', name: 'Mistral Nemo 12B' },

  // --- Qwen ---
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B' },
  { id: 'qwen/qwen-2.5-14b-instruct', name: 'Qwen 2.5 14B' },
  { id: 'qwen/qwen-2.5-7b-instruct', name: 'Qwen 2.5 7B' },
  { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B' },

  // --- Cohere ---
  { id: 'cohere/command-r-plus', name: 'Command R+' },
  { id: 'cohere/command-r', name: 'Command R' },

  // --- Microsoft ---
  { id: 'microsoft/phi-3-medium-128k-instruct', name: 'Phi 3 Medium 128k' },
  { id: 'microsoft/phi-3-mini-128k-instruct', name: 'Phi 3 Mini 128k' },

  // --- Creative / Roleplay Specials ---
  { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax L2 13B' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b', name: 'Hermes 3 Llama 3.1 405B' },
  { id: 'nousresearch/hermes-3-llama-3.1-70b', name: 'Hermes 3 Llama 3.1 70B' },
  { id: 'alpindale/goliath-120b', name: 'Goliath 120B' },
  { id: 'microsoft/wizardlm-2-8x22b', name: 'WizardLM-2 8x22B' },
  { id: 'sao/llama-3-yente-11b', name: 'Llama 3 Yente 11B (Creative)' },
  { id: 'undi95/toppy-m-7b', name: 'Toppy M 7B (Creative)' },
  { id: 'sao/soliloquy-l3-8b', name: 'Soliloquy L3 8B (Roleplay)' },
  { id: 'sophosympatheia/rogue-rose-103b-v0.2', name: 'Rogue Rose 103B' },
  { id: 'intel/neural-chat-7b-v3-3', name: 'Neural Chat 7B' },
  { id: 'pygmalionai/mythalion-13b', name: 'Mythalion 13B (Roleplay)' },
  { id: 'koboldai/psyfighter-13b', name: 'Psyfighter 13B (Creative)' },
  { id: 'openchat/openchat-7b', name: 'OpenChat 7B' }
];

function requireApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('OpenRouter API key is missing. Please set it in the Settings panel.');
  }
}

function buildOpenRouterHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': OPENROUTER_REFERER,
    'X-Title': OPENROUTER_TITLE,
  };
}

async function parseOpenRouterError(response) {
  const errorData = await response.json().catch(() => ({}));
  const message = errorData?.error?.message || `HTTP error! status: ${response.status}`;
  throw new Error(message);
}

async function createOpenRouterResponse({
  apiKey,
  model,
  messages,
  temperature = 0.7,
  stream = false,
}) {
  requireApiKey(apiKey);

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages,
      temperature,
      stream,
    }),
  });

  if (!response.ok) {
    await parseOpenRouterError(response);
  }

  return response;
}

/**
 * Helper to make requests to OpenRouter
 */
async function makeOpenRouterRequest(apiKey, model, messages, temperature = 0.7) {
  const response = await createOpenRouterResponse({
    apiKey,
    model,
    messages,
    temperature,
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

/**
 * Generates the next part of the story
 */
export async function generateStorySegment({
  apiKey,
  model,
  temperature = 0.7,
  mode = 'continue',
  genres = [],
  themes = [],
  tags = [],
  characters = [],
  premise = '',
  memory = '',
  storyText = '',
  whatHappensNext = '',
  nextMainEvent = '',
  limitType = 'words', // 'words' | 'paragraphs' | 'nolimit'
  limitValue = DEFAULT_WORD_LIMIT,
  onChunk = null, // Optional callback for streaming tokens
}) {
  const messages = buildStorySegmentMessages({
    mode,
    genres,
    themes,
    tags,
    characters,
    premise,
    memory,
    storyText,
    whatHappensNext,
    nextMainEvent,
    limitType,
    limitValue,
  });

  if (onChunk) {
    const response = await createOpenRouterResponse({
      apiKey,
      model,
      messages,
      temperature,
      stream: true,
    });
    const streamBody = response.body;

    if (!streamBody) {
      throw new Error('OpenRouter returned an empty streaming response.');
    }

    const reader = streamBody.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;
          if (cleanLine === 'data: [DONE]') continue;

          if (cleanLine.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(cleanLine.substring(6));
              const chunk = parsed.choices?.[0]?.delta?.content || '';
              if (chunk) {
                fullText += chunk;
                onChunk(fullText, chunk);
              }
            } catch (e) {
              console.warn('Error parsing SSE line:', cleanLine, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    return fullText.trim();
  }

  return makeOpenRouterRequest(apiKey, model, messages, temperature);
}

/**
 * Automatically updates the story memory list in the background
 */
export async function updateMemory({
  apiKey,
  model,
  currentMemory = '',
  characters = [],
  premise = '',
  newSegmentText = '',
}) {
  const messages = buildMemoryUpdateMessages({
    currentMemory,
    characters,
    premise,
    newSegmentText,
  });

  return makeOpenRouterRequest(apiKey, model, messages, 0.3);
}

/**
 * Generates a premise or summary from the selected story setup
 */
export async function generatePremiseFromSetup({
  apiKey,
  model,
  genres = [],
  themes = [],
  tags = [],
  characters = [],
  currentPremise = '',
}) {
  const messages = buildPremiseFromSetupMessages({
    genres,
    themes,
    tags,
    characters,
    currentPremise,
  });

  return makeOpenRouterRequest(apiKey, model, messages, 0.9);
}

export async function generateCharacterDescription({
  apiKey,
  model,
  character,
  genres = [],
  themes = [],
  tags = [],
  premise = '',
  otherCharacters = [],
}) {
  const messages = buildCharacterDescriptionMessages({
    character,
    genres,
    themes,
    tags,
    premise,
    otherCharacters,
  });

  return makeOpenRouterRequest(apiKey, model, messages, 0.85);
}

/**
 * Fetches the complete, real-time list of models available on OpenRouter
 */
export async function fetchOpenRouterModels() {
  try {
    const response = await fetch(OPENROUTER_MODELS_URL);
    if (!response.ok) throw new Error('Failed to fetch models list');
    const json = await response.json();
    if (!json.data || !Array.isArray(json.data)) {
      throw new Error('Invalid response structure from OpenRouter');
    }
    
    // Map to normalized { id, name } format
    const models = json.data.map((m) => ({
      id: m.id,
      name: m.name || m.id,
    }));
    
    // Sort models alphabetically by name
    return models.sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.warn('Could not fetch real-time OpenRouter models:', e);
    return null;
  }
}
