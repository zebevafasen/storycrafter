import {
  createEmptyManuscriptDoc,
} from './manuscriptDocument';
import {
  DEFAULT_PARAGRAPH_LIMIT,
  DEFAULT_PROJECT_LIMIT_TYPE,
} from '../config/storyLimits';

const LEGACY_STORAGE_KEYS = {
  storyText: 'storycrafter_text',
  genres: 'storycrafter_genres',
  themes: 'storycrafter_themes',
  customTags: 'storycrafter_tags',
  premise: 'storycrafter_premise',
  memory: 'storycrafter_memory',
};

function parseLegacyArray(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

export function readLegacyProjectContent(cleanString) {
  const legacyProjectContent = {
    storyText: cleanString(window.localStorage.getItem(LEGACY_STORAGE_KEYS.storyText)),
    manuscriptDoc: createEmptyManuscriptDoc(),
    premise: cleanString(window.localStorage.getItem(LEGACY_STORAGE_KEYS.premise)),
    memory: cleanString(window.localStorage.getItem(LEGACY_STORAGE_KEYS.memory)),
    characters: [],
    whatHappensNext: '',
    nextMainEvent: '',
    limitType: DEFAULT_PROJECT_LIMIT_TYPE,
    limitValue: DEFAULT_PARAGRAPH_LIMIT,
    genres: parseLegacyArray(LEGACY_STORAGE_KEYS.genres),
    themes: parseLegacyArray(LEGACY_STORAGE_KEYS.themes),
    customTags: parseLegacyArray(LEGACY_STORAGE_KEYS.customTags),
  };

  return legacyProjectContent;
}

export function hasLegacyProjectData(project) {
  return Boolean(
    project.storyText.trim()
    || project.premise.trim()
    || project.memory.trim()
    || project.genres.length
    || project.themes.length
    || project.customTags.length
  );
}
