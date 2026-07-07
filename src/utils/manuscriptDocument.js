const EMPTY_MANUSCRIPT_DOC = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
};

function createTextNode(text = '') {
  return {
    type: 'text',
    text,
  };
}

export function createParagraphNode(text = '') {
  const normalizedText = typeof text === 'string' ? text : '';

  if (!normalizedText) {
    return {
      type: 'paragraph',
    };
  }

  return {
    type: 'paragraph',
    content: [createTextNode(normalizedText)],
  };
}

export function createAiSegmentAnchorNode(entryId = '') {
  return {
    type: 'aiSegmentAnchor',
    attrs: {
      entryId,
    },
  };
}

export function createAiSegmentBlockNode(entryId = '', content = [createParagraphNode()]) {
  return {
    type: 'aiSegmentBlock',
    attrs: {
      entryId,
    },
    content,
  };
}

export function createWriteCommandLineNode(anchorId = '') {
  return {
    type: 'writeCommandLine',
    attrs: {
      anchorId,
    },
  };
}

function clampIndex(value, max) {
  if (!Number.isInteger(value)) {
    return max;
  }

  return Math.min(Math.max(value, 0), max);
}

function cloneInlineNode(node) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (node.type === 'text') {
    return typeof node.text === 'string'
      ? createTextNode(node.text)
      : null;
  }

  if (node.type === 'aiSegmentAnchor') {
    return createAiSegmentAnchorNode(node.attrs?.entryId || '');
  }

  return null;
}

function cloneParagraphNode(node) {
  if (!node || node.type !== 'paragraph') {
    return null;
  }

  const content = Array.isArray(node.content)
    ? node.content.map((child) => cloneInlineNode(child)).filter(Boolean)
    : [];

  return content.length > 0
    ? {
        type: 'paragraph',
        content,
      }
    : {
        type: 'paragraph',
      };
}

function cloneAiSegmentBlockNode(node) {
  if (!node || node.type !== 'aiSegmentBlock') {
    return null;
  }

  const content = Array.isArray(node.content)
    ? node.content.map((child) => cloneParagraphNode(child)).filter(Boolean)
    : [];

  return createAiSegmentBlockNode(
    node.attrs?.entryId || '',
    content.length > 0 ? content : [createParagraphNode()],
  );
}

function cloneTopLevelNode(node) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (node.type === 'paragraph') {
    return cloneParagraphNode(node);
  }

  if (node.type === 'aiSegmentBlock') {
    return cloneAiSegmentBlockNode(node);
  }

  if (node.type === 'writeCommandLine') {
    return createWriteCommandLineNode(node.attrs?.anchorId || '');
  }

  return null;
}

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

function extractParagraphTextsFromTopLevelNode(node) {
  if (!node || typeof node !== 'object') {
    return [];
  }

  if (node.type === 'paragraph') {
    return [extractParagraphText(node)];
  }

  if (node.type === 'aiSegmentBlock') {
    return Array.isArray(node.content)
      ? node.content
        .map((child) => extractParagraphText(child))
      : [];
  }

  return [];
}

function trimTrailingEmptyParagraphs(paragraphTexts = []) {
  const nextParagraphTexts = [...paragraphTexts];

  while (
    nextParagraphTexts.length > 0
    && !nextParagraphTexts[nextParagraphTexts.length - 1].trim()
  ) {
    nextParagraphTexts.pop();
  }

  return nextParagraphTexts;
}

function isEmptyPlainParagraph(node) {
  return node?.type === 'paragraph'
    && !extractParagraphText(node).trim()
    && !(Array.isArray(node.content) && node.content.some((child) => child?.type === 'aiSegmentAnchor'));
}

function stripTrailingEmptyParagraphNodes(nodes = []) {
  const nextNodes = [...nodes];

  while (nextNodes.length > 0 && isEmptyPlainParagraph(nextNodes[nextNodes.length - 1])) {
    nextNodes.pop();
  }

  return nextNodes;
}

function removeExistingSegmentBlock(content = [], entryId = '') {
  if (!entryId) {
    return {
      content,
      index: -1,
    };
  }

  const existingIndex = content.findIndex((node) => (
    node?.type === 'aiSegmentBlock' && node.attrs?.entryId === entryId
  ));

  if (existingIndex === -1) {
    return {
      content,
      index: -1,
    };
  }

  return {
    content: [
      ...content.slice(0, existingIndex),
      ...content.slice(existingIndex + 1),
    ],
    index: existingIndex,
  };
}

function normalizeInsertionTarget(insertionTarget, contentLength) {
  if (!insertionTarget || typeof insertionTarget !== 'object') {
    return null;
  }

  const insertAtIndex = clampIndex(insertionTarget.insertAtIndex, contentLength);

  return {
    insertAtIndex,
    replaceEmptyParagraph: Boolean(insertionTarget.replaceEmptyParagraph),
  };
}

function findWriteCommandLineIndex(content = [], anchorId = '') {
  if (!anchorId) {
    return -1;
  }

  return content.findIndex((node) => (
    node?.type === 'writeCommandLine' && node.attrs?.anchorId === anchorId
  ));
}

function removeReplaceableEmptyParagraphAtTarget(content = [], insertAtIndex = 0) {
  if (isEmptyPlainParagraph(content[insertAtIndex])) {
    return {
      content: [
        ...content.slice(0, insertAtIndex),
        ...content.slice(insertAtIndex + 1),
      ],
      insertAtIndex,
    };
  }

  if (insertAtIndex > 0 && isEmptyPlainParagraph(content[insertAtIndex - 1])) {
    return {
      content: [
        ...content.slice(0, insertAtIndex - 1),
        ...content.slice(insertAtIndex),
      ],
      insertAtIndex: insertAtIndex - 1,
    };
  }

  return {
    content,
    insertAtIndex,
  };
}

function createParagraphNodesFromText(text = '') {
  const normalizedText = typeof text === 'string' ? text.replace(/\r\n/g, '\n') : '';
  if (!normalizedText.trim()) {
    return [];
  }

  return normalizedText
    .split(/\n{2,}/)
    .map((paragraph) => createParagraphNode(paragraph));
}

export function createEmptyManuscriptDoc() {
  return typeof structuredClone === 'function'
    ? structuredClone(EMPTY_MANUSCRIPT_DOC)
    : JSON.parse(JSON.stringify(EMPTY_MANUSCRIPT_DOC));
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

export function insertWriteCommandLineInManuscriptDoc(doc, {
  anchorId = '',
  insertionTarget = null,
} = {}) {
  if (!anchorId) {
    return normalizeManuscriptDoc(doc);
  }

  const normalizedDoc = normalizeManuscriptDoc(doc);
  const target = normalizeInsertionTarget(insertionTarget, normalizedDoc.content.length);
  let workingContent = [...normalizedDoc.content];
  let insertAtIndex = target ? target.insertAtIndex : workingContent.length;

  if (target?.replaceEmptyParagraph) {
    const adjustedTarget = removeReplaceableEmptyParagraphAtTarget(workingContent, insertAtIndex);
    workingContent = adjustedTarget.content;
    insertAtIndex = adjustedTarget.insertAtIndex;
  }

  insertAtIndex = clampIndex(insertAtIndex, workingContent.length);

  return {
    type: 'doc',
    content: [
      ...workingContent.slice(0, insertAtIndex),
      createWriteCommandLineNode(anchorId),
      ...workingContent.slice(insertAtIndex),
    ],
  };
}

export function removeWriteCommandLineFromManuscriptDoc(doc, anchorId = '') {
  if (!anchorId) {
    return normalizeManuscriptDoc(doc);
  }

  const normalizedDoc = normalizeManuscriptDoc(doc);
  const placeholderIndex = findWriteCommandLineIndex(normalizedDoc.content, anchorId);

  if (placeholderIndex === -1) {
    return normalizedDoc;
  }

  return {
    type: 'doc',
    content: [
      ...normalizedDoc.content.slice(0, placeholderIndex),
      ...normalizedDoc.content.slice(placeholderIndex + 1),
    ],
  };
}

export function insertGeneratedSegmentInManuscriptDoc(doc, {
  entryId = '',
  generatedText = '',
  commandAnchorId = '',
  insertionTarget = null,
} = {}) {
  const normalizedDoc = normalizeManuscriptDoc(doc);
  const generatedParagraphs = createParagraphNodesFromText(generatedText);

  if (generatedParagraphs.length === 0) {
    return normalizedDoc;
  }

  const { content: contentWithoutExistingSegment, index: existingSegmentIndex } = removeExistingSegmentBlock(
    normalizedDoc.content,
    entryId,
  );
  const placeholderIndex = findWriteCommandLineIndex(contentWithoutExistingSegment, commandAnchorId);
  const contentWithoutPlaceholder = placeholderIndex >= 0
    ? [
        ...contentWithoutExistingSegment.slice(0, placeholderIndex),
        ...contentWithoutExistingSegment.slice(placeholderIndex + 1),
      ]
    : contentWithoutExistingSegment;

  const target = normalizeInsertionTarget(insertionTarget, contentWithoutPlaceholder.length);
  let workingContent = target
    ? [...contentWithoutPlaceholder]
    : stripTrailingEmptyParagraphNodes(contentWithoutPlaceholder);
  let insertAtIndex = placeholderIndex >= 0
    ? placeholderIndex
    : (existingSegmentIndex >= 0
    ? existingSegmentIndex
    : (target ? target.insertAtIndex : workingContent.length));

  if (placeholderIndex === -1 && existingSegmentIndex === -1 && target?.replaceEmptyParagraph) {
    const adjustedTarget = removeReplaceableEmptyParagraphAtTarget(workingContent, insertAtIndex);
    workingContent = adjustedTarget.content;
    insertAtIndex = adjustedTarget.insertAtIndex;
  }

  insertAtIndex = clampIndex(insertAtIndex, workingContent.length);
  const shouldAppendTrailingParagraph = insertAtIndex >= workingContent.length;
  const nextContent = [
    ...workingContent.slice(0, insertAtIndex),
    createAiSegmentBlockNode(entryId, generatedParagraphs),
    ...(shouldAppendTrailingParagraph ? [createParagraphNode()] : []),
    ...workingContent.slice(insertAtIndex),
  ];

  return {
    type: 'doc',
    content: nextContent,
  };
}

export function appendGeneratedSegmentToManuscriptDoc(doc, options = {}) {
  return insertGeneratedSegmentInManuscriptDoc(doc, options);
}

export function getGeneratedSegmentRangeFromManuscriptDoc(doc, entryId = '') {
  if (!entryId || !doc || typeof doc !== 'object' || !Array.isArray(doc.content)) {
    return null;
  }

  const paragraphEntries = doc.content.flatMap((node) => {
    const ownerEntryId = node?.type === 'aiSegmentBlock'
      ? node.attrs?.entryId || ''
      : '';

    return extractParagraphTextsFromTopLevelNode(node).map((text) => ({
      text,
      ownerEntryId,
    }));
  });

  while (paragraphEntries.length > 0 && !paragraphEntries[paragraphEntries.length - 1].text.trim()) {
    paragraphEntries.pop();
  }

  let cursor = 0;
  let startIndex = null;
  let endIndex = null;

  paragraphEntries.forEach((entry, index) => {
    const paragraphStart = cursor;
    const paragraphEnd = paragraphStart + entry.text.length;

    if (entry.ownerEntryId === entryId) {
      if (startIndex === null) {
        startIndex = paragraphStart;
      }

      endIndex = paragraphEnd;
    }

    cursor = paragraphEnd;
    if (index < paragraphEntries.length - 1) {
      cursor += 2;
    }
  });

  if (startIndex === null || endIndex === null) {
    return null;
  }

  return {
    startIndex,
    endIndex,
  };
}
