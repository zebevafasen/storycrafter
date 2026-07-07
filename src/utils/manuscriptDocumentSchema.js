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

export function cloneTopLevelNode(node) {
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

export function createEmptyManuscriptDoc() {
  return typeof structuredClone === 'function'
    ? structuredClone(EMPTY_MANUSCRIPT_DOC)
    : JSON.parse(JSON.stringify(EMPTY_MANUSCRIPT_DOC));
}
