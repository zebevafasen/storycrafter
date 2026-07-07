import { DEFAULT_WORD_LIMIT, STORY_LIMIT_TYPES } from '../config/storyLimits';
import { STORY_GENERATION_MODES, STORY_REWRITE_MODES } from './storyGeneration';
import {
  buildLengthConstraint,
  buildSharedStorySystemPrompt,
  buildStoryExcerpt,
  formatSetupDetails,
} from './storyPromptShared';

function buildRewriteModeInstruction(mode, rewriteInstruction = '') {
  if (mode === STORY_REWRITE_MODES.EXPAND) {
    return 'Expand the selected prose with richer sensory detail, sharper interiority, and more textured action while staying faithful to the original scene.';
  }

  if (mode === STORY_REWRITE_MODES.SHORTEN) {
    return 'Rewrite the selected prose so it becomes tighter, cleaner, and more concise without losing the important story beats.';
  }

  if (mode === STORY_REWRITE_MODES.CUSTOM) {
    return rewriteInstruction.trim()
      ? `Rewrite the selected prose according to this instruction: ${rewriteInstruction.trim()}`
      : 'Rewrite the selected prose according to the writer\'s intent and the surrounding story context.';
  }

  return 'Rewrite the selected prose so it reads more smoothly and vividly while preserving the original meaning, continuity, tense, and point of view.';
}

function buildRewriteContext(storyText = '', selectionRange = null) {
  if (!storyText.trim() || !selectionRange) {
    return {
      beforeContext: '',
      afterContext: '',
    };
  }

  const startIndex = Math.max(0, Number(selectionRange.startIndex) || 0);
  const endIndex = Math.max(startIndex, Number(selectionRange.endIndex) || startIndex);
  const contextWindow = 1200;
  const beforeContext = storyText.slice(Math.max(0, startIndex - contextWindow), startIndex).trim();
  const afterContext = storyText.slice(endIndex, Math.min(storyText.length, endIndex + contextWindow)).trim();

  return {
    beforeContext,
    afterContext,
  };
}

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

export function buildRewriteSelectionMessages({
  mode = STORY_REWRITE_MODES.REWRITE,
  genres = [],
  themes = [],
  tags = [],
  characters = [],
  premise = '',
  memory = '',
  storyText = '',
  selectedText = '',
  selectionRange = null,
  rewriteInstruction = '',
}) {
  const setupDetails = formatSetupDetails({
    genres,
    themes,
    tags,
    characters,
    premise,
  });
  const modeInstruction = buildRewriteModeInstruction(mode, rewriteInstruction);
  const { beforeContext, afterContext } = buildRewriteContext(storyText, selectionRange);

  const systemPrompt = `You are a fiction revision assistant helping a writer revise an in-progress manuscript.

Your output must only be the replacement prose for the selected excerpt.

Revision rules:
- Preserve continuity with the surrounding manuscript.
- Keep the same point of view, tense, voice, and scene intent unless the writer instruction explicitly changes that.
- Do not add headings, quotes around the result, commentary, or explanations.
- Return only the rewritten excerpt that should replace the selection.
- Respect paragraph breaks when they are helpful, but do not add gratuitous extra paragraphs.

Revision objective:
${modeInstruction}

${setupDetails}

Background Story Memory:
${memory || 'No established memory yet.'}`;

  const userPrompt = `Surrounding manuscript context before the selection:
---
${beforeContext || '(No earlier context provided.)'}
---

Selected prose to replace:
---
${selectedText || '(No selected text provided.)'}
---

Surrounding manuscript context after the selection:
---
${afterContext || '(No later context provided.)'}
---

Rewrite the selected prose now. Return only the replacement text.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}
