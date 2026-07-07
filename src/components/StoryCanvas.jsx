import { useEffect, useMemo, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { Sparkles } from 'lucide-react';
import AiSegmentBlock from '../editor/AiSegmentBlock';
import AiSegmentAnchor from '../editor/AiSegmentAnchor';
import { StoryEditorContext } from '../editor/StoryEditorContext';
import WriteCommandLine from '../editor/WriteCommandLine';
import {
  createParagraphNodesFromText,
  manuscriptDocToPlainText,
} from '../utils/manuscriptDocument';

function getSelectionPlainTextOffset(editor) {
  const { state } = editor;
  const textBeforeSelection = state.doc.textBetween(0, state.selection.from, '\n\n');
  return textBeforeSelection.length;
}

function createAnchorRectFromView(view) {
  const caretCoordinates = view.coordsAtPos(view.state.selection.from);

  return {
    top: caretCoordinates.top,
    bottom: caretCoordinates.bottom,
    left: caretCoordinates.left,
    right: caretCoordinates.right,
  };
}

function createSelectionAnchorRectFromView(view) {
  const startCoordinates = view.coordsAtPos(view.state.selection.from);
  const endCoordinates = view.coordsAtPos(view.state.selection.to);

  return {
    top: Math.min(startCoordinates.top, endCoordinates.top),
    bottom: Math.max(startCoordinates.bottom, endCoordinates.bottom),
    left: Math.min(startCoordinates.left, endCoordinates.left),
    right: Math.max(startCoordinates.right, endCoordinates.right),
  };
}

function getCurrentTopLevelIndex(selection) {
  return Math.max(0, selection.$from.indexAfter(0) - 1);
}

function createInsertionTargetFromView(view) {
  const { selection, doc } = view.state;
  const topLevelIndex = getCurrentTopLevelIndex(selection);
  const topLevelNode = doc.child(topLevelIndex);
  const isInsideSegmentBlock = topLevelNode?.type?.name === 'aiSegmentBlock';
  const isReplaceableEmptyParagraph = topLevelNode?.type?.name === 'paragraph'
    && !(topLevelNode.textContent || '').trim();

  return {
    insertAtIndex: isInsideSegmentBlock ? topLevelIndex + 1 : topLevelIndex,
    replaceEmptyParagraph: isReplaceableEmptyParagraph && !isInsideSegmentBlock,
  };
}

function getSelectionPlainTextRange(state) {
  const startIndex = state.doc.textBetween(0, state.selection.from, '\n\n').length;
  const selectedText = state.doc.textBetween(state.selection.from, state.selection.to, '\n\n');

  return {
    startIndex,
    endIndex: startIndex + selectedText.length,
    selectedText,
  };
}

function buildRewriteSelectionPayload(view) {
  const { selection } = view.state;
  if (selection.empty) {
    return null;
  }

  const { startIndex, endIndex, selectedText } = getSelectionPlainTextRange(view.state);
  if (!selectedText.trim()) {
    return null;
  }

  return {
    source: 'editor-selection',
    anchorRect: createSelectionAnchorRectFromView(view),
    selection: {
      from: selection.from,
      to: selection.to,
    },
    selectionDocRange: {
      from: selection.from,
      to: selection.to,
    },
    selectionPlainTextRange: {
      startIndex,
      endIndex,
    },
    selectedText,
  };
}

export default function StoryCanvas({
  storyText,
  manuscriptDoc,
  isGenerating,
  generationHistory = [],
  lastGeneration = null,
  onManuscriptDocChange,
  onOpenWriteCommands,
  rewriteSelectionRequest,
  onRewriteSelectionApplied,
  onRegenerateLast,
  onDeleteLatest,
}) {
  const serializedDoc = useMemo(() => JSON.stringify(manuscriptDoc), [manuscriptDoc]);
  const appliedRewriteRequestIdRef = useRef('');

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
      AiSegmentBlock,
      AiSegmentAnchor,
      WriteCommandLine,
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
          const rewriteSelectionPayload = buildRewriteSelectionPayload(view);
          if (!rewriteSelectionPayload) {
            return false;
          }

          event.preventDefault();
          onOpenWriteCommands(null, rewriteSelectionPayload);
          return true;
        }

        const currentBlockText = selection.$from.parent.textContent || '';
        if (currentBlockText.trim().length > 0) {
          return false;
        }

        event.preventDefault();
        onOpenWriteCommands(null, {
          source: 'editor',
          anchorRect: createAnchorRectFromView(view),
          selection: {
            from: selection.from,
            to: selection.to,
          },
          insertionTarget: createInsertionTargetFromView(view),
          plainTextOffset: getSelectionPlainTextOffset({ state: view.state }),
        });
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

  useEffect(() => {
    if (!editor || !rewriteSelectionRequest?.requestId) {
      return;
    }

    if (appliedRewriteRequestIdRef.current === rewriteSelectionRequest.requestId) {
      return;
    }

    const { from, to } = rewriteSelectionRequest.selectionDocRange || {};
    if (!Number.isInteger(from) || !Number.isInteger(to) || from >= to) {
      return;
    }

    const replacementText = rewriteSelectionRequest.rewrittenText || '';
    const replacementParagraphs = createParagraphNodesFromText(replacementText);
    const replacementContent = replacementParagraphs.length > 1
      ? replacementParagraphs
      : replacementText;

    editor.view.dispatch(
      editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to)),
    );
    editor.commands.insertContentAt({ from, to }, replacementContent);

    appliedRewriteRequestIdRef.current = rewriteSelectionRequest.requestId;
    const nextDoc = editor.getJSON();

    onRewriteSelectionApplied?.({
      requestId: rewriteSelectionRequest.requestId,
      nextManuscriptDoc: nextDoc,
      nextStoryText: manuscriptDocToPlainText(nextDoc),
    });
  }, [editor, onRewriteSelectionApplied, rewriteSelectionRequest]);

  const handleSelectHistoryEntry = (entry) => {
    if (!editor || !entry?.id) {
      return;
    }

    let anchorPosition = null;

    editor.state.doc.descendants((node, pos) => {
      if (
        (node.type.name === 'aiSegmentBlock' || node.type.name === 'aiSegmentAnchor')
        && node.attrs?.entryId === entry.id
      ) {
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
