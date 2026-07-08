import { plainTextToManuscriptDoc, manuscriptDocToPlainText } from '../utils/manuscriptDocument';
import { PROJECT_CONTENT_DEFAULTS } from '../utils/projectState';
import {
  addAct,
  addChapter,
  addScene,
  deleteStructureNode,
  getScenePlainText,
  getVisibleSceneEntries,
  moveChapterToAct,
  moveSceneToChapter,
  moveStructureNode,
  renameStructureNode,
  reorderStructureNode,
  setActiveScene,
  setViewScope,
  updateSceneManuscriptDoc,
} from '../utils/storyStructure';

export default function useProjectContent(currentProject, setCurrentProjectField, updateCurrentProject) {
  const project = currentProject || {
    id: null,
    name: 'Untitled Project',
    ...PROJECT_CONTENT_DEFAULTS,
    snapshots: [],
  };

  const bindField = (field) => (value) => setCurrentProjectField(field, value);
  const storyStructure = project.storyStructure;
  const activeScene = storyStructure.scenesById[storyStructure.activeSceneId]
    || Object.values(storyStructure.scenesById)[0];
  const activeSceneId = activeScene?.id || storyStructure.activeSceneId;
  const activeSceneText = activeScene ? manuscriptDocToPlainText(activeScene.manuscriptDoc) : '';
  const visibleSceneEntries = getVisibleSceneEntries(storyStructure);

  const updateStoryStructure = (updater) => {
    updateCurrentProject((currentValue) => {
      const nextContent = typeof updater === 'function'
        ? updater(currentValue.storyStructure)
        : updater;

      return nextContent;
    });
  };

  const setStoryText = (value) => {
    updateCurrentProject((currentValue) => {
      const currentSceneId = currentValue.storyStructure.activeSceneId;
      const currentSceneText = getScenePlainText(currentValue.storyStructure, currentSceneId);
      const nextStoryText = typeof value === 'function' ? value(currentSceneText) : value;

      return updateSceneManuscriptDoc(
        currentValue.storyStructure,
        currentSceneId,
        plainTextToManuscriptDoc(nextStoryText),
      );
    });
  };

  const setSceneManuscriptDoc = (sceneId, value) => {
    updateCurrentProject((currentValue) => {
      const currentScene = currentValue.storyStructure.scenesById[sceneId];
      const nextManuscriptDoc = typeof value === 'function'
        ? value(currentScene?.manuscriptDoc)
        : value;

      return updateSceneManuscriptDoc(currentValue.storyStructure, sceneId, nextManuscriptDoc);
    });
  };
  const setManuscriptDoc = (value) => setSceneManuscriptDoc(activeSceneId, value);
  const setActiveSceneId = (sceneId) => updateStoryStructure((currentStructure) => (
    setActiveScene(currentStructure, sceneId)
  ));
  const setViewScopeValue = (viewScope) => updateStoryStructure((currentStructure) => (
    setViewScope(currentStructure, viewScope)
  ));
  const handleAddAct = () => updateStoryStructure((currentStructure) => addAct(currentStructure));
  const handleAddChapter = (actId) => updateStoryStructure((currentStructure) => addChapter(currentStructure, actId));
  const handleAddScene = (chapterId) => updateStoryStructure((currentStructure) => (
    addScene(currentStructure, chapterId, {
      openInSceneView: currentStructure.viewScope?.type === 'scene',
    })
  ));
  const handleRenameStructureNode = (nodeType, nodeId, title) => updateStoryStructure((currentStructure) => (
    renameStructureNode(currentStructure, nodeType, nodeId, title)
  ));
  const handleReorderStructureNode = (nodeType, nodeId, direction) => updateStoryStructure((currentStructure) => (
    reorderStructureNode(currentStructure, nodeType, nodeId, direction)
  ));
  const handleMoveChapterToAct = (chapterId, actId) => updateStoryStructure((currentStructure) => (
    moveChapterToAct(currentStructure, chapterId, actId)
  ));
  const handleMoveSceneToChapter = (sceneId, chapterId) => updateStoryStructure((currentStructure) => (
    moveSceneToChapter(currentStructure, sceneId, chapterId)
  ));
  const handleMoveStructureNode = (options) => updateStoryStructure((currentStructure) => (
    moveStructureNode(currentStructure, options)
  ));
  const handleDeleteStructureNode = (nodeType, nodeId) => updateStoryStructure((currentStructure) => (
    deleteStructureNode(currentStructure, nodeType, nodeId)
  ));

  return {
    project,
    storyText: project.storyText,
    manuscriptDoc: project.manuscriptDoc,
    storyStructure,
    activeScene,
    activeSceneId,
    activeSceneText,
    visibleSceneEntries,
    genres: project.genres,
    themes: project.themes,
    customTags: project.customTags,
    characters: project.characters,
    premise: project.premise,
    memory: project.memory,
    lastGeneration: project.lastGeneration,
    generationHistory: project.generationHistory || [],
    whatHappensNext: project.whatHappensNext,
    nextMainEvent: project.nextMainEvent,
    limitType: project.limitType,
    limitValue: project.limitValue,
    setStoryText,
    setManuscriptDoc,
    setSceneManuscriptDoc,
    setActiveSceneId,
    setViewScope: setViewScopeValue,
    addAct: handleAddAct,
    addChapter: handleAddChapter,
    addScene: handleAddScene,
    renameStructureNode: handleRenameStructureNode,
    reorderStructureNode: handleReorderStructureNode,
    moveChapterToAct: handleMoveChapterToAct,
    moveSceneToChapter: handleMoveSceneToChapter,
    moveStructureNode: handleMoveStructureNode,
    deleteStructureNode: handleDeleteStructureNode,
    setGenres: bindField('genres'),
    setThemes: bindField('themes'),
    setCustomTags: bindField('customTags'),
    setCharacters: bindField('characters'),
    setPremise: bindField('premise'),
    setMemory: bindField('memory'),
    setWhatHappensNext: bindField('whatHappensNext'),
    setNextMainEvent: bindField('nextMainEvent'),
    setLimitValue: bindField('limitValue'),
  };
}
