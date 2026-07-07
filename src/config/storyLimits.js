export const STORY_LIMIT_TYPES = {
  WORDS: 'words',
  PARAGRAPHS: 'paragraphs',
  NO_LIMIT: 'nolimit',
};

export const DEFAULT_WORD_LIMIT = 250;
export const DEFAULT_PARAGRAPH_LIMIT = 3;
export const DEFAULT_PROJECT_LIMIT_TYPE = STORY_LIMIT_TYPES.PARAGRAPHS;

export function getDefaultLimitValue(limitType) {
  if (limitType === STORY_LIMIT_TYPES.WORDS) {
    return DEFAULT_WORD_LIMIT;
  }

  if (limitType === STORY_LIMIT_TYPES.PARAGRAPHS) {
    return DEFAULT_PARAGRAPH_LIMIT;
  }

  return null;
}
