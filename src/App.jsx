import { Suspense, lazy, useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { STORAGE_KEYS } from './config/storageKeys';
import AppHeader from './components/AppHeader';
import BottomControls from './components/BottomControls';
import StoryMemoryDrawer from './components/StoryMemoryDrawer';
import StorySetupSidebar from './components/StorySetupSidebar';
import useGenerationWorkflow from './hooks/useGenerationWorkflow';
import usePersistentState from './hooks/usePersistentState';
import useProjectContent from './hooks/useProjectContent';
import useProjectManager from './hooks/useProjectManager';
import useStorySetupActions from './hooks/useStorySetupActions';
import useStoryGenerator from './hooks/useStoryGenerator';
import useWorkspaceActions from './hooks/useWorkspaceActions';
import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  fetchOpenRouterModels,
} from './services/openrouter';

const DEFAULT_CONFIG = {
  apiKey: '',
  model: DEFAULT_MODEL,
  temperature: 0.7,
};

const ProjectsModal = lazy(() => import('./components/ProjectsModal'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const StoryCanvas = lazy(() => import('./components/StoryCanvas'));

function StoryCanvasFallback() {
  return (
    <div className="story-canvas-container">
      <div className="story-textarea-shell rich-editor-shell">
        <div className="canvas-status">
          <span>Loading editor...</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [config, setConfig] = usePersistentState(STORAGE_KEYS.config, DEFAULT_CONFIG);
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
  const [toastMessage, setToastMessage] = useState('');
  const [modelsList, setModelsList] = useState(AVAILABLE_MODELS);

  const triggerToast = (message) => {
    setToastMessage(message);
  };

  const {
    project,
    storyText,
    manuscriptDoc,
    storyStructure,
    activeScene,
    activeSceneId,
    activeSceneText,
    visibleSceneEntries,
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
    setSceneManuscriptDoc,
    setActiveSceneId,
    setViewScope,
    addAct,
    addChapter,
    addScene,
    renameStructureNode,
    reorderStructureNode,
    moveChapterToAct,
    moveSceneToChapter,
    moveStructureNode,
    deleteStructureNode,
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
    rewriteStorySelection,
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
    storyStructure,
    setMemory,
    setWhatHappensNext,
    setNextMainEvent,
    onToast: triggerToast,
    onCloseProjects: () => setIsProjectsOpen(false),
  });

  const {
    writeMenuState,
    activeWriteCommand,
    pendingRewriteRequest,
    canRegenerateLast,
    setActiveWriteCommand,
    handleOpenWriteMenu,
    handleCloseWriteMenu,
    handleRunWriteCommand,
    handleRewriteSelectionApplied,
    handleDeleteLatest,
    handleRegenerateLast,
    handleManualMemorySync,
    handleLimitTypeChange,
  } = useGenerationWorkflow({
    storyText: activeSceneText,
    manuscriptDoc: activeScene?.manuscriptDoc || manuscriptDoc,
    storyStructure,
    fullStoryText: storyText,
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
    onToast: triggerToast,
    onRequireSettings: () => setIsSettingsOpen(true),
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

  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    triggerToast('Settings updated');
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
        onExportCurrentText={() => handleExport('txt', { currentScopeOnly: true })}
        onExportCurrentMarkdown={() => handleExport('markdown', { currentScopeOnly: true })}
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
        storyStructure={storyStructure}
        activeSceneId={activeSceneId}
        visibleScope={storyStructure.viewScope}
        onViewScopeChange={setViewScope}
        onActiveSceneChange={setActiveSceneId}
        onAddAct={addAct}
        onAddChapter={addChapter}
        onAddScene={addScene}
        onRenameStructureNode={renameStructureNode}
        onReorderStructureNode={reorderStructureNode}
        onMoveChapterToAct={moveChapterToAct}
        onMoveSceneToChapter={moveSceneToChapter}
        onMoveStructureNode={moveStructureNode}
        onDeleteStructureNode={deleteStructureNode}
      />

      <main className="center-workspace">
        <Suspense fallback={<StoryCanvasFallback />}>
          <StoryCanvas
            storyStructure={storyStructure}
            visibleSceneEntries={visibleSceneEntries}
            activeSceneId={activeSceneId}
            isGenerating={isGenerating}
            generationHistory={generationHistory}
            lastGeneration={lastGeneration}
            onSceneManuscriptDocChange={setSceneManuscriptDoc}
            onActiveSceneChange={setActiveSceneId}
            onViewScopeChange={setViewScope}
            onAddScene={addScene}
            onOpenWriteCommands={handleOpenWriteMenu}
            rewriteSelectionRequest={pendingRewriteRequest}
            onRewriteSelectionApplied={handleRewriteSelectionApplied}
            onRegenerateLast={handleRegenerateLast}
            onDeleteLatest={handleDeleteLatest}
          />
        </Suspense>

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
          storyText={activeSceneText}
          isGenerating={isGenerating}
          isWriteMenuOpen={writeMenuState.isOpen}
          activeCommand={activeWriteCommand}
          writeMenuIntent={writeMenuState.intent}
          writeMenuSource={writeMenuState.source}
          writeMenuAnchorRect={writeMenuState.anchorRect}
          writeMenuSelection={writeMenuState.selection}
          selectedText={writeMenuState.selectedText}
          canRegenerateLast={canRegenerateLast}
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

      <Suspense fallback={null}>
        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            config={config}
            onSave={handleSaveConfig}
            modelsList={modelsList}
          />
        )}

        {isProjectsOpen && (
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
        )}
      </Suspense>

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
