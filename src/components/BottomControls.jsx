import React, { useEffect, useRef } from 'react';
import {
  ArrowRight,
  Flag,
  PenLine,
  RefreshCw,
  RotateCcw,
  Slash,
  Trash2,
  X,
} from 'lucide-react';
import {
  STORY_GENERATION_MODES,
  STORY_GENERATION_MODE_OPTIONS,
  isStoryGenerationModeAvailable,
} from '../utils/storyGeneration';

const COMMAND_ICONS = {
  [STORY_GENERATION_MODES.START]: PenLine,
  [STORY_GENERATION_MODES.CONTINUE]: ArrowRight,
  [STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL]: Flag,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeAnchorRect(rect) {
  if (!rect) {
    return null;
  }

  return {
    top: rect.top,
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
  };
}

function getAnchoredPopupPosition(anchorRect) {
  if (!anchorRect || typeof window === 'undefined') {
    return {
      className: '',
      style: undefined,
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const horizontalPadding = viewportWidth <= 720 ? 12 : 20;
  const popupWidth = Math.min(viewportWidth - (horizontalPadding * 2), viewportWidth <= 1100 ? 640 : 760);
  const left = clamp(
    anchorRect.left - 40,
    horizontalPadding,
    Math.max(horizontalPadding, viewportWidth - popupWidth - horizontalPadding),
  );

  const spaceAbove = anchorRect.top;
  const spaceBelow = viewportHeight - anchorRect.bottom;
  const placeBelow = spaceBelow > 360 && spaceBelow > spaceAbove;

  return {
    className: `anchored ${placeBelow ? 'command-popup-placement-below' : 'command-popup-placement-above'}`,
    style: placeBelow
      ? {
          position: 'fixed',
          top: Math.min(viewportHeight - 12, anchorRect.bottom + 12),
          left,
          width: popupWidth,
        }
      : {
          position: 'fixed',
          bottom: Math.max(12, viewportHeight - anchorRect.top + 12),
          left,
          width: popupWidth,
        },
  };
}

function getCommandAvailabilityReason(mode, { storyText, nextMainEvent }) {
  if (mode === STORY_GENERATION_MODES.START && storyText.trim()) {
    return 'Requires an empty manuscript.';
  }

  if (mode === STORY_GENERATION_MODES.CONTINUE && !storyText.trim()) {
    return 'Needs existing prose first.';
  }

  if (mode === STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL) {
    if (!storyText.trim()) {
      return 'Needs existing prose first.';
    }

    if (!nextMainEvent.trim()) {
      return 'Add a next goal or event first.';
    }
  }

  return '';
}

function getCommandMeta(mode) {
  if (mode === STORY_GENERATION_MODES.START) {
    return {
      title: 'Start from setup',
      description: 'Uses your genres, themes, tags, characters, and premise to write the opening segment.',
      microLabel: 'Optional opening beat',
      microPlaceholder: 'e.g. Open with a rainy arrival at the station.',
      actionLabel: 'Start Writing',
    };
  }

  if (mode === STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL) {
    return {
      title: 'Continue with direction',
      description: 'Uses recent prose and story memory, but starts nudging the manuscript toward your persistent next goal.',
      microLabel: 'Optional immediate beat',
      microPlaceholder: 'e.g. Let the argument escalate before they agree on the plan.',
      actionLabel: 'Write Toward Goal',
    };
  }

  return {
    title: 'Continue the manuscript',
    description: 'Uses recent prose and story memory to write the next segment in the same voice and momentum.',
    microLabel: 'Optional immediate direction',
    microPlaceholder: 'e.g. Reveal the letter contents before the scene ends.',
    actionLabel: 'Continue Writing',
  };
}

function LengthControls({
  limitType,
  limitValue,
  onLimitTypeChange,
  onLimitValueChange,
}) {
  const resolvedLimitValue = limitValue || (limitType === 'words' ? 250 : 3);

  return (
    <div className="length-control-stack">
      <div className="length-tabs">
        <button
          type="button"
          className={`length-tab-btn ${limitType === 'words' ? 'active' : ''}`}
          onClick={() => onLimitTypeChange('words')}
        >
          Words
        </button>
        <button
          type="button"
          className={`length-tab-btn ${limitType === 'paragraphs' ? 'active' : ''}`}
          onClick={() => onLimitTypeChange('paragraphs')}
        >
          Paragraphs
        </button>
        <button
          type="button"
          className={`length-tab-btn ${limitType === 'nolimit' ? 'active' : ''}`}
          onClick={() => onLimitTypeChange('nolimit')}
        >
          No Limit
        </button>
      </div>

      {limitType !== 'nolimit' ? (
        <div className="length-slider-wrapper">
          <input
            type="range"
            min={limitType === 'words' ? 50 : 1}
            max={limitType === 'words' ? 1000 : 10}
            step={limitType === 'words' ? 10 : 1}
            value={resolvedLimitValue}
            onChange={(event) => onLimitValueChange(Number(event.target.value))}
            className="length-slider"
          />
          <div className="length-input-indicator">
            <input
              type="number"
              value={limitValue || ''}
              onChange={(event) => onLimitValueChange(event.target.value === '' ? '' : Number(event.target.value))}
              className="length-number-input"
            />
            <span className="length-unit">
              {limitType === 'words' ? 'words' : (resolvedLimitValue === 1 ? 'paragraph' : 'paragraphs')}
            </span>
          </div>
        </div>
      ) : (
        <span className="length-info-text">
          AI chooses a natural stopping point for the segment.
        </span>
      )}
    </div>
  );
}

export default function BottomControls({
  storyText,
  isGenerating,
  isWriteMenuOpen,
  activeCommand,
  writeMenuSource,
  writeMenuAnchorRect,
  writeMenuSelection,
  canRegenerateLast,
  canDeleteLatest,
  limitType,
  limitValue,
  whatHappensNext,
  nextMainEvent,
  onWhatHappensNextChange,
  onNextMainEventChange,
  onLimitTypeChange,
  onLimitValueChange,
  onOpenWriteMenu,
  onCloseWriteMenu,
  onActiveCommandChange,
  onRegenerateLast,
  onDeleteLatest,
  onGenerate,
}) {
  const popupRef = useRef(null);
  const activeCommandAvailable = isStoryGenerationModeAvailable(activeCommand, { storyText, nextMainEvent });
  const activeCommandMeta = getCommandMeta(activeCommand);
  const anchoredPopup = getAnchoredPopupPosition(writeMenuAnchorRect);
  const contextualFooterNote = writeMenuSource === 'editor' && writeMenuSelection
    ? 'Opened from the current blank line in the manuscript.'
    : 'Tip: type `/` on a blank line in the editor to reopen this menu quickly.';

  useEffect(() => {
    if (!isWriteMenuOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseWriteMenu();
      }
    };

    const handlePointerDown = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onCloseWriteMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isWriteMenuOpen, onCloseWriteMenu]);

  return (
    <section className="bottom-controls command-dock">
      {isWriteMenuOpen && (
        <div className={`command-popup ${anchoredPopup.className}`.trim()} ref={popupRef} style={anchoredPopup.style}>
          <div className="command-popup-sidebar">
            <div className="command-popup-heading">
              <span className="section-title">Write Commands</span>
              <p>Choose how the AI should handle the next prose segment.</p>
            </div>

            <div className="command-option-list">
              {STORY_GENERATION_MODE_OPTIONS.map((option) => {
                const Icon = COMMAND_ICONS[option.id];
                const isAvailable = isStoryGenerationModeAvailable(option.id, { storyText, nextMainEvent });
                const availabilityReason = getCommandAvailabilityReason(option.id, { storyText, nextMainEvent });

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`command-option-card ${activeCommand === option.id ? 'active' : ''}`}
                    onClick={() => onActiveCommandChange(option.id)}
                  >
                    <div className="command-option-title">
                      <span className="command-option-icon">
                        <Icon size={14} />
                      </span>
                      <span>{option.label}</span>
                    </div>
                    <span className="command-option-description">{option.description}</span>
                    {!isAvailable && (
                      <span className="command-option-status">
                        {availabilityReason}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="command-popup-main">
            <div className="command-panel-header">
              <div>
                <h3>{activeCommandMeta.title}</h3>
                <p>{activeCommandMeta.description}</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={onCloseWriteMenu}
                aria-label="Close writing commands"
              >
                <X size={14} />
              </button>
            </div>

            <div className="command-panel-body">
              <div className="prompt-box">
                <label htmlFor="whatNext">{activeCommandMeta.microLabel}</label>
                <textarea
                  id="whatNext"
                  className="prompt-textarea command-textarea"
                  value={whatHappensNext}
                  onChange={(event) => onWhatHappensNextChange(event.target.value)}
                  placeholder={activeCommandMeta.microPlaceholder}
                  disabled={isGenerating}
                />
              </div>

              {activeCommand === STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL && (
                <div className="prompt-box">
                  <label htmlFor="mainGoal">Next main event / goal</label>
                  <textarea
                    id="mainGoal"
                    className="prompt-textarea command-textarea"
                    value={nextMainEvent}
                    onChange={(event) => onNextMainEventChange(event.target.value)}
                    placeholder="e.g. Find the lost key inside the old temple ruins."
                    disabled={isGenerating}
                  />
                  <span className="command-field-note">
                    This stays with the project until you clear it.
                  </span>
                </div>
              )}

              <div className="prompt-box">
                <label>Segment length</label>
                <LengthControls
                  limitType={limitType}
                  limitValue={limitValue}
                  onLimitTypeChange={onLimitTypeChange}
                  onLimitValueChange={onLimitValueChange}
                />
              </div>
            </div>

            <div className="command-panel-footer">
              <span className="command-field-note">
                {contextualFooterNote}
              </span>
              <div className="generate-actions">
                <button
                  type="button"
                  onClick={onCloseWriteMenu}
                  disabled={isGenerating}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => onGenerate(activeCommand)}
                  disabled={isGenerating || !activeCommandAvailable}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={14} className="text-muted" style={{ animation: 'spin 1.5s linear infinite' }} />
                      Generating...
                    </>
                  ) : (
                    <>
                      {React.createElement(COMMAND_ICONS[activeCommand], { size: 14 })}
                      {activeCommandMeta.actionLabel}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="command-dock-row">
        <div className="command-dock-primary">
          <button
            type="button"
            className="primary command-open-btn"
            onClick={(event) => onOpenWriteMenu(null, {
              source: 'dock',
              anchorRect: normalizeAnchorRect(event.currentTarget.getBoundingClientRect()),
            })}
            disabled={isGenerating}
          >
            <Slash size={14} />
            Write Commands
          </button>
          <div className="command-dock-copy">
            <span className="command-dock-title">Prompt the co-writer only when you need it.</span>
            <span className="command-dock-hint">Type `/` on a blank line or open the command menu.</span>
          </div>
        </div>

        <div className="generate-actions">
          {canDeleteLatest && (
            <button
              type="button"
              onClick={onDeleteLatest}
              disabled={isGenerating}
              title="Delete the latest AI-generated segment"
            >
              <Trash2 size={14} />
              Delete Latest
            </button>
          )}
          {canRegenerateLast && (
            <button
              type="button"
              onClick={onRegenerateLast}
              disabled={isGenerating}
              title="Generate a fresh version of the latest AI-written segment"
            >
              <RotateCcw size={14} />
              Regenerate Last
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
