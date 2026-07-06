import React from 'react';
import { Sparkles, UserPlus } from 'lucide-react';
import CharacterEditor from './CharacterEditor';
import TagInput from './TagInput';
import {
  PRESET_CUSTOM_TAGS,
  PRESET_GENRES,
  PRESET_THEMES,
} from '../utils/storyPresets';

export default function StorySetupSidebar({
  isOpen,
  isGenerating,
  isPremiseGenerating,
  genres,
  themes,
  customTags,
  characters,
  premise,
  onGenresChange,
  onThemesChange,
  onCustomTagsChange,
  onAddCharacter,
  onCharacterChange,
  onCharacterRemove,
  onPremiseChange,
  onRandomizeGenres,
  onRandomizeThemes,
  onRandomizeCustomTags,
  onGeneratePremise,
}) {
  return (
    <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
      <div className="section-title">Story Setup</div>

      <TagInput
        label="Genres"
        presets={PRESET_GENRES}
        tags={genres}
        onChange={onGenresChange}
        onRandomize={onRandomizeGenres}
        disabled={isGenerating || isPremiseGenerating}
      />

      <TagInput
        label="Themes"
        presets={PRESET_THEMES}
        tags={themes}
        onChange={onThemesChange}
        onRandomize={onRandomizeThemes}
        disabled={isGenerating || isPremiseGenerating}
      />

      <TagInput
        label="Custom Tags"
        presets={PRESET_CUSTOM_TAGS}
        tags={customTags}
        onChange={onCustomTagsChange}
        onRandomize={onRandomizeCustomTags}
        disabled={isGenerating || isPremiseGenerating}
      />

      <div className="form-group" style={{ marginTop: '4px' }}>
        <div className="setup-field-header">
          <label htmlFor="premise">Description / Summary</label>
          <button
            type="button"
            className="setup-inline-action"
            onClick={onGeneratePremise}
            disabled={isGenerating || isPremiseGenerating}
            title="Generate a setup summary from the selected genres, themes, and tags"
          >
            <Sparkles size={14} style={isPremiseGenerating ? { animation: 'spin 1.5s linear infinite' } : undefined} />
            {isPremiseGenerating ? 'Generating...' : 'Draft from setup'}
          </button>
        </div>
        <textarea
          id="premise"
          value={premise}
          onChange={(event) => onPremiseChange(event.target.value)}
          placeholder="Introduce the premise, core conflict, or setting... or let StoryCrafter draft one from your setup."
          style={{ minHeight: '140px', resize: 'vertical', fontSize: '0.85rem' }}
          disabled={isGenerating || isPremiseGenerating}
        />
      </div>

      <div className="characters-section">
        <div className="setup-field-header">
          <div className="section-title" style={{ marginBottom: 0 }}>
            <span>Characters</span>
          </div>
          <button
            type="button"
            className="setup-inline-action"
            onClick={onAddCharacter}
            disabled={isGenerating || isPremiseGenerating}
            title="Add a character profile"
          >
            <UserPlus size={14} />
            Add Character
          </button>
        </div>

        {characters.length > 0 ? (
          <div className="characters-list">
            {characters.map((character, index) => (
              <CharacterEditor
                key={character.id}
                character={character}
                index={index}
                disabled={isGenerating || isPremiseGenerating}
                onChange={(value) => onCharacterChange(character.id, value)}
                onRemove={() => onCharacterRemove(character.id)}
              />
            ))}
          </div>
        ) : (
          <div className="character-empty-state">
            No characters yet. Add one to keep names, traits, and notes in the AI context.
          </div>
        )}
      </div>
    </aside>
  );
}
