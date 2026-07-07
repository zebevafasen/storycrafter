import {
  ArrowRight,
  Flag,
  PenLine,
  Pencil,
  Sparkles,
  Expand,
  Minimize2,
} from 'lucide-react';
import {
  STORY_GENERATION_MODES,
  STORY_GENERATION_MODE_OPTIONS,
  STORY_REWRITE_MODES,
  STORY_REWRITE_MODE_OPTIONS,
} from '../../utils/storyGeneration';

export const COMMAND_ICONS = {
  [STORY_GENERATION_MODES.START]: PenLine,
  [STORY_GENERATION_MODES.CONTINUE]: ArrowRight,
  [STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL]: Flag,
  [STORY_REWRITE_MODES.REWRITE]: Sparkles,
  [STORY_REWRITE_MODES.EXPAND]: Expand,
  [STORY_REWRITE_MODES.SHORTEN]: Minimize2,
  [STORY_REWRITE_MODES.CUSTOM]: Pencil,
};

export { STORY_GENERATION_MODE_OPTIONS };
export { STORY_REWRITE_MODE_OPTIONS };

export function getCommandAvailabilityReason(mode, { storyText, nextMainEvent, selectedText = '' }) {
  if (Object.values(STORY_REWRITE_MODES).includes(mode) && !selectedText.trim()) {
    return 'Select prose in the editor first.';
  }

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

export function getCommandMeta(mode) {
  if (mode === STORY_REWRITE_MODES.REWRITE) {
    return {
      title: 'Rewrite the selection',
      description: 'Rework the selected prose while preserving continuity, voice, and scene intent.',
      microLabel: 'Optional rewrite emphasis',
      microPlaceholder: 'e.g. Make the prose more intimate and less repetitive.',
      actionLabel: 'Rewrite Selection',
    };
  }

  if (mode === STORY_REWRITE_MODES.EXPAND) {
    return {
      title: 'Expand the selection',
      description: 'Add richer detail and depth to the selected prose without changing what happens.',
      microLabel: 'Optional expansion emphasis',
      microPlaceholder: 'e.g. Emphasize physical tension and sensory detail.',
      actionLabel: 'Expand Selection',
    };
  }

  if (mode === STORY_REWRITE_MODES.SHORTEN) {
    return {
      title: 'Tighten the selection',
      description: 'Compress the selected prose into a cleaner, faster version that keeps the key beats.',
      microLabel: 'Optional tightening emphasis',
      microPlaceholder: 'e.g. Keep the emotional beat but cut excess description.',
      actionLabel: 'Shorten Selection',
    };
  }

  if (mode === STORY_REWRITE_MODES.CUSTOM) {
    return {
      title: 'Custom rewrite',
      description: 'Apply a specific revision instruction to the selected prose.',
      microLabel: 'Rewrite instruction',
      microPlaceholder: 'e.g. Turn this into sharper dialogue with more subtext.',
      actionLabel: 'Apply Rewrite',
    };
  }

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
