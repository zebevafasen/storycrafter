import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import AiSegmentBlockView from './AiSegmentBlockView';

const AiSegmentBlock = Node.create({
  name: 'aiSegmentBlock',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  isolating: true,
  selectable: true,

  addAttributes() {
    return {
      entryId: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-ai-segment-block]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-ai-segment-block': '',
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AiSegmentBlockView);
  },
});

export default AiSegmentBlock;
