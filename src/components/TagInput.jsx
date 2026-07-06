import React, { useState, useEffect, useRef } from 'react';
import { X, Plus } from 'lucide-react';

export default function TagInput({ label, presets = [], tags = [], onChange, disabled = false }) {
  const [inputValue, setInputValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef(null);

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

  const handlePresetClick = (preset) => {
    if (disabled) return;
    if (tags.includes(preset)) {
      onChange(tags.filter((t) => t !== preset));
    } else {
      onChange([...tags, preset]);
    }
  };

  const addTags = (text) => {
    if (disabled) return;
    const newTags = text
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !tags.includes(t));

    if (newTags.length > 0) {
      onChange([...tags, ...newTags]);
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
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className={`tags-wrapper ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      <label>{label}</label>
      
      <div className="tag-field-row">
        {/* Active tags and typing area */}
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

        {/* Preset Menu Toggle Button */}
        {presets.length > 0 && (
          <button
            type="button"
            className={`tag-menu-btn ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            disabled={disabled}
            title={`Select pre-determined ${label.toLowerCase()}`}
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Preset Sub-menu Dropdown */}
      {isMenuOpen && presets.length > 0 && (
        <div className="tag-preset-dropdown">
          <div className="preset-title">Pre-determined {label}</div>
          <div className="preset-grid">
            {presets.map((preset) => {
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
            })}
          </div>
        </div>
      )}
    </div>
  );
}
