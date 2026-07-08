import { useMemo, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
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

function getEntryStatus(entry, storyText) {
  if (!entry?.isApplied) {
    return 'Removed';
  }

  const currentRangeText = storyText.slice(entry.startIndex, entry.endIndex);
  if (currentRangeText !== entry.generatedText) {
    return 'Edited';
  }

  return 'In Draft';
}

export default function AiSegmentAnchorView({ node }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    generationHistory,
    lastGeneration,
    storyText,
    isGenerating,
    onSelectHistoryEntry,
    onRegenerateLast,
    onDeleteLatest,
  } = useStoryEditorContext();

  const entryId = node.attrs?.entryId || '';
  const currentEntry = generationHistory.find((entry) => entry.id === entryId) || null;
  const latestEntries = useMemo(() => [...generationHistory].reverse().slice(0, 6), [generationHistory]);

  return (
    <NodeViewWrapper as="span" className="story-command-inline-wrapper">
      <span className={`story-command-inline ${isExpanded ? 'expanded' : ''}`}>
        <button
          type="button"
          className="story-command-anchor-toggle"
          onClick={() => setIsExpanded((isOpen) => !isOpen)}
          aria-label={`Open scene AI history (${generationHistory.length} item${generationHistory.length === 1 ? '' : 's'})`}
          title={`Scene AI history: ${generationHistory.length} item${generationHistory.length === 1 ? '' : 's'}`}
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
                <span className="section-title">Scene AI History</span>
                <p>
                  {currentEntry
                    ? `Selected: ${getStoryGenerationModeLabel(currentEntry.generationMode)}`
                    : 'Recent AI generations for this scene.'}
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
                        {getEntryStatus(entry, storyText)}
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
      </span>
    </NodeViewWrapper>
  );
}
