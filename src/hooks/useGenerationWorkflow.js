import { useState } from 'react';
import {
  DEFAULT_PARAGRAPH_LIMIT,
  DEFAULT_WORD_LIMIT,
  STORY_LIMIT_TYPES,
} from '../config/storyLimits';
import {
  getGeneratedSegmentRangeFromManuscriptDoc,
  insertGeneratedSegmentInManuscriptDoc,
  insertWriteCommandLineInManuscriptDoc,
  manuscriptDocToPlainText,
  removeWriteCommandLineFromManuscriptDoc,
} from '../utils/manuscriptDocument';
import { createGenerationHistoryEntry } from '../utils/projectState';
import {
  updateSceneManuscriptDoc,
} from '../utils/storyStructure';
import {
  getDefaultRewriteMode,
  getDefaultStoryGenerationMode,
  isRewriteMode,
  isStoryGenerationModeAvailable,
  STORY_GENERATION_MODES,
} from '../utils/storyGeneration';

const DEFAULT_WRITE_MENU_STATE = {
  isOpen: false,
  intent: 'generate',
  source: 'dock',
  anchorRect: null,
  selection: null,
  selectionDocRange: null,
  selectionPlainTextRange: null,
  selectedText: '',
  insertionTarget: null,
  plainTextOffset: null,
  commandAnchorId: '',
  sceneId: '',
  baseStoryText: '',
  baseManuscriptDoc: null,
  baseSceneText: '',
  baseSceneDoc: null,
};

function buildGenerationSnapshotLabel(mode, isRegeneration = false) {
  if (isRewriteMode(mode)) {
    return isRegeneration ? 'Regenerated rewrite' : 'Rewrote selected prose';
  }

  if (isRegeneration) {
    if (mode === STORY_GENERATION_MODES.START) {
      return 'Regenerated opening segment';
    }

    if (mode === STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL) {
      return 'Regenerated goal-directed segment';
    }

    return 'Regenerated continuation';
  }

  if (mode === STORY_GENERATION_MODES.START) {
    return 'Started story with AI';
  }

  if (mode === STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL) {
    return 'Generated goal-directed segment';
  }

  return 'Generated continuation';
}

function buildGenerationHistoryEntryFromResult(result, source = 'generation') {
  const range = result.segmentRange || {
    startIndex: 0,
    endIndex: result.generatedSegmentText.length,
  };

  return createGenerationHistoryEntry({
    id: result.entryId,
    sceneId: result.sceneId,
    generationMode: result.generationMode,
    source,
    generatedText: result.generatedSegmentText,
    originalText: result.selectedText,
    startIndex: range.startIndex,
    endIndex: range.endIndex,
    whatHappensNext: result.whatHappensNext,
    nextMainEvent: result.nextMainEvent,
    createdAt: new Date().toISOString(),
    isApplied: true,
  });
}

function buildRecentScenePromptText(sceneText = '', offset = sceneText.length) {
  const textBeforeCursor = sceneText.slice(0, Math.max(0, offset)).trim();
  if (!textBeforeCursor) {
    return '';
  }

  const paragraphs = textBeforeCursor
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.slice(-3).join('\n\n');
}

function applyGeneratedSegmentToDraft({
  baseManuscriptDoc,
  generatedText,
  entryId,
  commandAnchorId = '',
  insertionTarget = null,
}) {
  const nextManuscriptDoc = insertGeneratedSegmentInManuscriptDoc(baseManuscriptDoc, {
    entryId,
    generatedText,
    commandAnchorId,
    insertionTarget,
  });

  return {
    nextManuscriptDoc,
    nextStoryText: manuscriptDocToPlainText(nextManuscriptDoc),
    segmentRange: getGeneratedSegmentRangeFromManuscriptDoc(nextManuscriptDoc, entryId),
  };
}

export default function useGenerationWorkflow({
  storyText,
  manuscriptDoc,
  storyStructure,
  fullStoryText = storyText,
  activeSceneId,
  nextMainEvent,
  lastGeneration,
  generateStorySegment,
  rewriteStorySelection,
  rebuildMemoryFromStory,
  setMemory,
  setWhatHappensNext,
  setNextMainEvent,
  setLimitValue,
  setCurrentProjectField,
  updateCurrentProject,
  saveSnapshot,
  onToast,
  onRequireSettings,
}) {
  const [writeMenuState, setWriteMenuState] = useState(DEFAULT_WRITE_MENU_STATE);
  const [activeWriteCommand, setActiveWriteCommand] = useState(STORY_GENERATION_MODES.START);
  const [pendingRewriteRequest, setPendingRewriteRequest] = useState(null);

  const resolveWriteCommand = (preferredMode = null) => {
    const candidates = [
      preferredMode,
      activeWriteCommand,
      getDefaultStoryGenerationMode(storyText),
      STORY_GENERATION_MODES.START,
      STORY_GENERATION_MODES.CONTINUE,
    ].filter(Boolean);

    return candidates.find((mode) => isStoryGenerationModeAvailable(mode, { storyText, nextMainEvent }))
      || getDefaultStoryGenerationMode(storyText);
  };

  const resolveRewriteCommand = (preferredMode = null) => {
    const candidates = [
      preferredMode,
      activeWriteCommand,
      getDefaultRewriteMode(),
    ].filter(Boolean);

    return candidates.find((mode) => isRewriteMode(mode)) || getDefaultRewriteMode();
  };

  const handleOpenWriteMenu = (preferredMode = null, options = {}) => {
    const {
      anchorRect = null,
      selection = null,
      selectionDocRange = null,
      selectionPlainTextRange = null,
      selectedText = '',
      insertionTarget = null,
      plainTextOffset = null,
      sceneId = activeSceneId,
      source = 'dock',
    } = options && typeof options === 'object' ? options : {};
    const targetSceneId = sceneId || activeSceneId;
    const targetSceneDoc = storyStructure?.scenesById?.[targetSceneId]?.manuscriptDoc || manuscriptDoc;
    const targetSceneText = manuscriptDocToPlainText(targetSceneDoc);

    const isRewriteIntent = Boolean(
      selectedText.trim()
      && selectionDocRange
      && Number.isInteger(selectionDocRange.from)
      && Number.isInteger(selectionDocRange.to)
      && selectionDocRange.from < selectionDocRange.to
    );

    const commandAnchorId = !isRewriteIntent && source === 'editor' && insertionTarget
      ? createGenerationHistoryEntry({
        generationMode: resolveWriteCommand(preferredMode),
        source: 'command-anchor',
      }).id
      : '';

    if (commandAnchorId) {
      updateCurrentProject((projectState) => (
        updateSceneManuscriptDoc(
          projectState.storyStructure,
          targetSceneId,
          insertWriteCommandLineInManuscriptDoc(targetSceneDoc, {
            anchorId: commandAnchorId,
            insertionTarget,
          }),
        )
      ));
    }

    setActiveWriteCommand(
      isRewriteIntent ? resolveRewriteCommand(preferredMode) : resolveWriteCommand(preferredMode),
    );
    setWriteMenuState({
      isOpen: true,
      intent: isRewriteIntent ? 'rewrite' : 'generate',
      source,
      anchorRect,
      selection,
      selectionDocRange,
      selectionPlainTextRange,
      selectedText,
      insertionTarget,
      plainTextOffset: typeof plainTextOffset === 'number' ? plainTextOffset : null,
      commandAnchorId,
      sceneId: targetSceneId,
      baseStoryText: targetSceneText,
      baseManuscriptDoc: targetSceneDoc,
      baseSceneText: targetSceneText,
      baseSceneDoc: targetSceneDoc,
    });
  };

  const handleCloseWriteMenu = ({ restoreCommandLine = true } = {}) => {
    if (restoreCommandLine && writeMenuState.commandAnchorId) {
      updateCurrentProject((projectState) => (
        updateSceneManuscriptDoc(
          projectState.storyStructure,
          writeMenuState.sceneId || activeSceneId,
          writeMenuState.baseManuscriptDoc
          || removeWriteCommandLineFromManuscriptDoc(manuscriptDoc, writeMenuState.commandAnchorId),
        )
      ));
    }

    setWriteMenuState(() => ({
      ...DEFAULT_WRITE_MENU_STATE,
    }));
  };

  const handleRunWriteCommand = async (mode) => {
    const pendingWriteMenuState = writeMenuState;
    handleCloseWriteMenu({ restoreCommandLine: false });

    if (isRewriteMode(mode)) {
      if (!pendingWriteMenuState.selectedText.trim()) {
        onToast('Select prose in the editor before using rewrite commands.');
        return;
      }

      const rewriteRequestId = createGenerationHistoryEntry({
        generationMode: mode,
        source: 'rewrite-preview',
        originalText: pendingWriteMenuState.selectedText,
        startIndex: pendingWriteMenuState.selectionPlainTextRange?.startIndex ?? 0,
        endIndex: pendingWriteMenuState.selectionPlainTextRange?.endIndex ?? pendingWriteMenuState.selectedText.length,
      }).id;
      const baseStoryText = pendingWriteMenuState.baseStoryText || storyText;
      const baseManuscriptDoc = pendingWriteMenuState.baseManuscriptDoc || manuscriptDoc;
      const targetSceneId = pendingWriteMenuState.sceneId || activeSceneId;

      const result = await rewriteStorySelection({
        mode,
        storyText: fullStoryText,
        selectedText: pendingWriteMenuState.selectedText,
        selectionRange: pendingWriteMenuState.selectionPlainTextRange,
      });

      if (result?.success) {
        setPendingRewriteRequest({
          sceneId: targetSceneId,
          requestId: rewriteRequestId,
          generationMode: result.generationMode,
          rewrittenText: result.rewrittenText,
          selectedText: pendingWriteMenuState.selectedText,
          selectionDocRange: pendingWriteMenuState.selectionDocRange,
          selectionPlainTextRange: pendingWriteMenuState.selectionPlainTextRange,
          baseStoryText,
          baseManuscriptDoc,
          baseSceneText: pendingWriteMenuState.baseSceneText || baseStoryText,
          baseSceneDoc: pendingWriteMenuState.baseSceneDoc || baseManuscriptDoc,
          baseMemory: result.baseMemory,
          rewriteInstruction: result.rewriteInstruction,
        });
      }

      if (result?.requiresApiKey) {
        onRequireSettings();
      }

      return;
    }

    if (mode === STORY_GENERATION_MODES.START && storyText.trim()) {
      onToast('Start Writing is only available when the manuscript is empty.');
      return;
    }

    if (mode === STORY_GENERATION_MODES.CONTINUE && !storyText.trim()) {
      onToast('There is no manuscript yet. Use Start Writing first.');
      return;
    }

    if (mode === STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL) {
      if (!storyText.trim()) {
        onToast('Write an opening segment before steering toward a goal.');
        return;
      }

      if (!nextMainEvent.trim()) {
        onToast('Add a next main event or goal before using Write Toward Goal.');
        return;
      }
    }

    const entryId = createGenerationHistoryEntry({
      generationMode: mode,
      source: 'generation-preview',
    }).id;
    const insertionOffset = typeof pendingWriteMenuState.plainTextOffset === 'number'
      ? pendingWriteMenuState.plainTextOffset
      : storyText.length;
    const targetSceneId = pendingWriteMenuState.sceneId || activeSceneId;
    const promptStoryText = mode === STORY_GENERATION_MODES.START
      ? ''
      : buildRecentScenePromptText(pendingWriteMenuState.baseStoryText || storyText, insertionOffset);
    const baseStoryText = pendingWriteMenuState.baseStoryText || storyText;
    const baseManuscriptDoc = pendingWriteMenuState.baseManuscriptDoc || manuscriptDoc;
    const insertionTarget = pendingWriteMenuState.insertionTarget;
    const commandAnchorId = pendingWriteMenuState.commandAnchorId;
    const commandLineDoc = commandAnchorId
      ? insertWriteCommandLineInManuscriptDoc(baseManuscriptDoc, {
        anchorId: commandAnchorId,
        insertionTarget,
      })
      : baseManuscriptDoc;

    const result = await generateStorySegment({
      mode,
      storyText: promptStoryText,
      onChunk: (streamedText) => {
        const { nextManuscriptDoc } = applyGeneratedSegmentToDraft({
          baseManuscriptDoc: commandLineDoc,
          generatedText: streamedText,
          entryId,
          commandAnchorId,
          insertionTarget,
        });

        updateCurrentProject((projectState) => (
          updateSceneManuscriptDoc(projectState.storyStructure, targetSceneId, nextManuscriptDoc)
        ));
      },
    });

    if (result?.success) {
      const {
        nextManuscriptDoc,
        segmentRange,
      } = applyGeneratedSegmentToDraft({
        baseManuscriptDoc: commandLineDoc,
        generatedText: result.generatedSegmentText,
        entryId,
        commandAnchorId,
        insertionTarget,
      });
      const historyEntry = buildGenerationHistoryEntryFromResult({
        ...result,
        sceneId: targetSceneId,
        entryId,
        segmentRange: segmentRange || {
          startIndex: insertionOffset,
          endIndex: insertionOffset + result.generatedSegmentText.length,
        },
      }, 'generation');
      const nextSceneContent = updateSceneManuscriptDoc(storyStructure, targetSceneId, nextManuscriptDoc);

      updateCurrentProject((projectState) => ({
          ...nextSceneContent,
          lastGeneration: {
            historyEntryId: historyEntry.id,
            sceneId: targetSceneId,
            generationMode: result.generationMode,
            baseStoryText,
            baseManuscriptDoc,
            baseSceneText: baseStoryText,
            baseSceneDoc: baseManuscriptDoc,
            baseMemory: result.baseMemory,
            generatedText: result.generatedSegmentText,
            insertionOffset,
            insertionTarget,
            whatHappensNext: result.whatHappensNext,
            nextMainEvent: result.nextMainEvent,
            limitType: result.limitType,
            limitValue: result.limitValue,
            isApplied: true,
            createdAt: new Date().toISOString(),
          },
          generationHistory: [...(projectState.generationHistory || []), historyEntry],
      }));
      saveSnapshot({
        label: buildGenerationSnapshotLabel(result.generationMode),
        source: 'generation',
        contentOverride: {
          ...nextSceneContent,
          whatHappensNext: '',
        },
      });
    } else if (result && !result.requiresApiKey) {
      updateCurrentProject((projectState) => (
        updateSceneManuscriptDoc(projectState.storyStructure, targetSceneId, baseManuscriptDoc)
      ));
    }

    if (result?.requiresApiKey) {
      onRequireSettings();
    }
  };

  const handleRewriteSelectionApplied = ({
    sceneId = '',
    requestId = '',
    nextManuscriptDoc = null,
  } = {}) => {
    if (!pendingRewriteRequest || pendingRewriteRequest.requestId !== requestId || !nextManuscriptDoc) {
      return;
    }

    const targetSceneId = sceneId || pendingRewriteRequest.sceneId || activeSceneId;
    const segmentStart = pendingRewriteRequest.selectionPlainTextRange?.startIndex ?? 0;
    const historyEntry = buildGenerationHistoryEntryFromResult({
      sceneId: targetSceneId,
      entryId: requestId,
      generationMode: pendingRewriteRequest.generationMode,
      generatedSegmentText: pendingRewriteRequest.rewrittenText,
      selectedText: pendingRewriteRequest.selectedText,
      whatHappensNext: pendingRewriteRequest.rewriteInstruction,
      nextMainEvent: '',
      segmentRange: {
        startIndex: segmentStart,
        endIndex: segmentStart + pendingRewriteRequest.rewrittenText.length,
      },
    }, 'rewrite');
    const nextSceneContent = updateSceneManuscriptDoc(storyStructure, targetSceneId, nextManuscriptDoc);

    updateCurrentProject((projectState) => ({
        ...nextSceneContent,
        lastGeneration: {
          historyEntryId: historyEntry.id,
          sceneId: targetSceneId,
          generationMode: pendingRewriteRequest.generationMode,
          baseStoryText: pendingRewriteRequest.baseStoryText,
          baseManuscriptDoc: pendingRewriteRequest.baseManuscriptDoc,
          baseSceneText: pendingRewriteRequest.baseSceneText,
          baseSceneDoc: pendingRewriteRequest.baseSceneDoc,
          baseMemory: pendingRewriteRequest.baseMemory,
          generatedText: pendingRewriteRequest.rewrittenText,
          insertionOffset: null,
          insertionTarget: null,
          selectedText: pendingRewriteRequest.selectedText,
          selectionDocRange: pendingRewriteRequest.selectionDocRange,
          selectionPlainTextRange: pendingRewriteRequest.selectionPlainTextRange,
          rewriteInstruction: pendingRewriteRequest.rewriteInstruction,
          whatHappensNext: pendingRewriteRequest.rewriteInstruction,
          nextMainEvent: '',
          limitType: STORY_LIMIT_TYPES.NO_LIMIT,
          limitValue: null,
          isApplied: true,
          createdAt: new Date().toISOString(),
        },
        generationHistory: [...(projectState.generationHistory || []), historyEntry],
    }));
    saveSnapshot({
      label: buildGenerationSnapshotLabel(pendingRewriteRequest.generationMode),
      source: 'rewrite',
      contentOverride: {
        ...(nextSceneContent || {}),
        whatHappensNext: '',
      },
    });
    setPendingRewriteRequest(null);
  };

  const handleDeleteLatest = () => {
    if (!lastGeneration?.isApplied) {
      return;
    }

    const shouldDelete = window.confirm('Delete the latest AI-generated change and restore the draft to its pre-generation state?');
    if (!shouldDelete) {
      return;
    }

    saveSnapshot({
      label: 'Before deleting latest segment',
      source: 'delete-latest-backup',
    });

    setMemory(lastGeneration.baseMemory);
    setWhatHappensNext(lastGeneration.whatHappensNext);
    setNextMainEvent(lastGeneration.nextMainEvent);
    setCurrentProjectField('limitType', lastGeneration.limitType);
    setLimitValue(lastGeneration.limitValue);
    updateCurrentProject((projectState) => ({
      ...updateSceneManuscriptDoc(
        projectState.storyStructure,
        lastGeneration.sceneId || activeSceneId,
        lastGeneration.baseSceneDoc || lastGeneration.baseManuscriptDoc,
      ),
      generationHistory: (projectState.generationHistory || []).map((entry) => (
        entry.id === projectState.lastGeneration?.historyEntryId
          ? { ...entry, isApplied: false }
          : entry
      )),
      lastGeneration: projectState.lastGeneration
        ? {
            ...projectState.lastGeneration,
            isApplied: false,
          }
        : null,
    }));
    onToast('Latest AI change deleted');
  };

  const handleRegenerateLast = async () => {
    if (!lastGeneration || isRewriteMode(lastGeneration.generationMode)) {
      onToast('Regenerate Last is currently available only for generated story segments.');
      return;
    }

    const shouldRegenerate = window.confirm('Regenerate the latest AI-written segment using the same last-generation prompts?');
    if (!shouldRegenerate) {
      return;
    }

    saveSnapshot({
      label: 'Before regenerating latest segment',
      source: 'regenerate-backup',
    });

    const regenerationEntryId = createGenerationHistoryEntry({
      generationMode: lastGeneration.generationMode ?? STORY_GENERATION_MODES.CONTINUE,
      source: 'regeneration-preview',
    }).id;
    const regenerationCommandAnchorId = createGenerationHistoryEntry({
      generationMode: lastGeneration.generationMode ?? STORY_GENERATION_MODES.CONTINUE,
      source: 'regeneration-command-anchor',
    }).id;
    const targetSceneId = lastGeneration.sceneId || activeSceneId;
    const baseSceneText = lastGeneration.baseSceneText || lastGeneration.baseStoryText;
    const baseSceneDoc = lastGeneration.baseSceneDoc || lastGeneration.baseManuscriptDoc;
    const regenerationCommandLineDoc = insertWriteCommandLineInManuscriptDoc(baseSceneDoc, {
      anchorId: regenerationCommandAnchorId,
      insertionTarget: lastGeneration.insertionTarget,
    });

    const result = await generateStorySegment({
      mode: lastGeneration.generationMode ?? STORY_GENERATION_MODES.CONTINUE,
      storyText: (lastGeneration.generationMode ?? STORY_GENERATION_MODES.CONTINUE) === STORY_GENERATION_MODES.START
        ? ''
        : buildRecentScenePromptText(baseSceneText, lastGeneration.insertionOffset ?? baseSceneText.length),
      memory: lastGeneration.baseMemory,
      whatHappensNext: lastGeneration.whatHappensNext,
      nextMainEvent: lastGeneration.nextMainEvent,
      limitType: lastGeneration.limitType,
      limitValue: lastGeneration.limitValue,
      onChunk: (streamedText) => {
        const { nextManuscriptDoc } = applyGeneratedSegmentToDraft({
          baseManuscriptDoc: regenerationCommandLineDoc,
          generatedText: streamedText,
          entryId: regenerationEntryId,
          commandAnchorId: regenerationCommandAnchorId,
          insertionTarget: lastGeneration.insertionTarget,
        });

        updateCurrentProject((projectState) => (
          updateSceneManuscriptDoc(projectState.storyStructure, targetSceneId, nextManuscriptDoc)
        ));
      },
    });

    if (result?.success) {
      const {
        nextManuscriptDoc,
        segmentRange,
      } = applyGeneratedSegmentToDraft({
        baseManuscriptDoc: regenerationCommandLineDoc,
        generatedText: result.generatedSegmentText,
        entryId: regenerationEntryId,
        commandAnchorId: regenerationCommandAnchorId,
        insertionTarget: lastGeneration.insertionTarget,
      });
      const historyEntry = buildGenerationHistoryEntryFromResult({
        ...result,
        sceneId: targetSceneId,
        entryId: regenerationEntryId,
        segmentRange: segmentRange || {
          startIndex: lastGeneration.insertionOffset ?? 0,
          endIndex: (lastGeneration.insertionOffset ?? 0) + result.generatedSegmentText.length,
        },
      }, 'regeneration');
      const nextSceneContent = updateSceneManuscriptDoc(storyStructure, targetSceneId, nextManuscriptDoc);

      updateCurrentProject((projectState) => ({
          ...nextSceneContent,
          generationHistory: (projectState.generationHistory || []).map((entry) => (
            entry.id === lastGeneration.historyEntryId
              ? { ...entry, isApplied: false }
              : entry
          )).concat(historyEntry),
          lastGeneration: {
            historyEntryId: historyEntry.id,
            sceneId: targetSceneId,
            generationMode: result.generationMode,
            baseStoryText: lastGeneration.baseStoryText,
            baseManuscriptDoc: lastGeneration.baseManuscriptDoc,
            baseSceneText,
            baseSceneDoc,
            baseMemory: result.baseMemory,
            generatedText: result.generatedSegmentText,
            insertionOffset: lastGeneration.insertionOffset ?? null,
            insertionTarget: lastGeneration.insertionTarget ?? null,
            whatHappensNext: result.whatHappensNext,
            nextMainEvent: result.nextMainEvent,
            limitType: result.limitType,
            limitValue: result.limitValue,
            isApplied: true,
            createdAt: new Date().toISOString(),
          },
      }));
      setMemory(result.baseMemory);
      setWhatHappensNext(result.whatHappensNext);
      setNextMainEvent(result.nextMainEvent);
      setCurrentProjectField('limitType', result.limitType);
      setLimitValue(result.limitValue);
      saveSnapshot({
        label: buildGenerationSnapshotLabel(result.generationMode, true),
        source: 'regeneration',
        contentOverride: {
          ...(nextSceneContent || {}),
          whatHappensNext: '',
        },
      });
    }

    if (result?.requiresApiKey) {
      onRequireSettings();
    }
  };

  const handleManualMemorySync = async () => {
    const result = await rebuildMemoryFromStory();
    if (result?.requiresApiKey) {
      onRequireSettings();
    }
  };

  const handleLimitTypeChange = (nextLimitType) => {
    setCurrentProjectField('limitType', nextLimitType);

    if (nextLimitType === STORY_LIMIT_TYPES.WORDS) {
      setLimitValue(DEFAULT_WORD_LIMIT);
      return;
    }

    if (nextLimitType === STORY_LIMIT_TYPES.PARAGRAPHS) {
      setLimitValue(DEFAULT_PARAGRAPH_LIMIT);
      return;
    }

    setLimitValue(null);
  };

  return {
    writeMenuState,
    activeWriteCommand,
    pendingRewriteRequest,
    canRegenerateLast: Boolean(lastGeneration && !isRewriteMode(lastGeneration.generationMode)),
    setActiveWriteCommand,
    handleOpenWriteMenu,
    handleCloseWriteMenu,
    handleRunWriteCommand,
    handleRewriteSelectionApplied,
    handleDeleteLatest,
    handleRegenerateLast,
    handleManualMemorySync,
    handleLimitTypeChange,
  };
}
