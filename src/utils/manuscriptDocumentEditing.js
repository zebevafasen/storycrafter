import {
  createAiSegmentBlockNode,
  createParagraphNode,
  createWriteCommandLineNode,
} from './manuscriptDocumentSchema';
import {
  createParagraphNodesFromText,
  extractParagraphTextsFromTopLevelNode,
  isEmptyPlainParagraph,
  normalizeManuscriptDoc,
  stripTrailingEmptyParagraphNodes,
} from './manuscriptDocumentText';

function clampIndex(value, max) {
  if (!Number.isInteger(value)) {
    return max;
  }

  return Math.min(Math.max(value, 0), max);
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
