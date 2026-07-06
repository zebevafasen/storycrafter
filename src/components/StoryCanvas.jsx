import React, { useEffect, useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { NodeSelection } from '@tiptap/pm/state';
import { Sparkles } from 'lucide-react';
import AiSegmentAnchor from '../editor/AiSegmentAnchor';
import { StoryEditorContext } from '../editor/StoryEditorContext';

function getSelectionPlainTextOffset(editor) {
  const { state } = editor;
  const textBeforeSelection = state.doc.textBetween(0, state.selection.from, '\n\n');
  return textBeforeSelection.length;
}

export default function StoryCanvas({
  storyText,
  manuscriptDoc,
  isGenerating,
  generationHistory = [],
  lastGeneration = null,
  onManuscriptDocChange,
  onOpenWriteCommands,
  onRegenerateLast,
  onDeleteLatest,
}) {
  const serializedDoc = useMemo(() => JSON.stringify(manuscriptDoc), [manuscriptDoc]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        listItem: false,
        orderedList: false,
      }),
      AiSegmentAnchor,
      Placeholder.configure({
        placeholder: 'Start typing your story here... Or type / on a blank line to open the writing commands.',
      }),
    ],
    content: manuscriptDoc,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'story-rich-editor',
      },
      handleKeyDown(view, event) {
        if (
          event.key !== '/'
          || event.altKey
          || event.ctrlKey
          || event.metaKey
          || typeof onOpenWriteCommands !== 'function'
        ) {
          return false;
        }

        const { selection } = view.state;
        if (!selection.empty) {
          return false;
        }

        const currentBlockText = selection.$from.parent.textContent || '';
        if (currentBlockText.trim().length > 0) {
          return false;
        }

        event.preventDefault();
        onOpenWriteCommands(null, getSelectionPlainTextOffset({ state: view.state }));
        return true;
      },
    },
    onUpdate({ editor: nextEditor }) {
      const nextDoc = nextEditor.getJSON();
      onManuscriptDocChange(nextDoc);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentSerializedDoc = JSON.stringify(editor.getJSON());
    if (currentSerializedDoc !== serializedDoc) {
      editor.commands.setContent(manuscriptDoc, { emitUpdate: false });
    }
  }, [editor, manuscriptDoc, serializedDoc]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!isGenerating);
  }, [editor, isGenerating]);

  const handleSelectHistoryEntry = (entry) => {
    if (!editor || !entry?.id) {
      return;
    }

    let anchorPosition = null;

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'aiSegmentAnchor' && node.attrs?.entryId === entry.id) {
        anchorPosition = pos;
        return false;
      }

      return true;
    });

    if (anchorPosition === null) {
      return;
    }

    const transaction = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, anchorPosition));
    editor.view.dispatch(transaction);
    editor.commands.focus();
    editor.commands.scrollIntoView();
  };

  return (
    <div className="story-canvas-container">
      <StoryEditorContext.Provider
        value={{
          generationHistory,
          lastGeneration,
          storyText,
          isGenerating,
          onSelectHistoryEntry: handleSelectHistoryEntry,
          onRegenerateLast,
          onDeleteLatest,
        }}
      >
        <div className="story-textarea-shell rich-editor-shell">
          <EditorContent editor={editor} className="story-editor-content" />
        </div>
      </StoryEditorContext.Provider>

      {isGenerating && (
        <div className="canvas-status">
          <Sparkles size={12} style={{ animation: 'spin 2s linear infinite' }} />
          <span>AI is co-writing...</span>
        </div>
      )}
    </div>
  );
}
