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
import { STORY_SCOPE_TYPES } from '../utils/storyStructure';

function clearNativeSelection() {
  if (typeof window === 'undefined') {
    return;
  }

  window.requestAnimationFrame(() => {
    const selection = window.getSelection?.();
    if (selection && !selection.isCollapsed) {
      selection.removeAllRanges();
    }
  });
}

function collapseEditorSelectionToEnd(editor) {
  if (!editor?.state?.doc || !editor?.view) {
    return;
  }

  const transaction = editor.state.tr.setSelection(TextSelection.atEnd(editor.state.doc));
  editor.view.dispatch(transaction);
  clearNativeSelection();
}

function getSelectionPlainTextOffset(editor) {
  const { state } = editor;
  return state.doc.textBetween(0, state.selection.from, '\n\n').length;
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

function buildRewriteSelectionPayload(view, sceneId) {
  const { selection } = view.state;
  if (selection.empty) {
    return null;
  }

  const { startIndex, endIndex, selectedText } = getSelectionPlainTextRange(view.state);
  if (!selectedText.trim()) {
    return null;
  }

  return {
    sceneId,
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

function getStructureHeading(kind, index, title) {
  const label = `${kind} ${index + 1}`;
  const normalizedTitle = (title || '').trim();

  return {
    label,
    title: normalizedTitle && normalizedTitle !== label ? normalizedTitle : '',
  };
}

function getWordCount(text = '') {
  const trimmedText = text.trim();
  return trimmedText ? trimmedText.split(/\s+/).length : 0;
}

function ScopeButton({
  label,
  isActive,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`story-scope-btn ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function SceneEditor({
  entry,
  activeSceneId,
  isGenerating,
  generationHistory = [],
  lastGeneration = null,
  onSceneManuscriptDocChange,
  onActiveSceneChange,
  onOpenWriteCommands,
  onAddScene,
  rewriteSelectionRequest,
  onRewriteSelectionApplied,
  onRegenerateLast,
  onDeleteLatest,
}) {
  const { act, chapter, scene, actIndex, chapterIndex, sceneIndex } = entry;
  const serializedDoc = useMemo(() => JSON.stringify(scene.manuscriptDoc), [scene.manuscriptDoc]);
  const appliedRewriteRequestIdRef = useRef('');
  const sceneHistory = useMemo(
    () => generationHistory.filter((entryItem) => !entryItem.sceneId || entryItem.sceneId === scene.id),
    [generationHistory, scene.id],
  );

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
        placeholder: 'Start typing this scene here... Or type / on a blank line to open writing commands.',
      }),
    ],
    content: scene.manuscriptDoc,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'story-rich-editor scene-rich-editor',
      },
      handleDOMEvents: {
        focus: () => {
          onActiveSceneChange(scene.id);
          return false;
        },
        mousedown: () => {
          onActiveSceneChange(scene.id);
          return false;
        },
      },
      handleKeyDown(view, event) {
        onActiveSceneChange(scene.id);

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
          const rewriteSelectionPayload = buildRewriteSelectionPayload(view, scene.id);
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
          sceneId: scene.id,
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
      onSceneManuscriptDocChange(scene.id, nextEditor.getJSON());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentSerializedDoc = JSON.stringify(editor.getJSON());
    if (currentSerializedDoc !== serializedDoc) {
      editor.commands.setContent(scene.manuscriptDoc, { emitUpdate: false });
      collapseEditorSelectionToEnd(editor);
    }
  }, [editor, scene.manuscriptDoc, serializedDoc]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!isGenerating);
  }, [editor, isGenerating]);

  useEffect(() => {
    if (
      !editor
      || !rewriteSelectionRequest?.requestId
      || rewriteSelectionRequest.sceneId !== scene.id
    ) {
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
    collapseEditorSelectionToEnd(editor);

    appliedRewriteRequestIdRef.current = rewriteSelectionRequest.requestId;
    const nextDoc = editor.getJSON();

    onRewriteSelectionApplied?.({
      sceneId: scene.id,
      requestId: rewriteSelectionRequest.requestId,
      nextManuscriptDoc: nextDoc,
      nextStoryText: manuscriptDocToPlainText(nextDoc),
    });
  }, [editor, onRewriteSelectionApplied, rewriteSelectionRequest, scene.id]);

  const handleSelectHistoryEntry = (historyEntry) => {
    if (!editor || !historyEntry?.id || historyEntry.sceneId !== scene.id) {
      return;
    }

    let anchorPosition = null;

    editor.state.doc.descendants((node, pos) => {
      if (
        (node.type.name === 'aiSegmentBlock' || node.type.name === 'aiSegmentAnchor')
        && node.attrs?.entryId === historyEntry.id
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

  const showActHeading = chapterIndex === 0 && sceneIndex === 0;
  const showChapterHeading = sceneIndex === 0;
  const actHeading = getStructureHeading('Act', actIndex, act.title);
  const chapterHeading = getStructureHeading('Chapter', chapterIndex, chapter.title);
  const sceneHeading = getStructureHeading('Scene', sceneIndex, scene.title);
  const sceneText = manuscriptDocToPlainText(scene.manuscriptDoc);
  const sceneWordCount = getWordCount(sceneText);
  const isActiveScene = activeSceneId === scene.id;

  return (
    <StoryEditorContext.Provider
      value={{
        generationHistory: sceneHistory,
        lastGeneration: lastGeneration?.sceneId === scene.id ? lastGeneration : null,
        storyText: sceneText,
        isGenerating,
        onSelectHistoryEntry: handleSelectHistoryEntry,
        onRegenerateLast,
        onDeleteLatest,
      }}
    >
      <section className={`scene-editor-block ${isActiveScene ? 'active' : ''}`}>
        {showActHeading && (
          <div className="story-structure-heading act-heading">
            <strong>{actHeading.label}</strong>
            {actHeading.title && <span>{actHeading.title}</span>}
          </div>
        )}

        {showChapterHeading && (
          <div className="story-structure-heading chapter-heading">
            <strong>{chapterHeading.label}</strong>
            {chapterHeading.title && <span>{chapterHeading.title}</span>}
          </div>
        )}

        <div className="story-structure-heading scene-heading">
          <strong>{sceneHeading.label}</strong>
          {sceneHeading.title && <span>{sceneHeading.title}</span>}
          <small>{sceneWordCount} words</small>
          {isActiveScene && <em>Active scene</em>}
        </div>

        <div className="story-textarea-shell rich-editor-shell scene-editor-shell">
          <EditorContent editor={editor} className="story-editor-content scene-editor-content" />
        </div>

        {sceneWordCount === 0 && (
          <div className="scene-empty-actions">
            <button type="button" onClick={() => onAddScene?.(chapter.id)}>
              Add next scene
            </button>
          </div>
        )}
      </section>
    </StoryEditorContext.Provider>
  );
}

export default function StoryCanvas({
  storyStructure,
  visibleSceneEntries = [],
  activeSceneId,
  isGenerating,
  generationHistory = [],
  lastGeneration = null,
  onSceneManuscriptDocChange,
  onActiveSceneChange,
  onViewScopeChange,
  onAddScene,
  onOpenWriteCommands,
  rewriteSelectionRequest,
  onRewriteSelectionApplied,
  onRegenerateLast,
  onDeleteLatest,
}) {
  const activeEntry = visibleSceneEntries.find((entry) => entry.scene.id === activeSceneId)
    || visibleSceneEntries[0];
  const currentScope = storyStructure?.viewScope || { type: STORY_SCOPE_TYPES.PROJECT, id: null };

  return (
    <div className="story-canvas-container structured-story-canvas">
      {activeEntry && (
        <div className="story-scope-bar">
          <div className="story-scope-path">
            <ScopeButton
              label="Whole Story"
              isActive={currentScope.type === STORY_SCOPE_TYPES.PROJECT}
              onClick={() => onViewScopeChange?.({ type: STORY_SCOPE_TYPES.PROJECT, id: null })}
            />
            <ScopeButton
              label={activeEntry.act.title}
              isActive={currentScope.type === STORY_SCOPE_TYPES.ACT && currentScope.id === activeEntry.act.id}
              onClick={() => onViewScopeChange?.({ type: STORY_SCOPE_TYPES.ACT, id: activeEntry.act.id })}
            />
            <ScopeButton
              label={activeEntry.chapter.title}
              isActive={currentScope.type === STORY_SCOPE_TYPES.CHAPTER && currentScope.id === activeEntry.chapter.id}
              onClick={() => onViewScopeChange?.({ type: STORY_SCOPE_TYPES.CHAPTER, id: activeEntry.chapter.id })}
            />
            <ScopeButton
              label={activeEntry.scene.title}
              isActive={currentScope.type === STORY_SCOPE_TYPES.SCENE && currentScope.id === activeEntry.scene.id}
              onClick={() => {
                onActiveSceneChange(activeEntry.scene.id);
                onViewScopeChange?.({ type: STORY_SCOPE_TYPES.SCENE, id: activeEntry.scene.id });
              }}
            />
          </div>
          <span className="story-scope-meta">
            {visibleSceneEntries.length} visible scene{visibleSceneEntries.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      <div className="story-scope-editor">
        {visibleSceneEntries.map((entry) => (
          <SceneEditor
            key={entry.scene.id}
            entry={entry}
            activeSceneId={activeSceneId}
            isGenerating={isGenerating}
            generationHistory={generationHistory}
            lastGeneration={lastGeneration}
            onSceneManuscriptDocChange={onSceneManuscriptDocChange}
            onActiveSceneChange={onActiveSceneChange}
            onAddScene={onAddScene}
            onOpenWriteCommands={onOpenWriteCommands}
            rewriteSelectionRequest={rewriteSelectionRequest}
            onRewriteSelectionApplied={onRewriteSelectionApplied}
            onRegenerateLast={onRegenerateLast}
            onDeleteLatest={onDeleteLatest}
          />
        ))}
      </div>

      {isGenerating && (
        <div className="canvas-status">
          <Sparkles size={12} style={{ animation: 'spin 2s linear infinite' }} />
          <span>AI is co-writing...</span>
        </div>
      )}
    </div>
  );
}
