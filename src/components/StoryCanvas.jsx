import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  History,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
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
  if (!entry.isApplied) {
    return 'Removed';
  }

  const currentRangeText = storyText.slice(entry.startIndex, entry.endIndex);
  if (currentRangeText !== entry.generatedText) {
    return 'Edited';
  }

  return 'In Draft';
}

export default function StoryCanvas({
  storyText,
  isGenerating,
  commandAnchorIndex,
  generationHistory = [],
  lastGeneration = null,
  onStoryTextChange,
  onOpenWriteCommands,
  onSelectHistoryEntry,
  onRegenerateLast,
  onDeleteLatest,
}) {
  const textareaRef = useRef(null);
  const markerWidgetRef = useRef(null);
  const [scrollOffset, setScrollOffset] = useState({ top: 0, left: 0 });
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const hasCommandAnchor = typeof commandAnchorIndex === 'number';
  const historyEntries = useMemo(() => [...generationHistory].reverse(), [generationHistory]);
  const latestEntries = historyEntries.slice(0, 6);

  const clampedAnchorIndex = useMemo(() => {
    const rawAnchorIndex = typeof commandAnchorIndex === 'number'
      ? commandAnchorIndex
      : storyText.length;

    return Math.max(0, Math.min(rawAnchorIndex, storyText.length));
  }, [commandAnchorIndex, storyText.length]);

  const markerPrefix = storyText.slice(0, clampedAnchorIndex);
  const markerSuffix = storyText.slice(clampedAnchorIndex);
  const hasRenderedOverlay = storyText.length > 0;

  useEffect(() => {
    if (isGenerating && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [isGenerating, storyText]);

  useEffect(() => {
    if (!generationHistory.length) {
      setIsHistoryExpanded(false);
    }
  }, [generationHistory.length]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      setScrollOffset({
        top: textarea.scrollTop,
        left: textarea.scrollLeft,
      });
    });

    observer.observe(textarea);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isHistoryExpanded) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (markerWidgetRef.current && !markerWidgetRef.current.contains(event.target)) {
        setIsHistoryExpanded(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [isHistoryExpanded]);

  const handleKeyDown = (event) => {
    if (
      event.key !== '/'
      || event.altKey
      || event.ctrlKey
      || event.metaKey
      || typeof onOpenWriteCommands !== 'function'
    ) {
      return;
    }

    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? 0;
    if (selectionStart !== selectionEnd) {
      return;
    }

    const textBeforeCaret = textarea.value.slice(0, selectionStart);
    const currentLine = textBeforeCaret.split('\n').pop() || '';
    if (currentLine.trim().length > 0) {
      return;
    }

    event.preventDefault();
    onOpenWriteCommands(null, selectionStart);
  };

  const handleScroll = (event) => {
    const target = event.currentTarget;
    setScrollOffset({
      top: target.scrollTop,
      left: target.scrollLeft,
    });
  };

  return (
    <div className="story-canvas-container">
      <div className="story-textarea-shell">
        {hasRenderedOverlay && (
          <div className="story-render-layer" aria-hidden="true">
            <div
              className="story-render-content"
              style={{
                transform: `translate(${-scrollOffset.left}px, ${-scrollOffset.top}px)`,
              }}
            >
              <span className="story-render-text">{markerPrefix}</span>

              {hasCommandAnchor && (
                <span
                  ref={markerWidgetRef}
                  className={`story-command-inline ${isHistoryExpanded ? 'expanded' : ''}`}
                >
                  <button
                    type="button"
                    className="story-command-anchor-toggle"
                    onClick={() => setIsHistoryExpanded((isOpen) => !isOpen)}
                    aria-label={`Open AI segment history (${generationHistory.length} segment${generationHistory.length === 1 ? '' : 's'})`}
                    title={`AI segment history: ${generationHistory.length} segment${generationHistory.length === 1 ? '' : 's'}`}
                  >
                    <span className="story-command-anchor-badge">
                      <History size={10} />
                      <span>AI</span>
                      <span className="story-command-anchor-count">{generationHistory.length}</span>
                    </span>
                    {isHistoryExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {isHistoryExpanded && generationHistory.length > 0 && (
                    <div className="story-command-history-popover">
                      <div className="story-command-history-header">
                        <div>
                          <span className="section-title">Segment History</span>
                          <p>Recent AI generations anchored in the draft.</p>
                        </div>
                        <div className="story-command-inline-actions">
                          <button
                            type="button"
                            className="icon-btn story-command-action-btn"
                            onClick={() => setIsHistoryExpanded(false)}
                            title="Collapse segment history"
                          >
                            <ChevronUp size={14} />
                          </button>
                          {lastGeneration?.isApplied && (
                            <button
                              type="button"
                              className="icon-btn story-command-action-btn"
                              onClick={() => {
                                setIsHistoryExpanded(false);
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
                                setIsHistoryExpanded(false);
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
                          const isSelected = clampedAnchorIndex === entry.startIndex;
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
                                setIsHistoryExpanded(false);
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
              )}

              <span className="story-render-text">{markerSuffix || '\u200b'}</span>
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          className={`story-textarea ${hasRenderedOverlay ? 'has-render-overlay' : ''}`}
          value={storyText}
          onChange={(event) => onStoryTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          placeholder="Start typing your story here... Or type / on a blank line to open the writing commands."
          readOnly={isGenerating}
        />
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
