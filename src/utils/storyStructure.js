import {
  createEmptyManuscriptDoc,
  manuscriptDocToPlainText,
  normalizeManuscriptDoc,
  plainTextToManuscriptDoc,
} from './manuscriptDocument';

export const STORY_SCOPE_TYPES = {
  PROJECT: 'project',
  ACT: 'act',
  CHAPTER: 'chapter',
  SCENE: 'scene',
};

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cleanString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function isAutomaticTitle(kind, title = '') {
  return new RegExp(`^${kind} \\d+$`).test(cleanString(title).trim());
}

function applyAutomaticNumbering(structure) {
  const chaptersById = { ...structure.chaptersById };
  const scenesById = { ...structure.scenesById };

  const acts = structure.acts.map((act, actIndex) => {
    const nextAct = {
      ...act,
      title: isAutomaticTitle('Act', act.title) ? `Act ${actIndex + 1}` : act.title,
    };

    nextAct.chapterIds.forEach((chapterId, chapterIndex) => {
      const chapter = chaptersById[chapterId];
      if (!chapter) {
        return;
      }

      chaptersById[chapterId] = {
        ...chapter,
        title: isAutomaticTitle('Chapter', chapter.title) ? `Chapter ${chapterIndex + 1}` : chapter.title,
      };

      chaptersById[chapterId].sceneIds.forEach((sceneId, sceneIndex) => {
        const scene = scenesById[sceneId];
        if (!scene) {
          return;
        }

        scenesById[sceneId] = {
          ...scene,
          title: isAutomaticTitle('Scene', scene.title) ? `Scene ${sceneIndex + 1}` : scene.title,
        };
      });
    });

    return nextAct;
  });

  return {
    ...structure,
    acts,
    chaptersById,
    scenesById,
  };
}

function createAct({ id = createId('act'), title = 'Act 1', chapterIds = [] } = {}) {
  return {
    id: cleanString(id, createId('act')),
    title: cleanString(title, 'Untitled Act') || 'Untitled Act',
    chapterIds: Array.isArray(chapterIds) ? chapterIds.filter((entry) => typeof entry === 'string') : [],
  };
}

function createChapter({
  id = createId('chapter'),
  title = 'Chapter 1',
  actId = '',
  sceneIds = [],
} = {}) {
  return {
    id: cleanString(id, createId('chapter')),
    title: cleanString(title, 'Untitled Chapter') || 'Untitled Chapter',
    actId: cleanString(actId),
    sceneIds: Array.isArray(sceneIds) ? sceneIds.filter((entry) => typeof entry === 'string') : [],
  };
}

export function createScene({
  id = createId('scene'),
  title = 'Scene 1',
  chapterId = '',
  manuscriptDoc = null,
  storyText = '',
  createdAt = new Date().toISOString(),
  updatedAt = createdAt,
} = {}) {
  const normalizedDoc = normalizeManuscriptDoc(manuscriptDoc, storyText);

  return {
    id: cleanString(id, createId('scene')),
    title: cleanString(title, 'Untitled Scene') || 'Untitled Scene',
    chapterId: cleanString(chapterId),
    manuscriptDoc: normalizedDoc,
    createdAt: cleanString(createdAt, new Date().toISOString()),
    updatedAt: cleanString(updatedAt, createdAt),
  };
}

export function createInitialStoryStructure({
  manuscriptDoc = null,
  storyText = '',
  now = new Date().toISOString(),
} = {}) {
  const actId = createId('act');
  const chapterId = createId('chapter');
  const sceneId = createId('scene');
  const resolvedDoc = manuscriptDoc
    ? normalizeManuscriptDoc(manuscriptDoc, storyText)
    : plainTextToManuscriptDoc(storyText);

  return {
    acts: [createAct({ id: actId, title: 'Act 1', chapterIds: [chapterId] })],
    chaptersById: {
      [chapterId]: createChapter({
        id: chapterId,
        title: 'Chapter 1',
        actId,
        sceneIds: [sceneId],
      }),
    },
    scenesById: {
      [sceneId]: createScene({
        id: sceneId,
        title: 'Scene 1',
        chapterId,
        manuscriptDoc: resolvedDoc,
        createdAt: now,
        updatedAt: now,
      }),
    },
    activeSceneId: sceneId,
    viewScope: {
      type: STORY_SCOPE_TYPES.PROJECT,
      id: null,
    },
  };
}

function resolveValidScope(structure, scope) {
  const candidateType = cleanString(scope?.type, STORY_SCOPE_TYPES.PROJECT);
  const candidateId = cleanString(scope?.id, null);

  if (candidateType === STORY_SCOPE_TYPES.ACT && structure.acts.some((act) => act.id === candidateId)) {
    return { type: STORY_SCOPE_TYPES.ACT, id: candidateId };
  }

  if (candidateType === STORY_SCOPE_TYPES.CHAPTER && structure.chaptersById[candidateId]) {
    return { type: STORY_SCOPE_TYPES.CHAPTER, id: candidateId };
  }

  if (candidateType === STORY_SCOPE_TYPES.SCENE && structure.scenesById[candidateId]) {
    return { type: STORY_SCOPE_TYPES.SCENE, id: candidateId };
  }

  return { type: STORY_SCOPE_TYPES.PROJECT, id: null };
}

export function normalizeStoryStructure(value, fallback = {}) {
  if (!value || typeof value !== 'object') {
    return applyAutomaticNumbering(createInitialStoryStructure(fallback));
  }

  const rawActs = Array.isArray(value.acts) ? value.acts : [];
  const rawChaptersById = value.chaptersById && typeof value.chaptersById === 'object'
    ? value.chaptersById
    : {};
  const rawScenesById = value.scenesById && typeof value.scenesById === 'object'
    ? value.scenesById
    : {};

  if (rawActs.length === 0) {
    return applyAutomaticNumbering(createInitialStoryStructure(fallback));
  }

  const chaptersById = {};
  const scenesById = {};
  const acts = [];

  rawActs.forEach((rawAct, actIndex) => {
    const act = createAct({
      ...rawAct,
      title: cleanString(rawAct?.title, `Act ${actIndex + 1}`),
    });
    const validChapterIds = [];

    act.chapterIds.forEach((chapterId) => {
      const rawChapter = rawChaptersById[chapterId];
      if (!rawChapter) {
        return;
      }

      const chapter = createChapter({
        ...rawChapter,
        id: chapterId,
        actId: act.id,
      });
      const validSceneIds = [];

      chapter.sceneIds.forEach((sceneId) => {
        const rawScene = rawScenesById[sceneId];
        if (!rawScene) {
          return;
        }

        const scene = createScene({
          ...rawScene,
          id: sceneId,
          chapterId,
        });

        scenesById[scene.id] = scene;
        validSceneIds.push(scene.id);
      });

      if (validSceneIds.length > 0) {
        chaptersById[chapter.id] = {
          ...chapter,
          sceneIds: validSceneIds,
        };
        validChapterIds.push(chapter.id);
      }
    });

    if (validChapterIds.length > 0) {
      acts.push({
        ...act,
        chapterIds: validChapterIds,
      });
    }
  });

  if (acts.length === 0) {
    return applyAutomaticNumbering(createInitialStoryStructure(fallback));
  }

  const firstSceneId = acts
    .flatMap((act) => act.chapterIds)
    .flatMap((chapterId) => chaptersById[chapterId]?.sceneIds || [])[0];
  const activeSceneId = scenesById[value.activeSceneId] ? value.activeSceneId : firstSceneId;
  const structure = {
    acts,
    chaptersById,
    scenesById,
    activeSceneId,
    viewScope: { type: STORY_SCOPE_TYPES.PROJECT, id: null },
  };

  return applyAutomaticNumbering({
    ...structure,
    viewScope: resolveValidScope(structure, value.viewScope),
  });
}

export function getOrderedSceneEntries(storyStructure) {
  const structure = normalizeStoryStructure(storyStructure);

  return structure.acts.flatMap((act, actIndex) => (
    act.chapterIds.flatMap((chapterId, chapterIndex) => {
      const chapter = structure.chaptersById[chapterId];
      if (!chapter) {
        return [];
      }

      return chapter.sceneIds
        .map((sceneId, sceneIndex) => {
          const scene = structure.scenesById[sceneId];
          if (!scene) {
            return null;
          }

          return {
            act,
            chapter,
            scene,
            actIndex,
            chapterIndex,
            sceneIndex,
          };
        })
        .filter(Boolean);
    })
  ));
}

export function getVisibleSceneEntries(storyStructure, viewScope = storyStructure?.viewScope) {
  const structure = normalizeStoryStructure(storyStructure);
  const scope = resolveValidScope(structure, viewScope || structure.viewScope);
  const entries = getOrderedSceneEntries(structure);

  if (scope.type === STORY_SCOPE_TYPES.ACT) {
    return entries.filter((entry) => entry.act.id === scope.id);
  }

  if (scope.type === STORY_SCOPE_TYPES.CHAPTER) {
    return entries.filter((entry) => entry.chapter.id === scope.id);
  }

  if (scope.type === STORY_SCOPE_TYPES.SCENE) {
    return entries.filter((entry) => entry.scene.id === scope.id);
  }

  return entries;
}

export function storyStructureToPlainText(storyStructure) {
  return getOrderedSceneEntries(storyStructure)
    .map((entry) => manuscriptDocToPlainText(entry.scene.manuscriptDoc).trim())
    .filter(Boolean)
    .join('\n\n');
}

export function storyStructureToManuscriptDoc(storyStructure) {
  const storyText = storyStructureToPlainText(storyStructure);
  return storyText ? plainTextToManuscriptDoc(storyText) : createEmptyManuscriptDoc();
}

export function storyStructureToExportText(storyStructure, format = 'txt', viewScope = null) {
  const entries = viewScope
    ? getVisibleSceneEntries(storyStructure, viewScope)
    : getOrderedSceneEntries(storyStructure);
  const lines = [];
  let previousActId = '';
  let previousChapterId = '';

  entries.forEach(({ act, chapter, scene }) => {
    const sceneText = manuscriptDocToPlainText(scene.manuscriptDoc).trim();
    if (act.id !== previousActId) {
      lines.push(format === 'markdown' ? `# ${act.title}` : act.title);
      previousActId = act.id;
      previousChapterId = '';
    }

    if (chapter.id !== previousChapterId) {
      lines.push(format === 'markdown' ? `## ${chapter.title}` : chapter.title);
      previousChapterId = chapter.id;
    }

    lines.push(format === 'markdown' ? `### ${scene.title}` : scene.title);
    if (sceneText) {
      lines.push(sceneText);
    }
  });

  return lines.filter((line) => line !== '').join('\n\n');
}

export function getScenePlainText(storyStructure, sceneId) {
  const structure = normalizeStoryStructure(storyStructure);
  const scene = structure.scenesById[sceneId];
  return scene ? manuscriptDocToPlainText(scene.manuscriptDoc) : '';
}

function withDerivedCaches(storyStructure) {
  const normalizedStructure = normalizeStoryStructure(storyStructure);

  return {
    storyStructure: normalizedStructure,
    manuscriptDoc: storyStructureToManuscriptDoc(normalizedStructure),
    storyText: storyStructureToPlainText(normalizedStructure),
  };
}

export function createProjectContentFromStructure(storyStructure) {
  return withDerivedCaches(storyStructure);
}

export function updateSceneManuscriptDoc(storyStructure, sceneId, manuscriptDoc) {
  const structure = normalizeStoryStructure(storyStructure);
  const targetSceneId = structure.scenesById[sceneId] ? sceneId : structure.activeSceneId;
  const currentScene = structure.scenesById[targetSceneId];
  const nextStructure = {
    ...structure,
    scenesById: {
      ...structure.scenesById,
      [targetSceneId]: {
        ...currentScene,
        manuscriptDoc: normalizeManuscriptDoc(manuscriptDoc),
        updatedAt: new Date().toISOString(),
      },
    },
    activeSceneId: targetSceneId,
  };

  return withDerivedCaches(nextStructure);
}

export function setActiveScene(storyStructure, sceneId) {
  const structure = normalizeStoryStructure(storyStructure);
  if (!structure.scenesById[sceneId]) {
    return withDerivedCaches(structure);
  }

  return withDerivedCaches({
    ...structure,
    activeSceneId: sceneId,
  });
}

export function setViewScope(storyStructure, viewScope) {
  const structure = normalizeStoryStructure(storyStructure);
  const nextScope = resolveValidScope(structure, viewScope);
  const visibleEntries = getVisibleSceneEntries(structure, nextScope);
  const nextActiveSceneId = visibleEntries.some((entry) => entry.scene.id === structure.activeSceneId)
    ? structure.activeSceneId
    : (visibleEntries[0]?.scene.id || structure.activeSceneId);

  return withDerivedCaches({
    ...structure,
    activeSceneId: nextActiveSceneId,
    viewScope: nextScope,
  });
}

export function addAct(storyStructure) {
  const structure = normalizeStoryStructure(storyStructure);
  const actId = createId('act');
  const chapterId = createId('chapter');
  const sceneId = createId('scene');
  const now = new Date().toISOString();
  const nextActNumber = structure.acts.length + 1;

  return withDerivedCaches({
    ...structure,
    acts: [
      ...structure.acts,
      createAct({ id: actId, title: `Act ${nextActNumber}`, chapterIds: [chapterId] }),
    ],
    chaptersById: {
      ...structure.chaptersById,
      [chapterId]: createChapter({
        id: chapterId,
        title: 'Chapter 1',
        actId,
        sceneIds: [sceneId],
      }),
    },
    scenesById: {
      ...structure.scenesById,
      [sceneId]: createScene({
        id: sceneId,
        title: 'Scene 1',
        chapterId,
        createdAt: now,
        updatedAt: now,
      }),
    },
    activeSceneId: sceneId,
    viewScope: {
      type: STORY_SCOPE_TYPES.ACT,
      id: actId,
    },
  });
}

export function addChapter(storyStructure, actId) {
  const structure = normalizeStoryStructure(storyStructure);
  const targetAct = structure.acts.find((act) => act.id === actId) || structure.acts[0];
  const chapterId = createId('chapter');
  const sceneId = createId('scene');
  const now = new Date().toISOString();
  const nextChapterNumber = targetAct.chapterIds.length + 1;

  return withDerivedCaches({
    ...structure,
    acts: structure.acts.map((act) => (
      act.id === targetAct.id
        ? { ...act, chapterIds: [...act.chapterIds, chapterId] }
        : act
    )),
    chaptersById: {
      ...structure.chaptersById,
      [chapterId]: createChapter({
        id: chapterId,
        title: `Chapter ${nextChapterNumber}`,
        actId: targetAct.id,
        sceneIds: [sceneId],
      }),
    },
    scenesById: {
      ...structure.scenesById,
      [sceneId]: createScene({
        id: sceneId,
        title: 'Scene 1',
        chapterId,
        createdAt: now,
        updatedAt: now,
      }),
    },
    activeSceneId: sceneId,
    viewScope: {
      type: STORY_SCOPE_TYPES.CHAPTER,
      id: chapterId,
    },
  });
}

export function addScene(storyStructure, chapterId, { openInSceneView = false } = {}) {
  const structure = normalizeStoryStructure(storyStructure);
  const targetChapter = structure.chaptersById[chapterId] || structure.chaptersById[structure.acts[0].chapterIds[0]];
  const sceneId = createId('scene');
  const now = new Date().toISOString();
  const nextSceneNumber = targetChapter.sceneIds.length + 1;
  const nextViewScope = openInSceneView
    ? {
        type: STORY_SCOPE_TYPES.SCENE,
        id: sceneId,
      }
    : structure.viewScope;

  return withDerivedCaches({
    ...structure,
    chaptersById: {
      ...structure.chaptersById,
      [targetChapter.id]: {
        ...targetChapter,
        sceneIds: [...targetChapter.sceneIds, sceneId],
      },
    },
    scenesById: {
      ...structure.scenesById,
      [sceneId]: createScene({
        id: sceneId,
        title: `Scene ${nextSceneNumber}`,
        chapterId: targetChapter.id,
        createdAt: now,
        updatedAt: now,
      }),
    },
    activeSceneId: sceneId,
    viewScope: nextViewScope,
  });
}

export function renameStructureNode(storyStructure, nodeType, nodeId, title) {
  const structure = normalizeStoryStructure(storyStructure);
  const nextTitle = cleanString(title).trim();
  if (!nextTitle) {
    return withDerivedCaches(structure);
  }

  if (nodeType === STORY_SCOPE_TYPES.ACT) {
    return withDerivedCaches({
      ...structure,
      acts: structure.acts.map((act) => (act.id === nodeId ? { ...act, title: nextTitle } : act)),
    });
  }

  if (nodeType === STORY_SCOPE_TYPES.CHAPTER && structure.chaptersById[nodeId]) {
    return withDerivedCaches({
      ...structure,
      chaptersById: {
        ...structure.chaptersById,
        [nodeId]: {
          ...structure.chaptersById[nodeId],
          title: nextTitle,
        },
      },
    });
  }

  if (nodeType === STORY_SCOPE_TYPES.SCENE && structure.scenesById[nodeId]) {
    return withDerivedCaches({
      ...structure,
      scenesById: {
        ...structure.scenesById,
        [nodeId]: {
          ...structure.scenesById[nodeId],
          title: nextTitle,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  }

  return withDerivedCaches(structure);
}

function moveId(ids, id, direction) {
  const index = ids.indexOf(id);
  const nextIndex = direction === 'up' ? index - 1 : index + 1;

  if (index === -1 || nextIndex < 0 || nextIndex >= ids.length) {
    return ids;
  }

  const nextIds = [...ids];
  const [item] = nextIds.splice(index, 1);
  nextIds.splice(nextIndex, 0, item);
  return nextIds;
}

function insertId(ids, id, index) {
  const withoutId = ids.filter((entryId) => entryId !== id);
  const nextIndex = Math.min(Math.max(Number(index) || 0, 0), withoutId.length);

  return [
    ...withoutId.slice(0, nextIndex),
    id,
    ...withoutId.slice(nextIndex),
  ];
}

export function reorderStructureNode(storyStructure, nodeType, nodeId, direction) {
  const structure = normalizeStoryStructure(storyStructure);

  if (nodeType === STORY_SCOPE_TYPES.ACT) {
    return withDerivedCaches({
      ...structure,
      acts: moveId(structure.acts.map((act) => act.id), nodeId, direction)
        .map((actId) => structure.acts.find((act) => act.id === actId))
        .filter(Boolean),
    });
  }

  if (nodeType === STORY_SCOPE_TYPES.CHAPTER) {
    const chapter = structure.chaptersById[nodeId];
    if (!chapter) {
      return withDerivedCaches(structure);
    }

    return withDerivedCaches({
      ...structure,
      acts: structure.acts.map((act) => (
        act.id === chapter.actId
          ? { ...act, chapterIds: moveId(act.chapterIds, nodeId, direction) }
          : act
      )),
    });
  }

  if (nodeType === STORY_SCOPE_TYPES.SCENE) {
    const scene = structure.scenesById[nodeId];
    const chapter = scene ? structure.chaptersById[scene.chapterId] : null;
    if (!chapter) {
      return withDerivedCaches(structure);
    }

    return withDerivedCaches({
      ...structure,
      chaptersById: {
        ...structure.chaptersById,
        [chapter.id]: {
          ...chapter,
          sceneIds: moveId(chapter.sceneIds, nodeId, direction),
        },
      },
    });
  }

  return withDerivedCaches(structure);
}

export function moveStructureNode(storyStructure, {
  nodeType = '',
  nodeId = '',
  targetParentId = '',
  targetIndex = 0,
} = {}) {
  const structure = normalizeStoryStructure(storyStructure);

  if (nodeType === STORY_SCOPE_TYPES.ACT && structure.acts.some((act) => act.id === nodeId)) {
    const actsById = Object.fromEntries(structure.acts.map((act) => [act.id, act]));
    return withDerivedCaches({
      ...structure,
      acts: insertId(structure.acts.map((act) => act.id), nodeId, targetIndex)
        .map((actId) => actsById[actId])
        .filter(Boolean),
    });
  }

  if (nodeType === STORY_SCOPE_TYPES.CHAPTER) {
    const chapter = structure.chaptersById[nodeId];
    const targetAct = structure.acts.find((act) => act.id === targetParentId);
    if (!chapter || !targetAct) {
      return withDerivedCaches(structure);
    }

    return withDerivedCaches({
      ...structure,
      acts: structure.acts.map((act) => {
        if (act.id === targetAct.id) {
          return {
            ...act,
            chapterIds: insertId(act.chapterIds, nodeId, targetIndex),
          };
        }

        if (act.id === chapter.actId) {
          return {
            ...act,
            chapterIds: act.chapterIds.filter((chapterId) => chapterId !== nodeId),
          };
        }

        return act;
      }),
      chaptersById: {
        ...structure.chaptersById,
        [nodeId]: {
          ...chapter,
          actId: targetAct.id,
        },
      },
    });
  }

  if (nodeType === STORY_SCOPE_TYPES.SCENE) {
    const scene = structure.scenesById[nodeId];
    const sourceChapter = scene ? structure.chaptersById[scene.chapterId] : null;
    const targetChapter = structure.chaptersById[targetParentId];
    if (!scene || !sourceChapter || !targetChapter) {
      return withDerivedCaches(structure);
    }

    return withDerivedCaches({
      ...structure,
      chaptersById: {
        ...structure.chaptersById,
        [sourceChapter.id]: {
          ...sourceChapter,
          sceneIds: sourceChapter.id === targetChapter.id
            ? insertId(sourceChapter.sceneIds, nodeId, targetIndex)
            : sourceChapter.sceneIds.filter((sceneId) => sceneId !== nodeId),
        },
        ...(sourceChapter.id === targetChapter.id
          ? {}
          : {
              [targetChapter.id]: {
                ...targetChapter,
                sceneIds: insertId(targetChapter.sceneIds, nodeId, targetIndex),
              },
            }),
      },
      scenesById: {
        ...structure.scenesById,
        [nodeId]: {
          ...scene,
          chapterId: targetChapter.id,
        },
      },
      activeSceneId: nodeId,
    });
  }

  return withDerivedCaches(structure);
}

export function moveChapterToAct(storyStructure, chapterId, nextActId) {
  const structure = normalizeStoryStructure(storyStructure);
  const chapter = structure.chaptersById[chapterId];
  const nextAct = structure.acts.find((act) => act.id === nextActId);
  if (!chapter || !nextAct || chapter.actId === nextAct.id) {
    return withDerivedCaches(structure);
  }

  return withDerivedCaches({
    ...structure,
    acts: structure.acts.map((act) => {
      if (act.id === chapter.actId) {
        return { ...act, chapterIds: act.chapterIds.filter((id) => id !== chapterId) };
      }

      if (act.id === nextAct.id) {
        return { ...act, chapterIds: [...act.chapterIds, chapterId] };
      }

      return act;
    }),
    chaptersById: {
      ...structure.chaptersById,
      [chapterId]: {
        ...chapter,
        actId: nextAct.id,
      },
    },
  });
}

export function moveSceneToChapter(storyStructure, sceneId, nextChapterId) {
  const structure = normalizeStoryStructure(storyStructure);
  const scene = structure.scenesById[sceneId];
  const nextChapter = structure.chaptersById[nextChapterId];
  if (!scene || !nextChapter || scene.chapterId === nextChapter.id) {
    return withDerivedCaches(structure);
  }

  const currentChapter = structure.chaptersById[scene.chapterId];

  return withDerivedCaches({
    ...structure,
    chaptersById: {
      ...structure.chaptersById,
      ...(currentChapter
        ? {
            [currentChapter.id]: {
              ...currentChapter,
              sceneIds: currentChapter.sceneIds.filter((id) => id !== sceneId),
            },
          }
        : {}),
      [nextChapter.id]: {
        ...nextChapter,
        sceneIds: [...nextChapter.sceneIds, sceneId],
      },
    },
    scenesById: {
      ...structure.scenesById,
      [sceneId]: {
        ...scene,
        chapterId: nextChapter.id,
      },
    },
  });
}

export function deleteStructureNode(storyStructure, nodeType, nodeId) {
  const structure = normalizeStoryStructure(storyStructure);
  const sceneCount = Object.keys(structure.scenesById).length;

  if (nodeType === STORY_SCOPE_TYPES.SCENE) {
    const scene = structure.scenesById[nodeId];
    const chapter = scene ? structure.chaptersById[scene.chapterId] : null;
    if (!scene || !chapter) {
      return withDerivedCaches(structure);
    }

    if (sceneCount <= 1) {
      return updateSceneManuscriptDoc(structure, nodeId, createEmptyManuscriptDoc());
    }

    const scenesById = { ...structure.scenesById };
    delete scenesById[nodeId];
    const nextStructure = {
      ...structure,
      chaptersById: {
        ...structure.chaptersById,
        [chapter.id]: {
          ...chapter,
          sceneIds: chapter.sceneIds.filter((id) => id !== nodeId),
        },
      },
      scenesById,
    };
    const normalized = normalizeStoryStructure(nextStructure);

    return withDerivedCaches({
      ...normalized,
      activeSceneId: normalized.scenesById[structure.activeSceneId]
        ? structure.activeSceneId
        : getOrderedSceneEntries(normalized)[0]?.scene.id,
      viewScope: normalized.scenesById[structure.viewScope?.id] ? structure.viewScope : normalized.viewScope,
    });
  }

  if (nodeType === STORY_SCOPE_TYPES.CHAPTER) {
    const chapter = structure.chaptersById[nodeId];
    const remainingSceneCount = sceneCount - (chapter?.sceneIds.length || 0);
    if (!chapter || remainingSceneCount <= 0) {
      return withDerivedCaches(structure);
    }

    const chaptersById = { ...structure.chaptersById };
    const scenesById = { ...structure.scenesById };
    delete chaptersById[nodeId];
    chapter.sceneIds.forEach((sceneId) => delete scenesById[sceneId]);

    return withDerivedCaches(normalizeStoryStructure({
      ...structure,
      acts: structure.acts.map((act) => (
        act.id === chapter.actId
          ? { ...act, chapterIds: act.chapterIds.filter((id) => id !== nodeId) }
          : act
      )),
      chaptersById,
      scenesById,
      viewScope: { type: STORY_SCOPE_TYPES.PROJECT, id: null },
    }));
  }

  if (nodeType === STORY_SCOPE_TYPES.ACT) {
    const act = structure.acts.find((entry) => entry.id === nodeId);
    if (!act || structure.acts.length <= 1) {
      return withDerivedCaches(structure);
    }

    const chaptersById = { ...structure.chaptersById };
    const scenesById = { ...structure.scenesById };
    act.chapterIds.forEach((chapterId) => {
      chaptersById[chapterId]?.sceneIds.forEach((sceneId) => delete scenesById[sceneId]);
      delete chaptersById[chapterId];
    });

    return withDerivedCaches(normalizeStoryStructure({
      ...structure,
      acts: structure.acts.filter((entry) => entry.id !== nodeId),
      chaptersById,
      scenesById,
      viewScope: { type: STORY_SCOPE_TYPES.PROJECT, id: null },
    }));
  }

  return withDerivedCaches(structure);
}

export function getStructureStats(storyStructure, nodeType, nodeId) {
  const structure = normalizeStoryStructure(storyStructure);
  let entries = [];

  if (nodeType === STORY_SCOPE_TYPES.ACT) {
    entries = getOrderedSceneEntries(structure).filter((entry) => entry.act.id === nodeId);
  } else if (nodeType === STORY_SCOPE_TYPES.CHAPTER) {
    entries = getOrderedSceneEntries(structure).filter((entry) => entry.chapter.id === nodeId);
  } else if (nodeType === STORY_SCOPE_TYPES.SCENE) {
    entries = getOrderedSceneEntries(structure).filter((entry) => entry.scene.id === nodeId);
  }

  const text = entries
    .map((entry) => manuscriptDocToPlainText(entry.scene.manuscriptDoc))
    .join('\n\n')
    .trim();

  return {
    sceneCount: entries.length,
    wordCount: text ? text.split(/\s+/).length : 0,
    hasProse: Boolean(text),
  };
}

export function cloneStoryStructure(storyStructure) {
  return clone(normalizeStoryStructure(storyStructure));
}
