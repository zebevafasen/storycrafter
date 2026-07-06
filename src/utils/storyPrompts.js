import {
  STORY_GENERATION_MODES,
} from './storyGeneration';

function formatCharactersContext(characters = []) {
  if (!Array.isArray(characters) || characters.length === 0) {
    return 'No character profiles provided.';
  }

  return characters
    .map((character, index) => {
      const name = character.name?.trim() || `Character ${index + 1}`;
      const tags = Array.isArray(character.tags) && character.tags.length > 0
        ? character.tags.join(', ')
        : 'No character tags';
      const description = character.description?.trim() || 'No extra description';

      return `- ${name}\n  Tags: ${tags}\n  Description: ${description}`;
    })
    .join('\n');
}

function buildLengthConstraint(limitType, limitValue) {
  if (limitType === 'words' && limitValue) {
    return `Aim for approximately ${limitValue} words. Focus on a pacing that matches the story so far.`;
  }

  if (limitType === 'paragraphs' && limitValue) {
    return `Write exactly ${limitValue} paragraph(s). Do not write more than ${limitValue} paragraphs.`;
  }

  if (limitType === 'nolimit') {
    return 'Write a natural, complete segment. No strict word or paragraph limits, but keep it readable.';
  }

  return 'Write a natural continuation. Maintain the existing writing style.';
}

function formatSetupDetails({
  genres = [],
  themes = [],
  tags = [],
  characters = [],
  premise = '',
}) {
  return `Story Setup:
${genres.length > 0 ? `- Genres: ${genres.join(', ')}` : '- Genres: Not specified'}
${themes.length > 0 ? `- Themes: ${themes.join(', ')}` : '- Themes: Not specified'}
${tags.length > 0 ? `- Tags: ${tags.join(', ')}` : '- Tags: Not specified'}
${premise ? `- Premise/Summary: ${premise}` : '- Premise/Summary: Not specified'}

Character Profiles:
${formatCharactersContext(characters)}`;
}

function buildSharedStorySystemPrompt({
  modeInstruction,
  setupDetails,
  memory,
  lengthConstraint,
}) {
  return `You are a fiction co-writer producing polished prose for a live manuscript.

Your output must always be story prose, never a summary, outline, teaser, commentary, or explanation.

Core writing rules:
- Match the established tone, tense, point of view, pacing, and narrative intensity.
- Write through concrete action, dialogue, sensory detail, thought, and consequence.
- Use the story setup, character profiles, premise, and memory as hard guidance.
- Prioritize specificity and momentum over generic dramatic phrasing.
- Introduce only details that fit naturally with the established setup.
- Do not repeat the same information in slightly different words.
- Do not narrate like a back-cover blurb, chapter recap, outline, or moral summary.
- Do not stall for atmosphere alone; each segment should materially advance the scene or situation.
- Do not end with vague teaser lines, rhetorical foreshadowing, or "the story continues" energy.
- Avoid endings like "only time would tell," "the night stretched ahead of them," "what came next remained uncertain," or similar fade-outs.
- End on something concrete inside the scene: an action, discovery, decision, exchange, reversal, or grounded image.

Mode-specific objective:
${modeInstruction}

${setupDetails}

Background Story Memory:
${memory || 'No established memory yet.'}

Length Constraint:
${lengthConstraint}`;
}

function buildStoryExcerpt(storyText = '') {
  const trimmedStoryText = storyText.trim();
  return trimmedStoryText ? trimmedStoryText.slice(-5000) : '';
}

export function buildStartWritingMessages({
  genres = [],
  themes = [],
  tags = [],
  characters = [],
  premise = '',
  whatHappensNext = '',
  limitType = 'words',
  limitValue = 250,
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
  limitType = 'words',
  limitValue = 250,
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
  limitType = 'words',
  limitValue = 250,
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

export function buildNextSegmentMessages(context) {
  const resolvedMode = context?.mode || STORY_GENERATION_MODES.CONTINUE;
  return buildStorySegmentMessages({ ...context, mode: resolvedMode });
}

export function buildMemoryUpdateMessages({
  currentMemory = '',
  characters = [],
  premise = '',
  newSegmentText = '',
}) {
  const systemPrompt = `You are a story memory manager. Your task is to update the summary and key facts of a story based on the latest story segment additions.
Keep the memory concise, structured, and focused on:
- Active characters (their statuses, relationships, and inventory)
- The current setting/location
- Key plot developments or secrets revealed
- Active quests or short-term goals

Do not write the story. Only output the updated facts as structured bullet points.`;

  const userPrompt = `Current Memory:
${currentMemory || 'No memory yet.'}

Story Premise:
${premise || 'No premise set.'}

Character Profiles:
${formatCharactersContext(characters)}

Newest Story Segment:
---
${newSegmentText}
---

Generate the updated memory block based on this new information. Keep it under 250 words and format as a bulleted list.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

export function buildPremiseFromSetupMessages({
  genres = [],
  themes = [],
  tags = [],
  characters = [],
  currentPremise = '',
}) {
  const systemPrompt = `You are a fiction development assistant helping a writer turn a set of creative constraints into a compelling story premise.

Write a concise, vivid summary that:
- Feels like the back-cover description of a novel
- Establishes protagonist, setting, central conflict, and tone
- Uses the provided genres, themes, and tags as guidance
- Stays grounded and coherent even if the inputs are eclectic

Output only the summary. No title, no bullets, no prefatory text. Keep it to 2 short paragraphs or 120 words maximum.`;

  const userPrompt = `Build a story premise from this setup:
- Genres: ${genres.length > 0 ? genres.join(', ') : 'Not specified'}
- Themes: ${themes.length > 0 ? themes.join(', ') : 'Not specified'}
- Tags: ${tags.length > 0 ? tags.join(', ') : 'Not specified'}
- Character Profiles:
${formatCharactersContext(characters)}
${currentPremise ? `- Existing notes to refine or replace: ${currentPremise}` : ''}

Write the summary now.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

export function buildCharacterDescriptionMessages({
  character,
  genres = [],
  themes = [],
  tags = [],
  premise = '',
  otherCharacters = [],
}) {
  const name = character?.name?.trim() || 'This character';
  const characterTags = Array.isArray(character?.tags) && character.tags.length > 0
    ? character.tags.join(', ')
    : 'Not specified';
  const existingDescription = character?.description?.trim() || '';

  const systemPrompt = `You are a fiction assistant helping a writer flesh out a single character for a story.

Write a concise, vivid in-world character description that:
- Fits naturally with the provided story setup
- Uses the character's tags as strong guidance
- Covers appearance, presence, temperament, and role-relevant details
- Avoids generic filler and contradictory traits

Output only the description. No bullets, no headings, no prefatory text. Keep it to one compact paragraph of 60 to 120 words.`;

  const userPrompt = `Write a character description using this setup:
- Character name: ${name}
- Character tags: ${characterTags}
${existingDescription ? `- Existing notes to refine or replace: ${existingDescription}` : ''}
- Story genres: ${genres.length > 0 ? genres.join(', ') : 'Not specified'}
- Story themes: ${themes.length > 0 ? themes.join(', ') : 'Not specified'}
- Story tags: ${tags.length > 0 ? tags.join(', ') : 'Not specified'}
${premise ? `- Story premise: ${premise}` : ''}
- Other character profiles:
${otherCharacters.length > 0 ? formatCharactersContext(otherCharacters) : 'No other character profiles provided.'}

Write the character description now.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}
