import {
  cloneTopLevelNode,
  createEmptyManuscriptDoc,
  createParagraphNode,
} from './manuscriptDocumentSchema';

function extractInlineText(node) {
  if (!node || typeof node !== 'object') {
    return '';
  }

  if (node.type === 'text') {
    return typeof node.text === 'string' ? node.text : '';
  }

  if (node.type === 'aiSegmentAnchor') {
    return '';
  }

  if (!Array.isArray(node.content)) {
    return '';
  }

  return node.content.map((child) => extractInlineText(child)).join('');
}

function extractParagraphText(node) {
  if (!node || node.type !== 'paragraph') {
    return '';
  }

  return Array.isArray(node.content)
    ? node.content.map((child) => extractInlineText(child)).join('')
    : '';
}

export function extractParagraphTextsFromTopLevelNode(node) {
  if (!node || typeof node !== 'object') {
    return [];
  }

  if (node.type === 'paragraph') {
    return [extractParagraphText(node)];
  }

  if (node.type === 'aiSegmentBlock') {
    return Array.isArray(node.content)
      ? node.content.map((child) => extractParagraphText(child))
      : [];
  }

  return [];
}

export function trimTrailingEmptyParagraphs(paragraphTexts = []) {
  const nextParagraphTexts = [...paragraphTexts];

  while (
    nextParagraphTexts.length > 0
    && !nextParagraphTexts[nextParagraphTexts.length - 1].trim()
  ) {
    nextParagraphTexts.pop();
  }

  return nextParagraphTexts;
}

export function isEmptyPlainParagraph(node) {
  return node?.type === 'paragraph'
    && !extractParagraphText(node).trim()
    && !(Array.isArray(node.content) && node.content.some((child) => child?.type === 'aiSegmentAnchor'));
}

export function stripTrailingEmptyParagraphNodes(nodes = []) {
  const nextNodes = [...nodes];

  while (nextNodes.length > 0 && isEmptyPlainParagraph(nextNodes[nextNodes.length - 1])) {
    nextNodes.pop();
  }

  return nextNodes;
}

export function createParagraphNodesFromText(text = '') {
  const normalizedText = typeof text === 'string' ? text.replace(/\r\n/g, '\n') : '';
  if (!normalizedText.trim()) {
    return [];
  }

  return normalizedText
    .split(/\n{2,}/)
    .map((paragraph) => createParagraphNode(paragraph));
}

export function plainTextToManuscriptDoc(text = '') {
  const normalizedText = typeof text === 'string' ? text.replace(/\r\n/g, '\n') : '';

  if (!normalizedText.trim()) {
    return createEmptyManuscriptDoc();
  }

  return {
    type: 'doc',
    content: createParagraphNodesFromText(normalizedText),
  };
}

export function manuscriptDocToPlainText(doc) {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.content)) {
    return '';
  }

  const paragraphTexts = trimTrailingEmptyParagraphs(
    doc.content.flatMap((node) => extractParagraphTextsFromTopLevelNode(node)),
  );

  return paragraphTexts.join('\n\n');
}

export function normalizeManuscriptDoc(value, fallbackText = '') {
  if (value && typeof value === 'object' && value.type === 'doc' && Array.isArray(value.content)) {
    const content = value.content
      .map((node) => cloneTopLevelNode(node))
      .filter(Boolean);

    if (content.length > 0) {
      return {
        type: 'doc',
        content,
      };
    }
  }

  return plainTextToManuscriptDoc(fallbackText);
}
