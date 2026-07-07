import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import AppHeader from './components/AppHeader';
import BottomControls from './components/BottomControls';
import ProjectsModal from './components/ProjectsModal';
import SettingsModal from './components/SettingsModal';
import StoryCanvas from './components/StoryCanvas';
import StoryMemoryDrawer from './components/StoryMemoryDrawer';
import StorySetupSidebar from './components/StorySetupSidebar';
import usePersistentState from './hooks/usePersistentState';
import useProjectContent from './hooks/useProjectContent';
import useProjectManager from './hooks/useProjectManager';
import useStorySetupActions from './hooks/useStorySetupActions';
import useStoryGenerator from './hooks/useStoryGenerator';
import useWorkspaceActions from './hooks/useWorkspaceActions';
import {
  insertWriteCommandLineInManuscriptDoc,
  getGeneratedSegmentRangeFromManuscriptDoc,
  insertGeneratedSegmentInManuscriptDoc,
  manuscriptDocToPlainText,
  removeWriteCommandLineFromManuscriptDoc,
} from './utils/manuscriptDocument';
import {
  AVAILABLE_MODELS,
  fetchOpenRouterModels,
} from './services/openrouter';
import { createGenerationHistoryEntry } from './utils/projectState';
import {
  getDefaultStoryGenerationMode,
  isStoryGenerationModeAvailable,
  STORY_GENERATION_MODES,
} from './utils/storyGeneration';

const DEFAULT_CONFIG = {
  apiKey: '',
  model: 'deepseek/deepseek-chat',
  temperature: 0.7,
};

const DEFAULT_WRITE_MENU_STATE = {
  isOpen: false,
  source: 'dock',
  anchorRect: null,
  selection: null,
  insertionTarget: null,
  plainTextOffset: null,
  commandAnchorId: '',
  baseStoryText: '',
  baseManuscriptDoc: null,
};

function buildGenerationSnapshotLabel(mode, isRegeneration = false) {
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

export default function App() {
  const [config, setConfig] = usePersistentState('storycrafter_config', DEFAULT_CONFIG);
  const {
    projects,
    currentProject,
    currentProjectId,
    setCurrentProjectField,
    updateCurrentProject,
    createNewProject,
    switchProject,
    renameProject,
    duplicateProjectById,
    deleteProject,
    saveSnapshot,
    restoreSnapshot,
  } = useProjectManager();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 768;
  });
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [writeMenuState, setWriteMenuState] = useState(DEFAULT_WRITE_MENU_STATE);
  const [activeWriteCommand, setActiveWriteCommand] = useState(STORY_GENERATION_MODES.START);
  const [toastMessage, setToastMessage] = useState('');
  const [modelsList, setModelsList] = useState(AVAILABLE_MODELS);

  const triggerToast = (message) => {
    setToastMessage(message);
  };

  const {
    project,
    storyText,
    manuscriptDoc,
    genres,
    themes,
    customTags,
    characters,
    premise,
    memory,
    lastGeneration,
    generationHistory,
    whatHappensNext,
    nextMainEvent,
    limitType,
    limitValue,
    setStoryText,
    setManuscriptDoc,
    setGenres,
    setThemes,
    setCustomTags,
    setCharacters,
    setPremise,
    setMemory,
    setWhatHappensNext,
    setNextMainEvent,
    setLimitValue,
  } = useProjectContent(currentProject, setCurrentProjectField, updateCurrentProject);

  const {
    isGenerating,
    isMemoryUpdating,
    generateStorySegment,
    rebuildMemoryFromStory,
  } = useStoryGenerator({
    config,
    genres,
    themes,
    tags: customTags,
    characters,
    premise,
    memory,
    storyText,
    whatHappensNext,
    nextMainEvent,
    limitType,
    limitValue,
    setMemory,
    setWhatHappensNext,
    onToast: triggerToast,
  });

  const {
    isPremiseGenerating,
    generatingCharacterId,
    handleRandomizeGenres,
    handleRandomizeThemes,
    handleRandomizeCustomTags,
    handleGeneratePremise,
    handleAddCharacter,
    handleCharacterChange,
    handleGenerateCharacterDescription,
    handleCharacterRemove,
  } = useStorySetupActions({
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
    onToast: triggerToast,
    onRequireSettings: () => setIsSettingsOpen(true),
  });

  const {
    handleClearStory,
    handleCopyToClipboard,
    handleExport,
    handleCreateProject,
    handleRenameProject,
    handleDuplicateProject,
    handleDeleteProject,
    handleSaveSnapshot,
    handleRestoreSnapshot,
  } = useWorkspaceActions({
    currentProjectId,
    updateCurrentProject,
    createNewProject,
    renameProject,
    duplicateProjectById,
    deleteProject,
    saveSnapshot,
    restoreSnapshot,
    storyText,
    genres,
    themes,
    customTags,
    characters,
    premise,
    memory,
    setStoryText,
    setMemory,
    setWhatHappensNext,
    setNextMainEvent,
    onToast: triggerToast,
    onCloseProjects: () => setIsProjectsOpen(false),
  });

  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      const liveModels = await fetchOpenRouterModels();
      if (liveModels && liveModels.length > 0 && isMounted) {
        setModelsList(liveModels);
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timer = setTimeout(() => setToastMessage(''), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

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

  const handleOpenWriteMenu = (preferredMode = null, options = {}) => {
    const {
      anchorRect = null,
      selection = null,
      insertionTarget = null,
      plainTextOffset = null,
      source = 'dock',
    } = options && typeof options === 'object' ? options : {};

    const commandAnchorId = source === 'editor' && insertionTarget
      ? createGenerationHistoryEntry({
        generationMode: resolveWriteCommand(preferredMode),
        source: 'command-anchor',
      }).id
      : '';

    if (commandAnchorId) {
      setManuscriptDoc((currentDoc) => insertWriteCommandLineInManuscriptDoc(currentDoc, {
        anchorId: commandAnchorId,
        insertionTarget,
      }));
    }

    setActiveWriteCommand(resolveWriteCommand(preferredMode));
    setWriteMenuState({
      isOpen: true,
      source,
      anchorRect,
      selection,
      insertionTarget,
      plainTextOffset: typeof plainTextOffset === 'number' ? plainTextOffset : null,
      commandAnchorId,
      baseStoryText: storyText,
      baseManuscriptDoc: manuscriptDoc,
    });
  };

  const handleCloseWriteMenu = ({ restoreCommandLine = true } = {}) => {
    if (restoreCommandLine && writeMenuState.commandAnchorId) {
      setManuscriptDoc(writeMenuState.baseManuscriptDoc || removeWriteCommandLineFromManuscriptDoc(manuscriptDoc, writeMenuState.commandAnchorId));
    }

    setWriteMenuState(() => ({
      ...DEFAULT_WRITE_MENU_STATE,
    }));
  };

  const buildGenerationHistoryEntryFromResult = (result, source = 'generation') => {
    const range = result.segmentRange || {
      startIndex: 0,
      endIndex: result.generatedSegmentText.length,
    };

    return createGenerationHistoryEntry({
      id: result.entryId,
      generationMode: result.generationMode,
      source,
      generatedText: result.generatedSegmentText,
      startIndex: range.startIndex,
      endIndex: range.endIndex,
      whatHappensNext: result.whatHappensNext,
      nextMainEvent: result.nextMainEvent,
      createdAt: new Date().toISOString(),
      isApplied: true,
    });
  };

  const applyGeneratedSegmentToDraft = ({
    baseManuscriptDoc,
    generatedText,
    entryId,
    commandAnchorId = '',
    insertionTarget = null,
  }) => {
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
  };

  const handleRunWriteCommand = async (mode) => {
    const pendingWriteMenuState = writeMenuState;
    handleCloseWriteMenu({ restoreCommandLine: false });

    if (mode === STORY_GENERATION_MODES.START && storyText.trim()) {
      triggerToast('Start Writing is only available when the manuscript is empty.');
      return;
    }

    if (mode === STORY_GENERATION_MODES.CONTINUE && !storyText.trim()) {
      triggerToast('There is no manuscript yet. Use Start Writing first.');
      return;
    }

    if (mode === STORY_GENERATION_MODES.CONTINUE_TOWARD_GOAL) {
      if (!storyText.trim()) {
        triggerToast('Write an opening segment before steering toward a goal.');
        return;
      }

      if (!nextMainEvent.trim()) {
        triggerToast('Add a next main event or goal before using Write Toward Goal.');
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
    const promptStoryText = mode === STORY_GENERATION_MODES.START
      ? ''
      : (pendingWriteMenuState.baseStoryText || storyText).slice(0, insertionOffset);
    const baseStoryText = pendingWriteMenuState.baseStoryText || storyText;
    const baseManuscriptDoc = pendingWriteMenuState.baseManuscriptDoc || manuscriptDoc;
    const insertionTarget = pendingWriteMenuState.insertionTarget;
    const commandAnchorId = pendingWriteMenuState.commandAnchorId;
    const commandLineDoc = commandAnchorId
      ? insertWriteCommandLineInManuscriptDoc(baseManuscriptDoc, {
        anchorId: commandAnchorId,
        insertionTarget,
      })
      : manuscriptDoc;

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

        setManuscriptDoc(nextManuscriptDoc);
      },
    });

    if (result?.success) {
      const {
        nextManuscriptDoc,
        nextStoryText,
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
        entryId,
        segmentRange: segmentRange || {
          startIndex: insertionOffset,
          endIndex: insertionOffset + result.generatedSegmentText.length,
        },
      }, 'generation');

      updateCurrentProject((projectState) => ({
        storyText: nextStoryText,
        manuscriptDoc: nextManuscriptDoc,
        lastGeneration: {
          historyEntryId: historyEntry.id,
          generationMode: result.generationMode,
          baseStoryText,
          baseManuscriptDoc,
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
          storyText: nextStoryText,
          manuscriptDoc: nextManuscriptDoc,
          whatHappensNext: '',
        },
      });
    } else if (result && !result.requiresApiKey) {
      setManuscriptDoc(baseManuscriptDoc);
    }

    if (result?.requiresApiKey) {
      setIsSettingsOpen(true);
    }
  };

  const handleDeleteLatest = () => {
    if (!lastGeneration?.isApplied) {
      return;
    }

    const shouldDelete = window.confirm('Delete the latest AI-generated segment and restore the story to its pre-generation state?');
    if (!shouldDelete) {
      return;
    }

    saveSnapshot({
      label: 'Before deleting latest segment',
      source: 'delete-latest-backup',
    });

    setStoryText(lastGeneration.baseStoryText);
    setManuscriptDoc(lastGeneration.baseManuscriptDoc);
    setMemory(lastGeneration.baseMemory);
    setWhatHappensNext(lastGeneration.whatHappensNext);
    setNextMainEvent(lastGeneration.nextMainEvent);
    setCurrentProjectField('limitType', lastGeneration.limitType);
    setLimitValue(lastGeneration.limitValue);
    updateCurrentProject((projectState) => ({
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
    triggerToast('Latest generated segment deleted');
  };

  const handleRegenerateLast = async () => {
    if (!lastGeneration) {
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
    const regenerationCommandLineDoc = insertWriteCommandLineInManuscriptDoc(lastGeneration.baseManuscriptDoc, {
      anchorId: regenerationCommandAnchorId,
      insertionTarget: lastGeneration.insertionTarget,
    });

    const result = await generateStorySegment({
      mode: lastGeneration.generationMode ?? STORY_GENERATION_MODES.CONTINUE,
      storyText: (lastGeneration.generationMode ?? STORY_GENERATION_MODES.CONTINUE) === STORY_GENERATION_MODES.START
        ? ''
        : lastGeneration.baseStoryText.slice(0, lastGeneration.insertionOffset ?? lastGeneration.baseStoryText.length),
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

        setManuscriptDoc(nextManuscriptDoc);
      },
    });

    if (result?.success) {
      const {
        nextManuscriptDoc,
        nextStoryText,
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
        entryId: regenerationEntryId,
        segmentRange: segmentRange || {
          startIndex: lastGeneration.insertionOffset ?? 0,
          endIndex: (lastGeneration.insertionOffset ?? 0) + result.generatedSegmentText.length,
        },
      }, 'regeneration');

      updateCurrentProject((projectState) => ({
        generationHistory: (projectState.generationHistory || []).map((entry) => (
          entry.id === lastGeneration.historyEntryId
            ? { ...entry, isApplied: false }
            : entry
        )).concat(historyEntry),
        storyText: nextStoryText,
        manuscriptDoc: nextManuscriptDoc,
        lastGeneration: {
          historyEntryId: historyEntry.id,
          generationMode: result.generationMode,
          baseStoryText: lastGeneration.baseStoryText,
          baseManuscriptDoc: lastGeneration.baseManuscriptDoc,
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
          storyText: nextStoryText,
          manuscriptDoc: nextManuscriptDoc,
          whatHappensNext: '',
        },
      });
    }

    if (result?.requiresApiKey) {
      setIsSettingsOpen(true);
    }
  };

  const handleManualMemorySync = async () => {
    const result = await rebuildMemoryFromStory();
    if (result?.requiresApiKey) {
      setIsSettingsOpen(true);
    }
  };

  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    triggerToast('Settings updated');
  };

  const handleLimitTypeChange = (nextLimitType) => {
    setCurrentProjectField('limitType', nextLimitType);

    if (nextLimitType === 'words') {
      setLimitValue(250);
      return;
    }

    if (nextLimitType === 'paragraphs') {
      setLimitValue(3);
      return;
    }

    setLimitValue(null);
  };

  const selectedModelName = modelsList.find((model) => model.id === config.model)?.name || config.model;

  return (
    <div className="app-container">
      <AppHeader
        isLeftPanelOpen={isLeftPanelOpen}
        isMemoryOpen={isMemoryOpen}
        hasApiKey={Boolean(config.apiKey)}
        currentProjectName={project.name}
        selectedModelName={selectedModelName}
        hasStoryText={Boolean(storyText.trim())}
        isGenerating={isGenerating}
        onToggleLeftPanel={() => setIsLeftPanelOpen((isOpen) => !isOpen)}
        onToggleMemory={() => setIsMemoryOpen((isOpen) => !isOpen)}
        onOpenProjects={() => setIsProjectsOpen(true)}
        onCopyStory={handleCopyToClipboard}
        onExportText={() => handleExport('txt')}
        onExportMarkdown={() => handleExport('markdown')}
        onClearStory={handleClearStory}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <StorySetupSidebar
        isOpen={isLeftPanelOpen}
        isGenerating={isGenerating}
        isPremiseGenerating={isPremiseGenerating}
        generatingCharacterId={generatingCharacterId}
        genres={genres}
        themes={themes}
        customTags={customTags}
        characters={characters}
        premise={premise}
        onGenresChange={setGenres}
        onThemesChange={setThemes}
        onCustomTagsChange={setCustomTags}
        onAddCharacter={handleAddCharacter}
        onCharacterChange={handleCharacterChange}
        onCharacterGenerateDescription={handleGenerateCharacterDescription}
        onCharacterRemove={handleCharacterRemove}
        onPremiseChange={setPremise}
        onRandomizeGenres={handleRandomizeGenres}
        onRandomizeThemes={handleRandomizeThemes}
        onRandomizeCustomTags={handleRandomizeCustomTags}
        onGeneratePremise={handleGeneratePremise}
      />

      <main className="center-workspace">
        <StoryCanvas
          storyText={storyText}
          manuscriptDoc={manuscriptDoc}
          isGenerating={isGenerating}
          generationHistory={generationHistory}
          lastGeneration={lastGeneration}
          onManuscriptDocChange={setManuscriptDoc}
          onOpenWriteCommands={handleOpenWriteMenu}
          onRegenerateLast={handleRegenerateLast}
          onDeleteLatest={handleDeleteLatest}
        />

        <StoryMemoryDrawer
          isOpen={isMemoryOpen}
          memory={memory}
          isGenerating={isGenerating}
          isMemoryUpdating={isMemoryUpdating}
          onClose={() => setIsMemoryOpen(false)}
          onMemoryChange={setMemory}
          onRebuildMemory={handleManualMemorySync}
        />

        <BottomControls
          storyText={storyText}
          isGenerating={isGenerating}
          isWriteMenuOpen={writeMenuState.isOpen}
          activeCommand={activeWriteCommand}
          writeMenuSource={writeMenuState.source}
          writeMenuAnchorRect={writeMenuState.anchorRect}
          writeMenuSelection={writeMenuState.selection}
          canRegenerateLast={Boolean(lastGeneration)}
          canDeleteLatest={Boolean(lastGeneration?.isApplied)}
          limitType={limitType}
          limitValue={limitValue}
          whatHappensNext={whatHappensNext}
          nextMainEvent={nextMainEvent}
          onWhatHappensNextChange={setWhatHappensNext}
          onNextMainEventChange={setNextMainEvent}
          onLimitTypeChange={handleLimitTypeChange}
          onLimitValueChange={setLimitValue}
          onOpenWriteMenu={handleOpenWriteMenu}
          onCloseWriteMenu={handleCloseWriteMenu}
          onActiveCommandChange={setActiveWriteCommand}
          onRegenerateLast={handleRegenerateLast}
          onDeleteLatest={handleDeleteLatest}
          onGenerate={handleRunWriteCommand}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={handleSaveConfig}
        modelsList={modelsList}
      />

      <ProjectsModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        projects={projects}
        currentProjectId={currentProjectId}
        onSwitchProject={switchProject}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onDuplicateProject={handleDuplicateProject}
        onDeleteProject={handleDeleteProject}
        onSaveSnapshot={handleSaveSnapshot}
        onRestoreSnapshot={handleRestoreSnapshot}
      />

      {/* Mobile backdrop for sidebar & memory drawer */}
      {(isLeftPanelOpen || isMemoryOpen) && (
        <div
          className="mobile-backdrop"
          onClick={() => {
            setIsLeftPanelOpen(false);
            setIsMemoryOpen(false);
          }}
        />
      )}

      {toastMessage && (
        <div className="toast">
          <ChevronRight size={14} style={{ color: 'var(--accent)' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
