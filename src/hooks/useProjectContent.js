import { PROJECT_CONTENT_DEFAULTS } from '../utils/projectState';

export default function useProjectContent(currentProject, setCurrentProjectField) {
  const project = currentProject || {
    id: null,
    name: 'Untitled Project',
    ...PROJECT_CONTENT_DEFAULTS,
    snapshots: [],
  };

  const bindField = (field) => (value) => setCurrentProjectField(field, value);

  return {
    project,
    storyText: project.storyText,
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
    setStoryText: bindField('storyText'),
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
