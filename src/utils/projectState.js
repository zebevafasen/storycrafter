import {
  DEFAULT_PROJECT_LIMIT_TYPE,
  DEFAULT_PARAGRAPH_LIMIT,
  STORY_LIMIT_TYPES,
} from '../config/storyLimits';
import {
  createEmptyManuscriptDoc,
  manuscriptDocToPlainText,
  normalizeManuscriptDoc,
  plainTextToManuscriptDoc,
} from './manuscriptDocument';
import {
  hasLegacyProjectData,
  readLegacyProjectContent,
} from './projectStateLegacy';
import { STORY_GENERATION_MODES } from './storyGeneration';

const MAX_SNAPSHOTS_PER_PROJECT = 25;

export const PROJECT_CONTENT_DEFAULTS = {
  storyText: '',
  manuscriptDoc: createEmptyManuscriptDoc(),
  genres: [],
  themes: [],
  customTags: [],
  characters: [],
  premise: '',
  memory: '',
  whatHappensNext: '',
  nextMainEvent: '',
  limitType: DEFAULT_PROJECT_LIMIT_TYPE,
  limitValue: DEFAULT_PARAGRAPH_LIMIT,
};

export const PROJECT_CONTENT_FIELDS = Object.keys(PROJECT_CONTENT_DEFAULTS);
const TAG_COLLECTION_FIELDS = new Set(['genres', 'themes', 'customTags']);

const LAST_GENERATION_DEFAULTS = {
  historyEntryId: '',
  generationMode: STORY_GENERATION_MODES.CONTINUE,
  baseStoryText: '',
  baseManuscriptDoc: createEmptyManuscriptDoc(),
  baseMemory: '',
  generatedText: '',
  insertionOffset: null,
  insertionTarget: null,
  whatHappensNext: '',
  nextMainEvent: '',
  limitType: DEFAULT_PROJECT_LIMIT_TYPE,
  limitValue: DEFAULT_PARAGRAPH_LIMIT,
  isApplied: false,
  createdAt: '',
};

const GENERATION_HISTORY_LIMIT = 100;

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cleanString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function cleanArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function cleanNumber(value, fallback = 0) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function cleanInsertionTarget(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const insertAtIndex = Number(value.insertAtIndex);

  return {
    insertAtIndex: Number.isInteger(insertAtIndex) ? Math.max(0, insertAtIndex) : 0,
    replaceEmptyParagraph: Boolean(value.replaceEmptyParagraph),
  };
}

export function createCharacter({
  id = createId('character'),
  name = '',
  tags = [],
  description = '',
} = {}) {
  return {
    id: cleanString(id, createId('character')),
    name: cleanString(name),
    tags: cleanArray(tags),
    description: cleanString(description),
  };
}

function cleanCharacters(value) {
  return Array.isArray(value) ? value.map((character) => createCharacter(character)) : [];
}

function normalizeContentField(field, value, fallbackValue) {
  const resolvedValue = value ?? fallbackValue;

  if (TAG_COLLECTION_FIELDS.has(field)) {
    return cleanArray(resolvedValue);
  }

  if (field === 'characters') {
    return cleanCharacters(resolvedValue);
  }

  if (field === 'limitValue') {
    if (resolvedValue === undefined) {
      return fallbackValue;
    }

    return resolvedValue === null || resolvedValue === '' ? resolvedValue : Number(resolvedValue);
  }

  if (field === 'limitType') {
    const candidate = cleanString(resolvedValue, fallbackValue);
    return Object.values(STORY_LIMIT_TYPES).includes(candidate) ? candidate : fallbackValue;
  }

  return cleanString(resolvedValue, fallbackValue);
}

function normalizeProjectContent(source = {}, fallback = PROJECT_CONTENT_DEFAULTS) {
  const manuscriptDoc = normalizeManuscriptDoc(source.manuscriptDoc, cleanString(source.storyText, fallback.storyText));
  const normalizedStoryText = cleanString(source.storyText, manuscriptDocToPlainText(manuscriptDoc));

  return PROJECT_CONTENT_FIELDS.reduce((content, field) => {
    if (field === 'manuscriptDoc') {
      content[field] = manuscriptDoc;
      return content;
    }

    if (field === 'storyText') {
      content[field] = normalizedStoryText;
      return content;
    }

    content[field] = normalizeContentField(field, source[field], fallback[field]);
    return content;
  }, {});
}

function normalizeSnapshot(snapshot) {
  return {
    id: cleanString(snapshot?.id, createId('snapshot')),
    label: cleanString(snapshot?.label, 'Snapshot'),
    source: cleanString(snapshot?.source, 'manual'),
    createdAt: cleanString(snapshot?.createdAt, new Date().toISOString()),
    content: normalizeProjectContent(snapshot?.content, PROJECT_CONTENT_DEFAULTS),
  };
}

export function createGenerationHistoryEntry({
  id = createId('generation'),
  generationMode = STORY_GENERATION_MODES.CONTINUE,
  source = 'generation',
  generatedText = '',
  startIndex = 0,
  endIndex = startIndex + cleanString(generatedText).length,
  whatHappensNext = '',
  nextMainEvent = '',
  isApplied = true,
  createdAt = new Date().toISOString(),
} = {}) {
  const candidateMode = cleanString(generationMode, STORY_GENERATION_MODES.CONTINUE);
  const resolvedMode = Object.values(STORY_GENERATION_MODES).includes(candidateMode)
    ? candidateMode
    : STORY_GENERATION_MODES.CONTINUE;
  const resolvedGeneratedText = cleanString(generatedText);
  const resolvedStartIndex = Math.max(0, cleanNumber(startIndex, 0));
  const resolvedEndIndex = Math.max(resolvedStartIndex, cleanNumber(endIndex, resolvedStartIndex + resolvedGeneratedText.length));

  return {
    id: cleanString(id, createId('generation')),
    generationMode: resolvedMode,
    source: cleanString(source, 'generation'),
    generatedText: resolvedGeneratedText,
    startIndex: resolvedStartIndex,
    endIndex: resolvedEndIndex,
    whatHappensNext: cleanString(whatHappensNext),
    nextMainEvent: cleanString(nextMainEvent),
    isApplied: Boolean(isApplied),
    createdAt: cleanString(createdAt, new Date().toISOString()),
  };
}

function normalizeLastGeneration(lastGeneration) {
  if (!lastGeneration || typeof lastGeneration !== 'object') {
    return null;
  }

  const candidateMode = cleanString(lastGeneration.generationMode, LAST_GENERATION_DEFAULTS.generationMode);

  return {
    historyEntryId: cleanString(lastGeneration.historyEntryId, LAST_GENERATION_DEFAULTS.historyEntryId),
    generationMode: Object.values(STORY_GENERATION_MODES).includes(candidateMode)
      ? candidateMode
      : LAST_GENERATION_DEFAULTS.generationMode,
    baseStoryText: cleanString(lastGeneration.baseStoryText, LAST_GENERATION_DEFAULTS.baseStoryText),
    baseManuscriptDoc: normalizeManuscriptDoc(
      lastGeneration.baseManuscriptDoc,
      cleanString(lastGeneration.baseStoryText, LAST_GENERATION_DEFAULTS.baseStoryText),
    ),
    baseMemory: cleanString(lastGeneration.baseMemory, LAST_GENERATION_DEFAULTS.baseMemory),
    generatedText: cleanString(lastGeneration.generatedText, LAST_GENERATION_DEFAULTS.generatedText),
    insertionOffset: Number.isFinite(Number(lastGeneration.insertionOffset))
      ? Math.max(0, Number(lastGeneration.insertionOffset))
      : null,
    insertionTarget: cleanInsertionTarget(lastGeneration.insertionTarget),
    whatHappensNext: cleanString(lastGeneration.whatHappensNext, LAST_GENERATION_DEFAULTS.whatHappensNext),
    nextMainEvent: cleanString(lastGeneration.nextMainEvent, LAST_GENERATION_DEFAULTS.nextMainEvent),
    limitType: normalizeContentField('limitType', lastGeneration.limitType, LAST_GENERATION_DEFAULTS.limitType),
    limitValue: normalizeContentField('limitValue', lastGeneration.limitValue, LAST_GENERATION_DEFAULTS.limitValue),
    isApplied: Boolean(lastGeneration.isApplied),
    createdAt: cleanString(lastGeneration.createdAt, new Date().toISOString()),
  };
}

function normalizeGenerationHistory(generationHistory) {
  if (!Array.isArray(generationHistory)) {
    return [];
  }

  return generationHistory
    .map((entry) => createGenerationHistoryEntry(entry))
    .slice(-GENERATION_HISTORY_LIMIT);
}

function pickProjectContent(project) {
  return normalizeProjectContent(project, PROJECT_CONTENT_DEFAULTS);
}

function guessProjectName(project) {
  const candidates = [
    project.premise,
    project.storyText,
  ]
    .flatMap((value) => cleanString(value).split('\n'))
    .map((line) => line.trim())
    .filter(Boolean);

  const firstCandidate = candidates[0];
  if (!firstCandidate) {
    return 'Untitled Project';
  }

  return firstCandidate.slice(0, 40);
}

export function createProject({
  name = 'Untitled Project',
  createdAt = new Date().toISOString(),
  updatedAt = createdAt,
  content = {},
  lastGeneration = null,
  generationHistory = [],
  snapshots = [],
} = {}) {
  return {
    id: createId('project'),
    name: cleanString(name, 'Untitled Project'),
    createdAt,
    updatedAt,
    ...PROJECT_CONTENT_DEFAULTS,
    ...content,
    lastGeneration: normalizeLastGeneration(lastGeneration),
    generationHistory: normalizeGenerationHistory(generationHistory),
    snapshots,
  };
}

export function createSnapshot(project, label = 'Manual snapshot', source = 'manual') {
  return {
    id: createId('snapshot'),
    label: cleanString(label, 'Manual snapshot'),
    source,
    createdAt: new Date().toISOString(),
    content: pickProjectContent(project),
  };
}

export function attachSnapshot(project, snapshot) {
  const snapshots = [snapshot, ...(project.snapshots || [])].slice(0, MAX_SNAPSHOTS_PER_PROJECT);
  return {
    ...project,
    snapshots,
  };
}

export function applyProjectContent(project, content, updatedAt = new Date().toISOString()) {
  const nextContent = normalizeProjectContent(content, project);

  return {
    ...project,
    ...nextContent,
    updatedAt,
  };
}

export function duplicateProject(project) {
  const duplicatedProject = createProject({
    name: `${project.name} Copy`,
    content: pickProjectContent(project),
    lastGeneration: null,
    generationHistory: normalizeGenerationHistory(project.generationHistory),
  });

  return duplicatedProject;
}

export function normalizeProject(rawProject) {
  const createdAt = cleanString(rawProject?.createdAt, new Date().toISOString());
  const updatedAt = cleanString(rawProject?.updatedAt, createdAt);
  const baseProject = createProject({
    name: cleanString(rawProject?.name, 'Untitled Project'),
    createdAt,
    updatedAt,
    content: normalizeProjectContent(rawProject, PROJECT_CONTENT_DEFAULTS),
  });

  return {
    ...baseProject,
    id: cleanString(rawProject?.id, baseProject.id),
    lastGeneration: normalizeLastGeneration(rawProject?.lastGeneration),
    generationHistory: normalizeGenerationHistory(rawProject?.generationHistory),
    snapshots: Array.isArray(rawProject?.snapshots)
      ? rawProject.snapshots.map((snapshot) => normalizeSnapshot(snapshot)).slice(0, MAX_SNAPSHOTS_PER_PROJECT)
      : [],
  };
}

export function createInitialProjectsState() {
  if (typeof window === 'undefined') {
    const project = createProject();
    return {
      currentProjectId: project.id,
      projects: [project],
    };
  }

  const legacyProjectContent = readLegacyProjectContent(cleanString);

  const migratedProject = createProject({
    name: guessProjectName(legacyProjectContent),
    content: {
      ...legacyProjectContent,
      manuscriptDoc: plainTextToManuscriptDoc(legacyProjectContent.storyText),
    },
  });

  if (hasLegacyProjectData(migratedProject)) {
    migratedProject.snapshots = [
      createSnapshot(migratedProject, 'Imported legacy draft', 'migration'),
    ];
  }

  return {
    currentProjectId: migratedProject.id,
    projects: [migratedProject],
  };
}

export function normalizeProjectsState(rawState) {
  if (!rawState || !Array.isArray(rawState.projects) || rawState.projects.length === 0) {
    return createInitialProjectsState();
  }

  const projects = rawState.projects.map((project) => normalizeProject(project));
  const currentProjectId = projects.some((project) => project.id === rawState.currentProjectId)
    ? rawState.currentProjectId
    : projects[0].id;

  return {
    currentProjectId,
    projects,
  };
}
