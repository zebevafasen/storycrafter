function sortAlphabetically(values) {
  return [...values].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
}

function pickWeightedItem(items, getWeight) {
  const weightedEntries = items.map((item) => ({
    item,
    weight: Math.max(0, getWeight(item)),
  }));
  const totalWeight = weightedEntries.reduce((total, entry) => total + entry.weight, 0);

  if (totalWeight <= 0) {
    return items[Math.floor(Math.random() * items.length)];
  }

  let threshold = Math.random() * totalWeight;
  for (const entry of weightedEntries) {
    threshold -= entry.weight;
    if (threshold <= 0) {
      return entry.item;
    }
  }

  return weightedEntries[weightedEntries.length - 1]?.item ?? items[0];
}

export const PRESET_GENRES = sortAlphabetically([
  'Fantasy',
  'Sci-Fi',
  'Mystery',
  'Thriller',
  'Romance',
  'Horror',
  'Adventure',
  'Historical',
  'Action',
  'Slice of Life',
  'Erotica',
  'Crime',
  'Comedy',
  'Drama',
  'Dystopian',
  'Supernatural',
  'Urban Fantasy',
  'Dark Fantasy',
  'Mythic Fantasy',
  'Sword and Sorcery',
  'Political Fantasy',
  'Literary Fiction',
]);

export const PRESET_THEMES = sortAlphabetically([
  'Coming of Age',
  'Revenge',
  'Redemption',
  'Sacrifice',
  'Identity',
  'Fate',
  'Betrayal',
  'Survival',
  'Love',
  'Obsession',
  'Ambition',
  'Power',
  'Corruption',
  'Justice',
  'Freedom',
  'Duty',
  'Hope',
  'Despair',
  'Grief',
  'Healing',
  'Faith',
  'Doubt',
  'Belonging',
  'Isolation',
  'Transformation',
  'Legacy',
  'Memory',
  'Truth',
  'Forgiveness',
  'Forbidden Love',
  'Class Struggle',
  'Found Family',
  'Mortality',
  'Colonization',
  'Humanity',
  'Alienation',
]);

export const PRESET_CUSTOM_TAGS = sortAlphabetically([
  'medieval',
  'human-centric',
  'industrial',
  'female protagonist',
  'male protagonist',
  'magic-system',
  'steampunk',
  'cyberpunk',
  'high-fantasy',
  'grimdark',
  'gothic',
  'erotic',
  'slow-burn',
  'modern day',
  'ancient',
  'prehistoric',
  'victorian',
  'colonial',
  'western',
  'wartime',
  'retrofuturistic',
  'post-apocalyptic',
  'post-collapse',
  'near-future',
  'far-future',
  'spacefaring',
  'globetrotting',
  'frontier',
  'urban',
  'rural',
  'isolated',
  'underground',
  'underwater',
  'zero gravity',
  'low gravity',
  'floating city',
  'megacity',
  'small town',
  'single location',
  'time pressure',
  'road trip',
  'alternate history',
  'alternate world',
  'parallel worlds',
  'dying world',
  'lost civilization',
  'ruins',
  'low technology',
  'advanced technology',
  'artificial intelligence',
  'transhumanism',
  'cybernetics',
  'cyborgs',
  'androids',
  'robots',
  'clockwork',
  'alchemy',
  'gunpowder',
  'rare magic',
  'common magic',
  'hard magic',
  'soft magic',
  'no magic',
  'low-fantasy',
  'hard sci-fi',
  'soft sci-fi',
  'faster than light',
  'ensemble cast',
  'antihero',
  'dialogue heavy',
  'no dialogue',
  'dialogue light',
  'grounded',
  'realistic',
  'surreal',
  'dreamlike',
  'hopeful',
  'bleak',
  'low-stakes',
  'high-stakes',
  'cozy',
  'intimate',
  'political intrigue',
  'court intrigue',
  'forbidden romance',
  'found family',
  'morally gray',
  'chosen one',
  'heist',
  'monster hunting',
  'survivalist',
  'science fantasy',
  'eldritch',
  'body horror',
  'folk horror',
  'academia',
  'military',
  'naval',
  'wilderness',
  'religious order',
  'sex',
  'nsfw',
  'violence',
  'war',
  'gifted individual',
  'supernatural abilities',
  'superpowers',
  'mutants',
  'the beauty of struggle',
  'pirates',
  'space opera',
  'seafaring',
  'guilds',
  'mercenaries',
  'empire',
  'fallen empire',
  'rebellion',
  'civil war',
  'golden age',
  'shoulders of giants',
  'lost knowledge',
]);

const TAG_EXCLUSIVE_GROUPS = [
  ['prehistoric', 'ancient', 'medieval', 'colonial', 'victorian', 'modern day', 'near-future', 'retrofuturistic', 'far-future'],
  ['urban', 'rural', 'small town', 'megacity', 'floating city', 'frontier', 'single location'],
  ['underground', 'underwater', 'zero gravity', 'low gravity', 'spacefaring', 'seafaring'],
  ['rare magic', 'common magic', 'no magic'],
  ['hard magic', 'soft magic', 'no magic'],
  ['hard sci-fi', 'soft sci-fi', 'science fantasy'],
  ['post-apocalyptic', 'post-collapse', 'golden age'],
  ['female protagonist', 'male protagonist'],
];

const TAG_INCOMPATIBILITIES = {
  'no magic': ['common magic', 'hard magic', 'high-fantasy', 'magic-system', 'rare magic', 'soft magic', 'supernatural abilities'],
  'common magic': ['hard sci-fi', 'no magic'],
  'rare magic': ['hard sci-fi', 'no magic'],
  'hard magic': ['hard sci-fi', 'no magic'],
  'soft magic': ['hard sci-fi', 'no magic'],
  'high-fantasy': ['hard sci-fi'],
  'hard sci-fi': ['common magic', 'hard magic', 'high-fantasy', 'rare magic', 'soft magic', 'supernatural abilities'],
  'underwater': ['spacefaring', 'zero gravity'],
  'zero gravity': ['seafaring', 'underwater'],
  'spacefaring': ['underwater'],
};

const GENRE_TAG_RULES = {
  Action: {
    preferredTags: ['high-stakes', 'military', 'monster hunting', 'rebellion', 'survivalist', 'time pressure', 'war'],
  },
  Adventure: {
    preferredTags: ['frontier', 'globetrotting', 'lost civilization', 'road trip', 'ruins', 'wilderness'],
  },
  Comedy: {
    preferredTags: ['cozy', 'dialogue heavy', 'dreamlike', 'found family', 'low-stakes', 'small town'],
  },
  Crime: {
    preferredTags: ['antihero', 'dialogue heavy', 'grounded', 'heist', 'morally gray', 'small town', 'urban'],
  },
  Drama: {
    preferredTags: ['dialogue heavy', 'grounded', 'intimate', 'realistic', 'slow-burn'],
  },
  Erotica: {
    preferredTags: ['erotic', 'intimate', 'nsfw', 'sex', 'slow-burn'],
  },
  Fantasy: {
    preferredTags: ['alchemy', 'common magic', 'gothic', 'hard magic', 'high-fantasy', 'low-fantasy', 'magic-system', 'medieval', 'rare magic', 'soft magic'],
    blockedTags: ['androids', 'artificial intelligence', 'cybernetics', 'cyborgs', 'hard sci-fi', 'near-future', 'robots', 'transhumanism'],
  },
  Historical: {
    preferredTags: ['ancient', 'colonial', 'medieval', 'victorian', 'wartime', 'western'],
    blockedTags: ['androids', 'artificial intelligence', 'cybernetics', 'cyborgs', 'far-future', 'near-future', 'robots', 'spacefaring', 'transhumanism', 'zero gravity'],
  },
  Horror: {
    preferredTags: ['bleak', 'body horror', 'eldritch', 'folk horror', 'gothic', 'isolated', 'surreal'],
  },
  Mystery: {
    preferredTags: ['dialogue heavy', 'grounded', 'isolated', 'political intrigue', 'ruins', 'single location', 'small town'],
  },
  Romance: {
    preferredTags: ['cozy', 'forbidden romance', 'hopeful', 'intimate', 'slow-burn'],
  },
  'Sci-Fi': {
    preferredTags: ['advanced technology', 'androids', 'artificial intelligence', 'cybernetics', 'cyborgs', 'far-future', 'faster than light', 'hard sci-fi', 'near-future', 'robots', 'space opera', 'spacefaring', 'transhumanism'],
    blockedTags: ['alchemy', 'common magic', 'hard magic', 'high-fantasy', 'magic-system', 'medieval', 'rare magic', 'soft magic'],
  },
  'Slice of Life': {
    preferredTags: ['cozy', 'dialogue heavy', 'grounded', 'intimate', 'low-stakes', 'modern day', 'small town'],
  },
  Supernatural: {
    preferredTags: ['common magic', 'gothic', 'rare magic', 'soft magic', 'supernatural abilities'],
  },
  Thriller: {
    preferredTags: ['bleak', 'grounded', 'high-stakes', 'isolated', 'political intrigue', 'road trip', 'time pressure'],
  },
};

export const PRESET_CHARACTER_TAGS = sortAlphabetically([
  'adult',
  'ambitious',
  'android',
  'aristocratic',
  'athletic',
  'awkward',
  'bald',
  'bangs',
  'bearded',
  'black hair',
  'blonde',
  'blue eyes',
  'bookish',
  'broad-shouldered',
  'brown eyes',
  'brunette',
  'calm',
  'charismatic',
  'cheerful',
  'child',
  'charming',
  'cunning',
  'curly hair',
  'cyborg',
  'determined',
  'dutiful',
  'elegant',
  'elderly',
  'female',
  'freckles',
  'gentle',
  'gifted',
  'gray eyes',
  'guarded',
  'green eyes',
  'gruff',
  'hazel eyes',
  'idealistic',
  'impulsive',
  'kind',
  'lean',
  'male',
  'mischievous',
  'mysterious',
  'nonbinary',
  'observant',
  'older',
  'optimistic',
  'pale',
  'quiet',
  'reckless',
  'red hair',
  'reserved',
  'robotic',
  'sarcastic',
  'scarred',
  'shaved head',
  'shy',
  'silver hair',
  'slender',
  'stoic',
  'straight hair',
  'stern',
  'streetwise',
  'strong',
  'tall',
  'tattoos',
  'teen',
  'timid',
  'tired eyes',
  'wavy hair',
  'white hair',
  'young adult',
  'flat chest',
  'large breasts',
  'small breasts',
  'gigantic breasts',
  'micropenis',
  'small penis',
  'large penis',
  'gigantic penis',
  'glasses',
  'dark hair',
  'human',
  'elf',
  'dwarf',
  'orc',
  'halfling',
  'alien',
]);

function clampSelectionCount(length, min, max) {
  if (length === 0) {
    return 0;
  }

  const minCount = Math.max(1, min);
  const maxCount = Math.max(minCount, max);
  const targetCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
  return Math.min(length, targetCount);
}

export function pickRandomPresets(presets, { min = 1, max = 1 } = {}) {
  const uniquePresets = [...new Set(presets)];
  const shuffledPresets = [...uniquePresets].sort(() => Math.random() - 0.5);
  const selectionCount = clampSelectionCount(shuffledPresets.length, min, max);

  return sortAlphabetically(shuffledPresets.slice(0, selectionCount));
}

export function sortPresetSelection(values) {
  return sortAlphabetically([...new Set(values)]);
}

function getBlockedTagsForGenres(genres = []) {
  if (!genres.length) {
    return new Set();
  }

  const blockedSets = genres
    .map((genre) => new Set(GENRE_TAG_RULES[genre]?.blockedTags || []))
    .filter((set) => set.size > 0);

  if (!blockedSets.length) {
    return new Set();
  }

  return new Set(
    [...blockedSets[0]].filter((tag) => blockedSets.every((set) => set.has(tag))),
  );
}

function getPreferredWeight(tag, genres = []) {
  return genres.reduce((weight, genre) => (
    weight + ((GENRE_TAG_RULES[genre]?.preferredTags || []).includes(tag) ? 2 : 0)
  ), 1);
}

function conflictsWithSelection(candidateTag, selectedTags) {
  const candidateConflicts = new Set(TAG_INCOMPATIBILITIES[candidateTag] || []);

  if (selectedTags.some((selectedTag) => candidateConflicts.has(selectedTag))) {
    return true;
  }

  for (const selectedTag of selectedTags) {
    const selectedConflicts = TAG_INCOMPATIBILITIES[selectedTag] || [];
    if (selectedConflicts.includes(candidateTag)) {
      return true;
    }
  }

  return TAG_EXCLUSIVE_GROUPS.some((group) => (
    group.includes(candidateTag) && selectedTags.some((selectedTag) => group.includes(selectedTag))
  ));
}

export function pickRandomCustomTags({
  genres = [],
  min = 5,
  max = 8,
} = {}) {
  const selectionCount = clampSelectionCount(PRESET_CUSTOM_TAGS.length, min, max);
  const blockedTags = getBlockedTagsForGenres(genres);
  const availableTags = PRESET_CUSTOM_TAGS.filter((tag) => !blockedTags.has(tag));
  const selectedTags = [];

  while (selectedTags.length < selectionCount && availableTags.length > 0) {
    const validCandidates = availableTags.filter((tag) => !conflictsWithSelection(tag, selectedTags));
    const candidatePool = validCandidates.length > 0 ? validCandidates : availableTags;
    const pickedTag = pickWeightedItem(candidatePool, (tag) => getPreferredWeight(tag, genres));

    selectedTags.push(pickedTag);
    const pickedIndex = availableTags.indexOf(pickedTag);
    if (pickedIndex >= 0) {
      availableTags.splice(pickedIndex, 1);
    }
  }

  return sortAlphabetically(selectedTags);
}
