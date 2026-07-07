import { useState } from 'react';
import {
  DEFAULT_PARAGRAPH_LIMIT,
  DEFAULT_WORD_LIMIT,
  STORY_LIMIT_TYPES,
  getDefaultLimitValue,
} from '../config/storyLimits';
import {
  generateStorySegment as requestStorySegment,
  rewriteStorySelection as requestSelectionRewrite,
  updateMemory,
} from '../services/openrouter';
import {
  STORY_GENERATION_MODES,
  STORY_REWRITE_MODES,
} from '../utils/storyGeneration';

export default function useStoryGenerator({
  config,
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
  setMemory,
  setWhatHappensNext,
  onToast,
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMemoryUpdating, setIsMemoryUpdating] = useState(false);

  const syncMemory = async ({ currentMemory, newSegmentText, successMessage }) => {
    if (!config.apiKey) {
      return { requiresApiKey: true };
    }

    setIsMemoryUpdating(true);

    try {
      const updatedMemory = await updateMemory({
        apiKey: config.apiKey,
        model: config.model,
        currentMemory,
        characters,
        premise,
        newSegmentText,
      });

      if (updatedMemory) {
        setMemory(updatedMemory);
        if (successMessage) {
          onToast(successMessage);
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error };
    } finally {
      setIsMemoryUpdating(false);
    }
  };

  const generateStorySegment = async (overrides = {}) => {
    if (!config.apiKey) {
      onToast('Please configure your OpenRouter API Key in Settings first.');
      return { requiresApiKey: true };
    }

    setIsGenerating(true);
    const sourceStoryText = overrides.storyText ?? storyText;
    const sourceMemory = overrides.memory ?? memory;
    const sourceWhatHappensNext = overrides.whatHappensNext ?? whatHappensNext;
    const sourceNextMainEvent = overrides.nextMainEvent ?? nextMainEvent;
    const sourceLimitType = overrides.limitType ?? limitType;
    const sourceLimitValue = overrides.limitValue ?? limitValue;
    const sourceGenerationMode = overrides.mode ?? STORY_GENERATION_MODES.CONTINUE;
    const onChunk = typeof overrides.onChunk === 'function' ? overrides.onChunk : null;
    const originalText = sourceStoryText.trim();

    try {
      const defaultLimitValue = getDefaultLimitValue(sourceLimitType)
        ?? (sourceLimitType === STORY_LIMIT_TYPES.WORDS ? DEFAULT_WORD_LIMIT : DEFAULT_PARAGRAPH_LIMIT);
      const parsedLimitValue = Number(sourceLimitValue);
      const finalLimitValue = sourceLimitType === STORY_LIMIT_TYPES.NO_LIMIT
        ? null
        : (sourceLimitValue === '' || Number.isNaN(parsedLimitValue) || parsedLimitValue <= 0
          ? defaultLimitValue
          : parsedLimitValue);

      const newText = await requestStorySegment({
        apiKey: config.apiKey,
        model: config.model,
        temperature: config.temperature,
        mode: sourceGenerationMode,
        genres,
        themes,
        tags,
        characters,
        premise,
        memory: sourceMemory,
        storyText: originalText,
        whatHappensNext: sourceWhatHappensNext,
        nextMainEvent: sourceNextMainEvent,
        limitType: sourceLimitType,
        limitValue: finalLimitValue,
        onChunk,
      });

      if (!newText) {
        throw new Error('Received empty response from the AI co-writer.');
      }

      const finalStoryText = originalText + (originalText ? '\n\n' : '') + newText.trim();
      setWhatHappensNext('');
      onToast('Story segment generated');

      void syncMemory({
        currentMemory: sourceMemory,
        newSegmentText: newText.trim(),
        successMessage: 'Story Memory automatically updated',
      }).then((memoryResult) => {
        if (memoryResult?.error) {
          console.error('Memory background update failed:', memoryResult.error);
        }
      });

      return {
        success: true,
        generationMode: sourceGenerationMode,
        finalStoryText,
        generatedSegmentText: newText.trim(),
        baseStoryText: originalText,
        baseMemory: sourceMemory,
        whatHappensNext: sourceWhatHappensNext,
        nextMainEvent: sourceNextMainEvent,
        limitType: sourceLimitType,
        limitValue: sourceLimitType === STORY_LIMIT_TYPES.NO_LIMIT ? null : finalLimitValue,
      };
    } catch (error) {
      console.error(error);
      onToast(`Generation failed: ${error.message}`);
      return { success: false, error };
    } finally {
      setIsGenerating(false);
    }
  };

  const rebuildMemoryFromStory = async () => {
    if (!storyText.trim()) {
      onToast('Write some story first.');
      return { success: false };
    }

    if (!config.apiKey) {
      onToast('Please configure your OpenRouter API Key in Settings first.');
      return { requiresApiKey: true };
    }

    const result = await syncMemory({
      currentMemory: '',
      newSegmentText: storyText,
      successMessage: 'Story Memory rebuilt',
    });

    if (result?.error) {
      onToast(`Memory sync failed: ${result.error.message}`);
    }

    return result;
  };

  const rewriteStorySelection = async (overrides = {}) => {
    if (!config.apiKey) {
      onToast('Please configure your OpenRouter API Key in Settings first.');
      return { requiresApiKey: true };
    }

    setIsGenerating(true);
    const sourceStoryText = overrides.storyText ?? storyText;
    const sourceMemory = overrides.memory ?? memory;
    const sourceSelectionText = overrides.selectedText ?? '';
    const sourceSelectionRange = overrides.selectionRange ?? null;
    const sourceRewriteInstruction = overrides.rewriteInstruction ?? whatHappensNext;
    const sourceRewriteMode = overrides.mode ?? STORY_REWRITE_MODES.REWRITE;

    try {
      const rewrittenText = await requestSelectionRewrite({
        apiKey: config.apiKey,
        model: config.model,
        temperature: config.temperature,
        mode: sourceRewriteMode,
        genres,
        themes,
        tags,
        characters,
        premise,
        memory: sourceMemory,
        storyText: sourceStoryText,
        selectedText: sourceSelectionText,
        selectionRange: sourceSelectionRange,
        rewriteInstruction: sourceRewriteInstruction,
      });

      if (!rewrittenText) {
        throw new Error('Received empty rewrite response from the AI co-writer.');
      }

      setWhatHappensNext('');
      onToast('Selection rewritten');

      return {
        success: true,
        generationMode: sourceRewriteMode,
        rewrittenText: rewrittenText.trim(),
        baseStoryText: sourceStoryText,
        baseMemory: sourceMemory,
        selectedText: sourceSelectionText,
        selectionRange: sourceSelectionRange,
        rewriteInstruction: sourceRewriteInstruction,
      };
    } catch (error) {
      console.error(error);
      onToast(`Rewrite failed: ${error.message}`);
      return { success: false, error };
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    isMemoryUpdating,
    generateStorySegment,
    rewriteStorySelection,
    rebuildMemoryFromStory,
  };
}
