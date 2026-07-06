import { useState } from 'react';
import { generateNextSegment, updateMemory } from '../services/openrouter';

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
  setStoryText,
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

  const generateStorySegment = async () => {
    if (!config.apiKey) {
      onToast('Please configure your OpenRouter API Key in Settings first.');
      return { requiresApiKey: true };
    }

    setIsGenerating(true);
    const originalText = storyText.trim();
    let streamedText = '';

    try {
      const finalLimitValue = limitType === 'nolimit' ? null : Number(limitValue);

      const newText = await generateNextSegment({
        apiKey: config.apiKey,
        model: config.model,
        temperature: config.temperature,
        genres,
        themes,
        tags,
        characters,
        premise,
        memory,
        storyText: originalText,
        whatHappensNext,
        nextMainEvent,
        limitType,
        limitValue: finalLimitValue,
        onChunk: (textSoFar) => {
          streamedText = textSoFar;
          setStoryText(originalText + (originalText ? '\n\n' : '') + textSoFar);
        },
      });

      if (!newText) {
        throw new Error('Received empty response from the AI co-writer.');
      }

      const finalStoryText = originalText + (originalText ? '\n\n' : '') + newText.trim();
      setStoryText(finalStoryText);
      setWhatHappensNext('');
      onToast('Story segment generated');

      void syncMemory({
        currentMemory: memory,
        newSegmentText: newText.trim(),
        successMessage: 'Story Memory automatically updated',
      }).then((memoryResult) => {
        if (memoryResult?.error) {
          console.error('Memory background update failed:', memoryResult.error);
        }
      });

      return { success: true, finalStoryText };
    } catch (error) {
      console.error(error);
      onToast(`Generation failed: ${error.message}`);
      if (!streamedText) {
        setStoryText(originalText);
      }
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
