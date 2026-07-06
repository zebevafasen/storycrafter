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
  AVAILABLE_MODELS,
  fetchOpenRouterModels,
} from './services/openrouter';

const DEFAULT_CONFIG = {
  apiKey: '',
  model: 'deepseek/deepseek-chat',
  temperature: 0.7,
};

export default function App() {
  const [config, setConfig] = usePersistentState('storycrafter_config', DEFAULT_CONFIG);
  const {
    projects,
    currentProject,
    currentProjectId,
    setCurrentProjectField,
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
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [modelsList, setModelsList] = useState(AVAILABLE_MODELS);

  const triggerToast = (message) => {
    setToastMessage(message);
  };

  const {
    project,
    storyText,
    genres,
    themes,
    customTags,
    characters,
    premise,
    memory,
    whatHappensNext,
    nextMainEvent,
    limitType,
    limitValue,
    setStoryText,
    setGenres,
    setThemes,
    setCustomTags,
    setCharacters,
    setPremise,
    setMemory,
    setWhatHappensNext,
    setNextMainEvent,
    setLimitValue,
  } = useProjectContent(currentProject, setCurrentProjectField);

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
    setStoryText,
    setMemory,
    setWhatHappensNext,
    onToast: triggerToast,
  });

  const {
    isPremiseGenerating,
    handleRandomizeGenres,
    handleRandomizeThemes,
    handleRandomizeCustomTags,
    handleGeneratePremise,
    handleAddCharacter,
    handleCharacterChange,
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

  const handleGenerate = async () => {
    const result = await generateStorySegment();
    if (result?.success) {
      saveSnapshot({
        label: 'Generated segment',
        source: 'generation',
        contentOverride: {
          storyText: result.finalStoryText,
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
          isGenerating={isGenerating}
          onStoryTextChange={setStoryText}
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
          isGenerating={isGenerating}
          limitType={limitType}
          limitValue={limitValue}
          whatHappensNext={whatHappensNext}
          nextMainEvent={nextMainEvent}
          onWhatHappensNextChange={setWhatHappensNext}
          onNextMainEventChange={setNextMainEvent}
          onLimitTypeChange={handleLimitTypeChange}
          onLimitValueChange={setLimitValue}
          onGenerate={handleGenerate}
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

      {toastMessage && (
        <div className="toast">
          <ChevronRight size={14} style={{ color: 'var(--accent)' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
