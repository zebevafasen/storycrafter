import {
  ArrowRight,
  Flag,
  PenLine,
} from 'lucide-react';
import {
  STORY_GENERATION_MODES,
  STORY_GENERATION_MODE_OPTIONS,
} from '../../utils/storyGeneration';

export const COMMAND_ICONS = {
  [STORY_GENERATION_MODES.START]: PenLine,
  [STORY_GENERATION_MODES.CONTINUE]: ArrowRight,
  [STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL]: Flag,
};

export { STORY_GENERATION_MODE_OPTIONS };

export function getCommandAvailabilityReason(mode, { storyText, nextMainEvent }) {
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
