import { Slash, RotateCcw, Trash2 } from 'lucide-react';
import WriteCommandPopup from './bottom-controls/WriteCommandPopup';

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

export default function BottomControls({
  storyText,
  isGenerating,
  isWriteMenuOpen,
  activeCommand,
  writeMenuSource,
  writeMenuAnchorRect,
  writeMenuSelection,
  writeMenuIntent = 'generate',
  selectedText = '',
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
  const anchoredPopup = getAnchoredPopupPosition(writeMenuAnchorRect);

  return (
    <section className="bottom-controls command-dock">
      {isWriteMenuOpen && (
        <WriteCommandPopup
          storyText={storyText}
          isGenerating={isGenerating}
          activeCommand={activeCommand}
          nextMainEvent={nextMainEvent}
          limitType={limitType}
          limitValue={limitValue}
          whatHappensNext={whatHappensNext}
          selectedText={selectedText}
          writeMenuIntent={writeMenuIntent}
          writeMenuSource={writeMenuSource}
          writeMenuSelection={writeMenuSelection}
          anchoredPopup={anchoredPopup}
          onWhatHappensNextChange={onWhatHappensNextChange}
          onNextMainEventChange={onNextMainEventChange}
          onLimitTypeChange={onLimitTypeChange}
          onLimitValueChange={onLimitValueChange}
          onCloseWriteMenu={onCloseWriteMenu}
          onActiveCommandChange={onActiveCommandChange}
          onGenerate={onGenerate}
        />
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
