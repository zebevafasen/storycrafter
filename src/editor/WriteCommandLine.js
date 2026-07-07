import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import WriteCommandLineView from './WriteCommandLineView';

const WriteCommandLine = Node.create({
  name: 'writeCommandLine',
  group: 'block',
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      anchorId: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-write-command-line]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-write-command-line': '',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WriteCommandLineView);
  },
});

export default WriteCommandLine;
