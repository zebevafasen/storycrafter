import { NodeViewWrapper } from '@tiptap/react';
import { Slash } from 'lucide-react';

export default function WriteCommandLineView() {
  return (
    <NodeViewWrapper as="div" className="story-command-placeholder" contentEditable={false}>
      <span className="story-command-placeholder-pill">
        <Slash size={12} />
        <span>Command</span>
      </span>
    </NodeViewWrapper>
  );
}
