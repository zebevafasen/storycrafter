import { plainTextToManuscriptDoc, manuscriptDocToPlainText } from '../utils/manuscriptDocument';
import { PROJECT_CONTENT_DEFAULTS } from '../utils/projectState';

export default function useProjectContent(currentProject, setCurrentProjectField, updateCurrentProject) {
  const project = currentProject || {
    id: null,
    name: 'Untitled Project',
    ...PROJECT_CONTENT_DEFAULTS,
    snapshots: [],
  };

  const bindField = (field) => (value) => setCurrentProjectField(field, value);
  const setStoryText = (value) => {
    updateCurrentProject((currentValue) => {
      const nextStoryText = typeof value === 'function' ? value(currentValue.storyText) : value;

      return {
        storyText: nextStoryText,
        manuscriptDoc: plainTextToManuscriptDoc(nextStoryText),
      };
    });
  };

  const setManuscriptDoc = (value) => {
    updateCurrentProject((currentValue) => {
      const nextManuscriptDoc = typeof value === 'function'
        ? value(currentValue.manuscriptDoc)
        : value;

      return {
        manuscriptDoc: nextManuscriptDoc,
        storyText: manuscriptDocToPlainText(nextManuscriptDoc),
      };
    });
  };

  return {
    project,
    storyText: project.storyText,
    manuscriptDoc: project.manuscriptDoc,
    genres: project.genres,
    themes: project.themes,
    customTags: project.customTags,
    characters: project.characters,
    premise: project.premise,
    memory: project.memory,
    lastGeneration: project.lastGeneration,
    generationHistory: project.generationHistory || [],
    whatHappensNext: project.whatHappensNext,
    nextMainEvent: project.nextMainEvent,
    limitType: project.limitType,
    limitValue: project.limitValue,
    setStoryText,
    setManuscriptDoc,
    setGenres: bindField('genres'),
    setThemes: bindField('themes'),
    setCustomTags: bindField('customTags'),
    setCharacters: bindField('characters'),
    setPremise: bindField('premise'),
    setMemory: bindField('memory'),
    setWhatHappensNext: bindField('whatHappensNext'),
    setNextMainEvent: bindField('nextMainEvent'),
    setLimitValue: bindField('limitValue'),
  };
}
