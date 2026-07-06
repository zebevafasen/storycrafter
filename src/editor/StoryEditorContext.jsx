import { createContext, useContext } from 'react';

export const StoryEditorContext = createContext({
  generationHistory: [],
  lastGeneration: null,
  storyText: '',
  isGenerating: false,
  onSelectHistoryEntry: null,
  onRegenerateLast: null,
  onDeleteLatest: null,
});

export function useStoryEditorContext() {
  return useContext(StoryEditorContext);
}
