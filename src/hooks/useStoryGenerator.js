import { useState } from 'react';
import { generateStorySegment as requestStorySegment, updateMemory } from '../services/openrouter';
import { STORY_GENERATION_MODES } from '../utils/storyGeneration';

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
    const originalText = sourceStoryText.trim();

    try {
      const defaultLimitValue = sourceLimitType === 'words' ? 250 : 3;
      const parsedLimitValue = Number(sourceLimitValue);
      const finalLimitValue = sourceLimitType === 'nolimit'
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
        limitValue: sourceLimitType === 'nolimit' ? null : finalLimitValue,
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

  return {
    isGenerating,
    isMemoryUpdating,
    generateStorySegment,
    rebuildMemoryFromStory,
  };
}
