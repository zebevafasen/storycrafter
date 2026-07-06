import React from 'react';
import { Sparkles, Trash2, UserRound } from 'lucide-react';
import TagInput from './TagInput';
import { PRESET_CHARACTER_TAGS } from '../utils/storyPresets';

export default function CharacterEditor({
  character,
  index,
  disabled = false,
  isGeneratingDescription = false,
  onChange,
  onGenerateDescription,
  onRemove,
}) {
  const displayName = character.name.trim() || `Character ${index + 1}`;

  const updateField = (field, value) => {
    onChange({
      ...character,
      [field]: value,
    });
  };

  return (
    <article className="character-card">
      <div className="character-card-header">
        <div className="character-card-title">
          <UserRound size={14} />
          <span>{displayName}</span>
        </div>
        <button
          type="button"
          className="character-remove-btn"
          onClick={onRemove}
          disabled={disabled}
          title={`Remove ${displayName}`}
        >
          <Trash2 size={14} />
          Remove
        </button>
      </div>

      <div className="form-group">
        <label htmlFor={`character-name-${character.id}`}>Name</label>
        <input
          id={`character-name-${character.id}`}
          type="text"
          value={character.name}
          onChange={(event) => updateField('name', event.target.value)}
          placeholder="Character name..."
          disabled={disabled}
        />
      </div>

      <TagInput
        label="Character Tags"
        presets={PRESET_CHARACTER_TAGS}
        tags={character.tags}
        onChange={(value) => updateField('tags', value)}
        disabled={disabled}
      />

      <div className="form-group">
        <div className="setup-field-header">
          <label htmlFor={`character-description-${character.id}`}>Description</label>
          <button
            type="button"
            className="setup-inline-action"
            onClick={onGenerateDescription}
            disabled={disabled || isGeneratingDescription}
            title={`Generate ${displayName}'s description from tags and story setup`}
          >
            <Sparkles size={14} style={isGeneratingDescription ? { animation: 'spin 1.5s linear infinite' } : undefined} />
            {isGeneratingDescription ? 'Generating...' : 'Draft Description'}
          </button>
        </div>
        <textarea
          id={`character-description-${character.id}`}
          value={character.description}
          onChange={(event) => updateField('description', event.target.value)}
          placeholder="Appearance, relationships, role in the story, secrets, quirks..."
          style={{ minHeight: '100px', resize: 'vertical', fontSize: '0.82rem' }}
          disabled={disabled || isGeneratingDescription}
        />
      </div>
    </article>
  );
}
