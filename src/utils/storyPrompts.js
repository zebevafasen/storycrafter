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

export function buildNextSegmentMessages({
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

  const systemPrompt = `You are a fiction co-writer continuing an existing story.

Your job is to write the next segment so it feels like a true continuation of the current manuscript, not a summary, outline, teaser, or ending.

Writing rules:
- Match the existing tone, tense, point of view, and narrative intensity of the story so far.
- Continue the scene through concrete action, dialogue, observation, and consequence.
- Prioritize specificity over generic dramatic phrasing.
- Use the provided genres, themes, tags, character profiles, premise, and memory as hard guidance.
- Move the story forward in a meaningful way rather than stalling or restating what is already known.
- Do not narrate like a back-cover blurb, moral summary, chapter recap, or outline.
- Do not end with vague teaser lines, rhetorical foreshadowing, or "the story continues" energy.
- Avoid endings like "only time would tell," "the night stretched ahead of them," "what came next remained uncertain," or similar open-ended fade-outs.
- End on something concrete inside the story: an action, decision, line of dialogue, discovery, reversal, or vivid image grounded in the scene.

Adhere strictly to these story details:
${genres.length > 0 ? `- Genres: ${genres.join(', ')}` : ''}
${themes.length > 0 ? `- Themes: ${themes.join(', ')}` : ''}
${tags.length > 0 ? `- Tags: ${tags.join(', ')}` : ''}
${premise ? `- Premise/Summary: ${premise}` : ''}

Character Profiles:
${formatCharactersContext(characters)}

Background Story Memory (Key Facts/Characters):
${memory || 'No established memory yet.'}

Length Constraint:
${lengthConstraint}`;

  const recentStory = storyText ? storyText.slice(-4000) : '';

  let userInstruction = 'Continue the story based on the details above.\n';
  if (whatHappensNext) {
    userInstruction += `- What should happen next: ${whatHappensNext}\n`;
  }
  if (nextMainEvent) {
    userInstruction += `- Next main event/goal to progress towards: ${nextMainEvent}\n`;
  }

  const userPrompt = `Here is the story so far:
---
${recentStory || '(The story is just beginning.)'}
---

Instructions for this new segment:
${userInstruction}
Write the next part of the story now:`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
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
