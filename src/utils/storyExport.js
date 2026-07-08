import { storyStructureToExportText } from './storyStructure';

export function buildStoryExport({
  format,
  genres,
  themes,
  tags,
  characters,
  premise,
  memory,
  storyText,
  storyStructure = null,
  exportScope = null,
}) {
  const filenamePrefix = exportScope ? 'story-current-scope' : 'story';
  const filename = `${filenamePrefix}.${format === 'markdown' ? 'md' : 'txt'}`;
  const manuscriptText = storyStructure
    ? storyStructureToExportText(storyStructure, format, exportScope)
    : storyText;

  if (format === 'markdown') {
    let outputText = '# Story Setup\n\n';
    if (genres.length) outputText += `**Genres:** ${genres.join(', ')}\n`;
    if (themes.length) outputText += `**Themes:** ${themes.join(', ')}\n`;
    if (tags.length) outputText += `**Tags:** ${tags.join(', ')}\n\n`;
    if (characters.length) {
      outputText += '## Characters\n';
      characters.forEach((character) => {
        const name = character.name?.trim() || 'Unnamed Character';
        outputText += `### ${name}\n`;
        if (character.tags?.length) outputText += `**Tags:** ${character.tags.join(', ')}\n`;
        if (character.description?.trim()) outputText += `${character.description.trim()}\n`;
        outputText += '\n';
      });
    }
    if (premise) outputText += `## Premise\n${premise}\n\n`;
    if (memory) outputText += `## Running Memory\n${memory}\n\n`;
    outputText += `## Story\n\n${manuscriptText}`;

    return { filename, outputText, manuscriptText };
  }

  const outputText = [
    'Story Details',
    `Genres: ${genres.join(', ')}`,
    `Themes: ${themes.join(', ')}`,
    `Tags: ${tags.join(', ')}`,
    '',
    'Characters:',
    ...(characters.length > 0
      ? characters.flatMap((character) => [
          `- ${character.name?.trim() || 'Unnamed Character'}`,
          `  Tags: ${character.tags?.length ? character.tags.join(', ') : 'None'}`,
          `  Description: ${character.description?.trim() || 'None'}`,
        ])
      : ['None']),
    `Premise: ${premise}`,
    '',
    'Memory:',
    memory,
    '',
    'Story:',
    '',
    manuscriptText,
  ].join('\n');

  return { filename, outputText, manuscriptText };
}

export function downloadTextFile(filename, outputText) {
  const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
