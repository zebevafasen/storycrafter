import { buildStoryExport, downloadTextFile } from '../utils/storyExport';

export default function useWorkspaceActions({
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
  onToast,
  onCloseProjects,
}) {
  const handleClearStory = () => {
    if (window.confirm('Are you sure you want to clear your current story? This action is irreversible.')) {
      saveSnapshot({
        label: 'Before clearing story',
        source: 'clear-backup',
      });
      setStoryText('');
      setMemory('');
      setWhatHappensNext('');
      setNextMainEvent('');
      onToast('Story cleared');
    }
  };

  const handleCopyToClipboard = async () => {
    if (!storyText.trim()) {
      onToast('The story is empty.');
      return;
    }

    try {
      await navigator.clipboard.writeText(storyText);
      onToast('Copied story to clipboard');
    } catch (error) {
      console.error('Copy failed:', error);
      onToast('Copy failed. Please try again.');
    }
  };

  const handleExport = (format) => {
    if (!storyText.trim()) {
      onToast('Nothing to export.');
      return;
    }

    const { filename, outputText } = buildStoryExport({
      format,
      genres,
      themes,
      tags: customTags,
      characters,
      premise,
      memory,
      storyText,
    });

    downloadTextFile(filename, outputText);
    onToast(`Exported as ${format.toUpperCase()}`);
  };

  const handleCreateProject = (name) => {
    createNewProject(name);
    onCloseProjects();
    onToast(`Created project: ${name}`);
  };

  const handleRenameProject = (projectId, name) => {
    renameProject(projectId, name);
    onToast('Project renamed');
  };

  const handleDuplicateProject = (projectId) => {
    duplicateProjectById(projectId);
    onToast('Project duplicated');
  };

  const handleDeleteProject = (projectId) => {
    const deleted = deleteProject(projectId);
    if (deleted) {
      onToast('Project deleted');
    }
  };

  const handleSaveSnapshot = (label) => {
    saveSnapshot({ label, source: 'manual' });
    onToast('Snapshot saved');
  };

  const handleRestoreSnapshot = (snapshotId) => {
    const restored = restoreSnapshot(currentProjectId, snapshotId);
    if (restored) {
      onToast('Snapshot restored');
      onCloseProjects();
    }
  };

  return {
    handleClearStory,
    handleCopyToClipboard,
    handleExport,
    handleCreateProject,
    handleRenameProject,
    handleDuplicateProject,
    handleDeleteProject,
    handleSaveSnapshot,
    handleRestoreSnapshot,
  };
}
