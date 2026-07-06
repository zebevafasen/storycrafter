import React, { useState, useEffect, useRef } from 'react';
import { X, Dices, Search } from 'lucide-react';
import { sortPresetSelection } from '../utils/storyPresets';

export default function TagInput({
  label,
  presets = [],
  tags = [],
  onChange,
  onRandomize = null,
  disabled = false,
}) {
  const [inputValue, setInputValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu if disabled changes to true
  useEffect(() => {
    if (disabled) {
      setIsMenuOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (!isMenuOpen) {
      setSearchQuery('');
      return;
    }

    searchInputRef.current?.focus();
  }, [isMenuOpen]);

  const handlePresetClick = (preset) => {
    if (disabled) return;
    if (tags.includes(preset)) {
      onChange(sortPresetSelection(tags.filter((tag) => tag !== preset)));
    } else {
      onChange(sortPresetSelection([...tags, preset]));
    }
  };

  const addTags = (text) => {
    if (disabled) return;
    const newTags = text
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !tags.includes(t));

    if (newTags.length > 0) {
      onChange(sortPresetSelection([...tags, ...newTags]));
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTags(inputValue);
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (disabled) return;
    if (inputValue) {
      addTags(inputValue);
      setInputValue('');
    }
  };

  const removeTag = (indexToRemove) => {
    if (disabled) return;
    onChange(sortPresetSelection(tags.filter((_, index) => index !== indexToRemove)));
  };

  const filteredPresets = presets.filter((preset) =>
    preset.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  return (
    <div className={`tags-wrapper ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      <label>{label}</label>
      
      <div className="tag-field-row">
        <div className={`tag-input-container ${disabled ? 'disabled' : ''}`}>
          {tags.map((tag, index) => (
            <div key={index} className="tag-pill">
              <span>{tag}</span>
              <button type="button" onClick={() => removeTag(index)} disabled={disabled}>
                <X size={10} />
              </button>
            </div>
          ))}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="tag-raw-input"
            placeholder={tags.length === 0 && !disabled ? "Type and press comma or Enter..." : ""}
            disabled={disabled}
          />
        </div>
      </div>

      {presets.length > 0 && (
        <div className="tag-action-buttons">
          {onRandomize && (
            <button
              type="button"
              className="tag-action-btn"
              onClick={onRandomize}
              disabled={disabled}
              title={`Replace with random ${label.toLowerCase()}`}
            >
              <Dices size={14} />
              Random
            </button>
          )}
          <button
            type="button"
            className={`tag-action-btn ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            disabled={disabled}
            title={`Browse preset ${label.toLowerCase()}`}
          >
            <Search size={14} />
            Presets
          </button>
        </div>
      )}

      {isMenuOpen && presets.length > 0 && (
        <div className="tag-preset-dropdown">
          <div className="preset-title">Preset {label}</div>
          <div className="tag-preset-search">
            <Search size={14} className="tag-preset-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="tag-preset-search-input"
            />
          </div>
          <div className="preset-grid">
            {filteredPresets.length > 0 ? filteredPresets.map((preset) => {
              const isSelected = tags.includes(preset);
              return (
                <div
                  key={preset}
                  className={`preset-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset}
                </div>
              );
            }) : (
              <div className="preset-empty-state">No matching presets</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
