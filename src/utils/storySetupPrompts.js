import { formatCharactersContext } from './storyPromptShared';

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
