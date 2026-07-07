export function formatCharactersContext(characters = []) {
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

export function buildLengthConstraint(limitType, limitValue) {
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

export function formatSetupDetails({
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

export function buildSharedStorySystemPrompt({
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

export function buildStoryExcerpt(storyText = '') {
  const trimmedStoryText = storyText.trim();
  return trimmedStoryText ? trimmedStoryText.slice(-5000) : '';
}
