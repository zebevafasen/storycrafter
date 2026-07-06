export const STORY_GENERATION_MODES = {
  START: 'start',
  CONTINUE: 'continue',
  CONTINUE_TOWARD_GOAL: 'continue_toward_goal',
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

export function getStoryGenerationModeOption(mode) {
  return STORY_GENERATION_MODE_OPTIONS.find((option) => option.id === mode)
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

export function isStoryGenerationModeAvailable(mode, { storyText = '', nextMainEvent = '' } = {}) {
  const hasStoryText = Boolean(storyText.trim());
  const hasNextMainEvent = Boolean(nextMainEvent.trim());

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
