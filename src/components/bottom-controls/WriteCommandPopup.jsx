import { useEffect, useRef } from 'react';
import {
  RefreshCw,
  X,
} from 'lucide-react';
import {
  STORY_GENERATION_MODES,
  STORY_GENERATION_MODE_OPTIONS,
  STORY_REWRITE_MODE_OPTIONS,
  isRewriteMode,
  isStoryGenerationModeAvailable,
} from '../../utils/storyGeneration';
import {
  COMMAND_ICONS,
  getCommandAvailabilityReason,
  getCommandMeta,
} from './commandConfig';
import LengthControls from './LengthControls';

export default function WriteCommandPopup({
  storyText,
  isGenerating,
  activeCommand,
  nextMainEvent,
  limitType,
  limitValue,
  whatHappensNext,
  selectedText,
  writeMenuIntent,
  writeMenuSource,
  writeMenuSelection,
  anchoredPopup,
  onWhatHappensNextChange,
  onNextMainEventChange,
  onLimitTypeChange,
  onLimitValueChange,
  onCloseWriteMenu,
  onActiveCommandChange,
  onGenerate,
}) {
  const popupRef = useRef(null);
  const ActiveCommandIcon = COMMAND_ICONS[activeCommand];
  const activeCommandAvailable = isStoryGenerationModeAvailable(activeCommand, {
    storyText,
    nextMainEvent,
    selectedText,
  });
  const activeCommandMeta = getCommandMeta(activeCommand);
  const rewriteMode = isRewriteMode(activeCommand);
  const commandOptions = writeMenuIntent === 'rewrite'
    ? STORY_REWRITE_MODE_OPTIONS
    : STORY_GENERATION_MODE_OPTIONS;
  const contextualFooterNote = rewriteMode
    ? 'The selected prose will be replaced with the AI rewrite.'
    : (writeMenuSource === 'editor' && writeMenuSelection
      ? 'Opened from the current blank line in the manuscript.'
      : 'Tip: type `/` on a blank line in the editor to reopen this menu quickly.');

  useEffect(() => {
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
  }, [onCloseWriteMenu]);

  return (
    <div className={`command-popup ${anchoredPopup.className}`.trim()} ref={popupRef} style={anchoredPopup.style}>
      <div className="command-popup-sidebar">
        <div className="command-popup-heading">
          <span className="section-title">{rewriteMode ? 'Rewrite Commands' : 'Write Commands'}</span>
          <p>
            {rewriteMode
              ? 'Choose how the AI should revise the selected prose.'
              : 'Choose how the AI should handle the next prose segment.'}
          </p>
        </div>

        <div className="command-option-list">
          {commandOptions.map((option) => {
            const Icon = COMMAND_ICONS[option.id];
            const isAvailable = isStoryGenerationModeAvailable(option.id, {
              storyText,
              nextMainEvent,
              selectedText,
            });
            const availabilityReason = getCommandAvailabilityReason(option.id, {
              storyText,
              nextMainEvent,
              selectedText,
            });

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
          {rewriteMode && selectedText ? (
            <div className="prompt-box">
              <label>Selected prose</label>
              <div className="command-selection-preview">
                {selectedText.trim().length > 260
                  ? `${selectedText.trim().slice(0, 257)}...`
                  : selectedText.trim()}
              </div>
            </div>
          ) : null}

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

          {!rewriteMode && activeCommand === STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL && (
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

          {!rewriteMode && (
            <div className="prompt-box">
              <label>Segment length</label>
              <LengthControls
                limitType={limitType}
                limitValue={limitValue}
                onLimitTypeChange={onLimitTypeChange}
                onLimitValueChange={onLimitValueChange}
              />
            </div>
          )}
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
                  {ActiveCommandIcon ? <ActiveCommandIcon size={14} /> : null}
                  {activeCommandMeta.actionLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
