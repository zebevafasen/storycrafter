import React, { useMemo, useState } from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { ChevronDown, ChevronUp, History, RotateCcw, Trash2 } from 'lucide-react';
import { useStoryEditorContext } from './StoryEditorContext';
import { getStoryGenerationModeLabel } from '../utils/storyGeneration';

function formatPreview(text) {
  const compactText = text.trim().replace(/\s+/g, ' ');
  if (!compactText) {
    return 'No generated text recorded.';
  }

  return compactText.length > 96
    ? `${compactText.slice(0, 93)}...`
    : compactText;
}

function extractParagraphText(node) {
  if (!node || node.type?.name !== 'paragraph') {
    return '';
  }

  if (!node.content || typeof node.content.forEach !== 'function') {
    return '';
  }

  let text = '';

  node.content.forEach((childNode) => {
    if (childNode.type?.name === 'text') {
      text += childNode.text || '';
      return;
    }

    if (childNode.content && typeof childNode.content.forEach === 'function') {
      text += extractParagraphText(childNode);
    }
  });

  return text;
}

function extractSegmentText(node) {
  if (!node?.content || typeof node.content.forEach !== 'function') {
    return '';
  }

  const paragraphs = [];

  node.content.forEach((childNode) => {
    if (childNode.type?.name === 'paragraph') {
      paragraphs.push(extractParagraphText(childNode));
    }
  });

  while (paragraphs.length > 0 && !paragraphs[paragraphs.length - 1].trim()) {
    paragraphs.pop();
  }

  return paragraphs.join('\n\n');
}

function getEntryStatus(entry, currentSegmentText) {
  if (!entry?.isApplied) {
    return 'Removed';
  }

  if (currentSegmentText !== entry.generatedText) {
    return 'Edited';
  }

  return 'In Draft';
}

export default function AiSegmentBlockView({ node }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    generationHistory,
    lastGeneration,
    isGenerating,
    onSelectHistoryEntry,
    onRegenerateLast,
    onDeleteLatest,
  } = useStoryEditorContext();

  const entryId = node.attrs?.entryId || '';
  const currentEntry = generationHistory.find((entry) => entry.id === entryId) || null;
  const latestEntries = useMemo(() => [...generationHistory].reverse().slice(0, 6), [generationHistory]);
  const currentSegmentText = useMemo(() => extractSegmentText(node), [node]);

  return (
    <NodeViewWrapper as="div" className="story-segment-block-wrapper">
      <div className={`story-segment-block ${isExpanded ? 'expanded' : ''}`}>
        <div className="story-segment-block-header" contentEditable={false}>
          <button
            type="button"
            className="story-command-anchor-toggle"
            onClick={() => setIsExpanded((isOpen) => !isOpen)}
            aria-label={`Open AI segment details (${generationHistory.length} segment${generationHistory.length === 1 ? '' : 's'})`}
            title={`AI segment history: ${generationHistory.length} segment${generationHistory.length === 1 ? '' : 's'}`}
          >
            <span className="story-command-anchor-badge">
              <History size={10} />
              <span>AI</span>
              <span className="story-command-anchor-count">{generationHistory.length}</span>
            </span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {isExpanded && generationHistory.length > 0 && (
            <div className="story-command-history-popover" contentEditable={false}>
              <div className="story-command-history-header">
                <div>
                  <span className="section-title">Segment History</span>
                  <p>
                    {currentEntry
                      ? `Selected: ${getStoryGenerationModeLabel(currentEntry.generationMode)}`
                      : 'Recent AI generations stored as distinct manuscript segments.'}
                  </p>
                </div>
                <div className="story-command-inline-actions">
                  <button
                    type="button"
                    className="icon-btn story-command-action-btn"
                    onClick={() => setIsExpanded(false)}
                    title="Collapse segment history"
                  >
                    <ChevronUp size={14} />
                  </button>
                  {lastGeneration?.isApplied && (
                    <button
                      type="button"
                      className="icon-btn story-command-action-btn"
                      onClick={() => {
                        setIsExpanded(false);
                        onDeleteLatest?.();
                      }}
                      disabled={isGenerating}
                      title="Delete latest generated segment"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {lastGeneration && (
                    <button
                      type="button"
                      className="icon-btn story-command-action-btn"
                      onClick={() => {
                        setIsExpanded(false);
                        onRegenerateLast?.();
                      }}
                      disabled={isGenerating}
                      title="Regenerate latest generated segment"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="story-command-history-list">
                {latestEntries.map((entry) => {
                  const isSelected = entry.id === entryId;
                  const wordCount = entry.generatedText.trim()
                    ? entry.generatedText.trim().split(/\s+/).length
                    : 0;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={`story-command-history-entry ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectHistoryEntry?.(entry);
                        setIsExpanded(false);
                      }}
                    >
                      <div className="story-command-history-row">
                        <span className="story-command-history-chip">
                          {getStoryGenerationModeLabel(entry.generationMode, { short: true })}
                        </span>
                        <span className="story-command-history-status">
                          {isSelected ? getEntryStatus(entry, currentSegmentText) : (entry.isApplied ? 'In Draft' : 'Removed')}
                        </span>
                      </div>
                      <span className="story-command-history-preview">
                        {formatPreview(entry.generatedText)}
                      </span>
                      <span className="story-command-history-meta">
                        {wordCount} words
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <NodeViewContent className="story-segment-block-content" />
      </div>
    </NodeViewWrapper>
  );
}
