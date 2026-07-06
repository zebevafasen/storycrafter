const EMPTY_MANUSCRIPT_DOC = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
};

function createParagraphNode(text = '') {
  const trimmedText = typeof text === 'string' ? text : '';

  if (!trimmedText) {
    return {
      type: 'paragraph',
    };
  }

  return {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: trimmedText,
      },
    ],
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

function cloneInlineNode(node) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (node.type === 'text') {
    return typeof node.text === 'string'
      ? {
          type: 'text',
          text: node.text,
        }
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

export function createEmptyManuscriptDoc() {
  return typeof structuredClone === 'function'
    ? structuredClone(EMPTY_MANUSCRIPT_DOC)
    : JSON.parse(JSON.stringify(EMPTY_MANUSCRIPT_DOC));
}

export function plainTextToManuscriptDoc(text = '') {
  const normalizedText = typeof text === 'string' ? text.replace(/\r\n/g, '\n') : '';
  const paragraphs = normalizedText.split(/\n{2,}/);

  if (!normalizedText.trim()) {
    return createEmptyManuscriptDoc();
  }

  return {
    type: 'doc',
    content: paragraphs.map((paragraph) => createParagraphNode(paragraph)),
  };
}

function extractTextFromNode(node) {
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

  return node.content.map((child) => extractTextFromNode(child)).join('');
}

export function manuscriptDocToPlainText(doc) {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.content)) {
    return '';
  }

  return doc.content
    .filter((node) => node?.type === 'paragraph')
    .map((paragraph) => extractTextFromNode(paragraph))
    .join('\n\n');
}

export function normalizeManuscriptDoc(value, fallbackText = '') {
  if (value && typeof value === 'object' && value.type === 'doc' && Array.isArray(value.content)) {
    const paragraphNodes = value.content
      .map((node) => cloneParagraphNode(node))
      .filter(Boolean);

    if (paragraphNodes.length > 0) {
      return {
        type: 'doc',
        content: paragraphNodes,
      };
    }
  }

  return plainTextToManuscriptDoc(fallbackText);
}

function createParagraphsFromGeneratedText(text = '', entryId = '') {
  const normalizedText = typeof text === 'string' ? text.replace(/\r\n/g, '\n') : '';
  const paragraphs = normalizedText.split(/\n{2,}/);

  return paragraphs.map((paragraph, index) => {
    const content = [];

    if (index === 0) {
      content.push(createAiSegmentAnchorNode(entryId));
    }

    if (paragraph) {
      content.push({
        type: 'text',
        text: paragraph,
      });
    }

    return content.length > 0
      ? {
          type: 'paragraph',
          content,
        }
      : {
          type: 'paragraph',
        };
  });
}

export function appendGeneratedSegmentToManuscriptDoc(doc, {
  entryId = '',
  generatedText = '',
} = {}) {
  const normalizedDoc = normalizeManuscriptDoc(doc);
  const generatedParagraphs = createParagraphsFromGeneratedText(generatedText, entryId);

  if (generatedParagraphs.length === 0) {
    return normalizedDoc;
  }

  const hasMeaningfulContent = manuscriptDocToPlainText(normalizedDoc).trim().length > 0;

  return {
    type: 'doc',
    content: hasMeaningfulContent
      ? [...normalizedDoc.content, ...generatedParagraphs]
      : generatedParagraphs,
  };
}
