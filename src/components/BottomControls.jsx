import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

export default function BottomControls({
  isGenerating,
  limitType,
  limitValue,
  whatHappensNext,
  nextMainEvent,
  onWhatHappensNextChange,
  onNextMainEventChange,
  onLimitTypeChange,
  onLimitValueChange,
  onGenerate,
}) {
  const resolvedLimitValue = limitValue || (limitType === 'words' ? 250 : 3);

  return (
    <section className="bottom-controls">
      <div className="control-inputs-row">
        <div className="prompt-box">
          <label htmlFor="whatNext">What should happen next? (Micro instructions)</label>
          <textarea
            id="whatNext"
            className="prompt-textarea"
            value={whatHappensNext}
            onChange={(event) => onWhatHappensNextChange(event.target.value)}
            placeholder="e.g. A stranger enters the tavern holding a mysterious letter..."
            disabled={isGenerating}
          />
        </div>
        <div className="prompt-box">
          <label htmlFor="mainGoal">Next main event / goal (Macro target)</label>
          <textarea
            id="mainGoal"
            className="prompt-textarea"
            value={nextMainEvent}
            onChange={(event) => onNextMainEventChange(event.target.value)}
            placeholder="e.g. Find the lost key inside the old temple ruins."
            disabled={isGenerating}
          />
        </div>
      </div>

      <div className="control-actions-row">
        <div className="length-control-container">
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

          {limitType !== 'nolimit' && (
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
                  {limitType === 'words' ? 'words' : (limitValue === 1 ? 'paragraph' : 'paragraphs')}
                </span>
              </div>
            </div>
          )}

          {limitType === 'nolimit' && (
            <span className="length-info-text">
              AI co-writer decides naturally (no constraints)
            </span>
          )}
        </div>

        <div className="generate-actions">
          <button
            className="primary"
            onClick={onGenerate}
            disabled={isGenerating}
            style={{ minWidth: '130px' }}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={14} className="text-muted" style={{ animation: 'spin 1.5s linear infinite' }} />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Co-Write next
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
