import { useState } from 'react';
import { generatePremiseFromSetup } from '../services/openrouter';
import { createCharacter } from '../utils/projectState';
import {
  PRESET_CUSTOM_TAGS,
  PRESET_GENRES,
  PRESET_THEMES,
  pickRandomPresets,
} from '../utils/storyPresets';

export default function useStorySetupActions({
  config,
  genres,
  themes,
  customTags,
  characters,
  premise,
  setGenres,
  setThemes,
  setCustomTags,
  setCharacters,
  setPremise,
  onToast,
  onRequireSettings,
}) {
  const [isPremiseGenerating, setIsPremiseGenerating] = useState(false);

  const handleRandomizeGenres = () => {
    setGenres(pickRandomPresets(PRESET_GENRES, { min: 1, max: 2 }));
    onToast('Genres randomized');
  };

  const handleRandomizeThemes = () => {
    setThemes(pickRandomPresets(PRESET_THEMES, { min: 2, max: 3 }));
    onToast('Themes randomized');
  };

  const handleRandomizeCustomTags = () => {
    setCustomTags(pickRandomPresets(PRESET_CUSTOM_TAGS, { min: 5, max: 8 }));
    onToast('Tags randomized');
  };

  const handleGeneratePremise = async () => {
    if (!genres.length && !themes.length && !customTags.length && !characters.length) {
      onToast('Choose at least one genre, theme, tag, or character first.');
      return;
    }

    if (!config.apiKey) {
      onToast('Please configure your OpenRouter API Key in Settings first.');
      onRequireSettings();
      return;
    }

    if (premise.trim()) {
      const shouldReplace = window.confirm('Replace the current description/summary with a new AI-generated one based on this setup?');
      if (!shouldReplace) {
        return;
      }
    }

    setIsPremiseGenerating(true);

    try {
      const generatedPremise = await generatePremiseFromSetup({
        apiKey: config.apiKey,
        model: config.model,
        genres,
        themes,
        tags: customTags,
        characters,
        currentPremise: premise,
      });

      if (!generatedPremise) {
        throw new Error('Received empty response from the setup assistant.');
      }

      setPremise(generatedPremise.trim());
      onToast('Description generated from story setup');
    } catch (error) {
      console.error(error);
      onToast(`Summary generation failed: ${error.message}`);
    } finally {
      setIsPremiseGenerating(false);
    }
  };

  const handleAddCharacter = () => {
    setCharacters((currentCharacters) => [...currentCharacters, createCharacter()]);
    onToast('Character added');
  };

  const handleCharacterChange = (characterId, nextCharacter) => {
    setCharacters((currentCharacters) => currentCharacters.map((character) => (
      character.id === characterId ? nextCharacter : character
    )));
  };

  const handleCharacterRemove = (characterId) => {
    setCharacters((currentCharacters) => currentCharacters.filter((character) => character.id !== characterId));
    onToast('Character removed');
  };

  return {
    isPremiseGenerating,
    handleRandomizeGenres,
    handleRandomizeThemes,
    handleRandomizeCustomTags,
    handleGeneratePremise,
    handleAddCharacter,
    handleCharacterChange,
    handleCharacterRemove,
  };
}
