export const STORY_GENERATION_MODES = {
  START: 'start',
  CONTINUE: 'continue',
  CONTINUE_TOWARD_GOAL: 'continue_toward_goal',
};

export const STORY_REWRITE_MODES = {
  REWRITE: 'rewrite',
  EXPAND: 'expand',
  SHORTEN: 'shorten',
  CUSTOM: 'custom_rewrite',
};

export const STORY_GENERATION_MODE_OPTIONS = [
  {
    id: STORY_GENERATION_MODES.START,
    label: 'Start Writing',
    shortLabel: 'Start',
    description: 'Begin the manuscript from the current setup and premise.',
  },
  {
    id: STORY_GENERATION_MODES.CONTINUE,
    label: 'Continue Writing',
    shortLabel: 'Continue',
    description: 'Carry the current prose forward using story memory and recent text.',
  },
  {
    id: STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL,
    label: 'Write Toward Goal',
    shortLabel: 'Toward Goal',
    description: 'Continue naturally while steering toward the persistent next goal or event.',
  },
];

export const STORY_REWRITE_MODE_OPTIONS = [
  {
    id: STORY_REWRITE_MODES.REWRITE,
    label: 'Rewrite Selection',
    shortLabel: 'Rewrite',
    description: 'Rewrite the selected prose while preserving the scene intent and continuity.',
  },
  {
    id: STORY_REWRITE_MODES.EXPAND,
    label: 'Expand Selection',
    shortLabel: 'Expand',
    description: 'Add texture, detail, and depth to the selected prose without changing the core meaning.',
  },
  {
    id: STORY_REWRITE_MODES.SHORTEN,
    label: 'Shorten Selection',
    shortLabel: 'Shorten',
    description: 'Make the selected prose tighter and more concise while keeping the important beats.',
  },
  {
    id: STORY_REWRITE_MODES.CUSTOM,
    label: 'Custom Rewrite',
    shortLabel: 'Custom',
    description: 'Apply a specific revision instruction to the selected prose.',
  },
];

export const STORY_COMMAND_MODE_OPTIONS = [
  ...STORY_GENERATION_MODE_OPTIONS,
  ...STORY_REWRITE_MODE_OPTIONS,
];

export const ALL_STORY_COMMAND_MODES = STORY_COMMAND_MODE_OPTIONS.map((option) => option.id);

export function getStoryGenerationModeOption(mode) {
  return STORY_COMMAND_MODE_OPTIONS.find((option) => option.id === mode)
    || STORY_GENERATION_MODE_OPTIONS[1];
}

export function getStoryGenerationModeLabel(mode, { short = false } = {}) {
  const option = getStoryGenerationModeOption(mode);
  return short ? option.shortLabel : option.label;
}

export function getDefaultStoryGenerationMode(storyText = '') {
  return storyText.trim()
    ? STORY_GENERATION_MODES.CONTINUE
    : STORY_GENERATION_MODES.START;
}

export function getDefaultRewriteMode() {
  return STORY_REWRITE_MODES.REWRITE;
}

export function isRewriteMode(mode) {
  return Object.values(STORY_REWRITE_MODES).includes(mode);
}

export function isStoryGenerationModeAvailable(mode, {
  storyText = '',
  nextMainEvent = '',
  selectedText = '',
} = {}) {
  const hasStoryText = Boolean(storyText.trim());
  const hasNextMainEvent = Boolean(nextMainEvent.trim());
  const hasSelectedText = Boolean(selectedText.trim());

  if (isRewriteMode(mode)) {
    return hasSelectedText;
  }

  if (mode === STORY_GENERATION_MODES.START) {
    return !hasStoryText;
  }

  if (mode === STORY_GENERATION_MODES.CONTINUE) {
    return hasStoryText;
  }

  if (mode === STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL) {
    return hasStoryText && hasNextMainEvent;
  }

  return false;
}
