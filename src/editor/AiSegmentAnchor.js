import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import AiSegmentAnchorView from './AiSegmentAnchorView';

const AiSegmentAnchor = Node.create({
  name: 'aiSegmentAnchor',
  group: 'inline',
  inline: true,
  atom: true,
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
        tag: 'span[data-ai-segment-anchor]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-ai-segment-anchor': '',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AiSegmentAnchorView);
  },
});

export default AiSegmentAnchor;
