import { DEFAULT_WORD_LIMIT, STORY_LIMIT_TYPES } from '../config/storyLimits';
import { STORY_GENERATION_MODES } from './storyGeneration';
import {
  buildLengthConstraint,
  buildSharedStorySystemPrompt,
  buildStoryExcerpt,
  formatSetupDetails,
} from './storyPromptShared';

export function buildStartWritingMessages({
  genres = [],
  themes = [],
  tags = [],
  characters = [],
  premise = '',
  whatHappensNext = '',
  limitType = STORY_LIMIT_TYPES.WORDS,
  limitValue = DEFAULT_WORD_LIMIT,
}) {
  const lengthConstraint = buildLengthConstraint(limitType, limitValue);
  const setupDetails = formatSetupDetails({
    genres,
    themes,
    tags,
    characters,
    premise,
  });

  const systemPrompt = buildSharedStorySystemPrompt({
    modeInstruction: 'Start the manuscript from scratch using only the provided setup. Open with actual story prose immediately and establish a compelling first beat rather than explaining the premise from a distance.',
    setupDetails,
    memory: '',
    lengthConstraint,
  });

  const openingBeat = whatHappensNext.trim()
    ? `Optional opening beat to incorporate if it fits naturally:
- ${whatHappensNext.trim()}

`
    : '';

  const userPrompt = `There is no manuscript yet.

${openingBeat}Write the opening segment now.
- Begin directly with the story itself.
- Do not preface the prose with explanations.
- Establish character, setting, tone, and immediate motion as naturally as possible.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

export function buildContinueWritingMessages({
  genres = [],
  themes = [],
  tags = [],
  characters = [],
  premise = '',
  memory = '',
  storyText = '',
  whatHappensNext = '',
  limitType = STORY_LIMIT_TYPES.WORDS,
  limitValue = DEFAULT_WORD_LIMIT,
}) {
  const lengthConstraint = buildLengthConstraint(limitType, limitValue);
  const setupDetails = formatSetupDetails({
    genres,
    themes,
    tags,
    characters,
    premise,
  });

  const systemPrompt = buildSharedStorySystemPrompt({
    modeInstruction: 'Continue the existing manuscript so the new prose feels inseparable from what is already written. Build from the most recent prose first, while staying consistent with the broader memory.',
    setupDetails,
    memory,
    lengthConstraint,
  });

  const recentStory = buildStoryExcerpt(storyText);
  const microInstruction = whatHappensNext.trim()
    ? `- Optional immediate direction for this segment: ${whatHappensNext.trim()}\n`
    : '';

  const userPrompt = `Recent manuscript excerpt:
---
${recentStory || '(No manuscript excerpt available.)'}
---

Instructions for this new segment:
- Continue directly from the manuscript excerpt above.
${microInstruction}Write the next part of the story now.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

export function buildContinueTowardGoalMessages({
  genres = [],
  themes = [],
  tags = [],
  characters = [],
  premise = '',
  memory = '',
  storyText = '',
  whatHappensNext = '',
  nextMainEvent = '',
  limitType = STORY_LIMIT_TYPES.WORDS,
  limitValue = DEFAULT_WORD_LIMIT,
}) {
  const lengthConstraint = buildLengthConstraint(limitType, limitValue);
  const setupDetails = formatSetupDetails({
    genres,
    themes,
    tags,
    characters,
    premise,
  });

  const systemPrompt = buildSharedStorySystemPrompt({
    modeInstruction: 'Continue the current manuscript while steering it toward the provided next main event or goal. Treat that goal as directional guidance, not a requirement to resolve it fully in this single segment. Make natural progress through setup, complication, discovery, travel, debate, or escalation as needed.',
    setupDetails,
    memory,
    lengthConstraint,
  });

  const recentStory = buildStoryExcerpt(storyText);
  const microInstruction = whatHappensNext.trim()
    ? `- Optional immediate beat to fold in if it fits: ${whatHappensNext.trim()}\n`
    : '';

  const userPrompt = `Recent manuscript excerpt:
---
${recentStory || '(No manuscript excerpt available.)'}
---

Directional target for the broader scene flow:
- Next main event or goal: ${nextMainEvent.trim() || 'Not specified'}

Instructions for this new segment:
- Continue directly from the manuscript excerpt above.
- Start moving the story toward the target naturally.
- You do not need to complete or fully reach the target in this one segment.
- Prefer believable progress over abrupt payoff.
${microInstruction}Write the next part of the story now.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

export function buildStorySegmentMessages({
  mode = STORY_GENERATION_MODES.CONTINUE,
  ...context
}) {
  if (mode === STORY_GENERATION_MODES.START) {
    return buildStartWritingMessages(context);
  }

  if (mode === STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL) {
    return buildContinueTowardGoalMessages(context);
  }

  return buildContinueWritingMessages(context);
}
