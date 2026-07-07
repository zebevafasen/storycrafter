import { getDefaultLimitValue, STORY_LIMIT_TYPES } from '../../config/storyLimits';

export default function LengthControls({
  limitType,
  limitValue,
  onLimitTypeChange,
  onLimitValueChange,
}) {
  const resolvedLimitValue = limitValue || getDefaultLimitValue(limitType);

  return (
    <div className="length-control-stack">
      <div className="length-tabs">
        <button
          type="button"
          className={`length-tab-btn ${limitType === STORY_LIMIT_TYPES.WORDS ? 'active' : ''}`}
          onClick={() => onLimitTypeChange(STORY_LIMIT_TYPES.WORDS)}
        >
          Words
        </button>
        <button
          type="button"
          className={`length-tab-btn ${limitType === STORY_LIMIT_TYPES.PARAGRAPHS ? 'active' : ''}`}
          onClick={() => onLimitTypeChange(STORY_LIMIT_TYPES.PARAGRAPHS)}
        >
          Paragraphs
        </button>
        <button
          type="button"
          className={`length-tab-btn ${limitType === STORY_LIMIT_TYPES.NO_LIMIT ? 'active' : ''}`}
          onClick={() => onLimitTypeChange(STORY_LIMIT_TYPES.NO_LIMIT)}
        >
          No Limit
        </button>
      </div>

      {limitType !== STORY_LIMIT_TYPES.NO_LIMIT ? (
        <div className="length-slider-wrapper">
          <input
            type="range"
            min={limitType === STORY_LIMIT_TYPES.WORDS ? 50 : 1}
            max={limitType === STORY_LIMIT_TYPES.WORDS ? 1000 : 10}
            step={limitType === STORY_LIMIT_TYPES.WORDS ? 10 : 1}
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
              {limitType === STORY_LIMIT_TYPES.WORDS ? 'words' : (resolvedLimitValue === 1 ? 'paragraph' : 'paragraphs')}
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
