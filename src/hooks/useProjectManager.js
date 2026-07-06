import usePersistentState from './usePersistentState';
import {
  applyProjectContent,
  attachSnapshot,
  createInitialProjectsState,
  createProject,
  createSnapshot,
  duplicateProject,
  normalizeProjectsState,
} from '../utils/projectState';

const PROJECTS_STORAGE_KEY = 'storycrafter_projects_state';

export default function useProjectManager() {
  const [projectsState, setProjectsState] = usePersistentState(
    PROJECTS_STORAGE_KEY,
    createInitialProjectsState,
    {
      deserialize: (storedValue) => normalizeProjectsState(JSON.parse(storedValue)),
      serialize: (value) => JSON.stringify(value),
    },
  );

  const currentProject = projectsState.projects.find((project) => project.id === projectsState.currentProjectId)
    || projectsState.projects[0];

  const updateProjectById = (projectId, updater) => {
    setProjectsState((previousState) => ({
      ...previousState,
      projects: previousState.projects.map((project) => (
        project.id === projectId ? updater(project) : project
      )),
    }));
  };

  const updateCurrentProject = (updater) => {
    if (!currentProject) {
      return;
    }

    updateProjectById(currentProject.id, (project) => {
      const nextProject = typeof updater === 'function' ? updater(project) : updater;
      return {
        ...project,
        ...nextProject,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const setCurrentProjectField = (field, valueOrUpdater) => {
    updateCurrentProject((project) => ({
      [field]: typeof valueOrUpdater === 'function'
        ? valueOrUpdater(project[field])
        : valueOrUpdater,
    }));
  };

  const createNewProject = (name = 'Untitled Project') => {
    const newProject = createProject({ name });
    setProjectsState((previousState) => ({
      currentProjectId: newProject.id,
      projects: [newProject, ...previousState.projects],
    }));
    return newProject.id;
  };

  const switchProject = (projectId) => {
    setProjectsState((previousState) => (
      previousState.projects.some((project) => project.id === projectId)
        ? { ...previousState, currentProjectId: projectId }
        : previousState
    ));
  };

  const renameProject = (projectId, name) => {
    updateProjectById(projectId, (project) => ({
      ...project,
      name: name.trim() || project.name,
      updatedAt: new Date().toISOString(),
    }));
  };

  const duplicateProjectById = (projectId) => {
    let duplicatedProjectId = null;

    setProjectsState((previousState) => {
      const sourceProject = previousState.projects.find((project) => project.id === projectId);
      if (!sourceProject) {
        return previousState;
      }

      const newProject = duplicateProject(sourceProject);
      duplicatedProjectId = newProject.id;

      return {
        currentProjectId: newProject.id,
        projects: [newProject, ...previousState.projects],
      };
    });

    return duplicatedProjectId;
  };

  const deleteProject = (projectId) => {
    let deleted = false;

    setProjectsState((previousState) => {
      if (previousState.projects.length === 1) {
        return previousState;
      }

      const remainingProjects = previousState.projects.filter((project) => project.id !== projectId);
      if (remainingProjects.length === previousState.projects.length) {
        return previousState;
      }

      deleted = true;

      return {
        currentProjectId: previousState.currentProjectId === projectId
          ? remainingProjects[0].id
          : previousState.currentProjectId,
        projects: remainingProjects,
      };
    });

    return deleted;
  };

  const saveSnapshot = ({
    projectId = currentProject?.id,
    label = 'Manual snapshot',
    source = 'manual',
    contentOverride = null,
  } = {}) => {
    if (!projectId) {
      return null;
    }

    let createdSnapshot = null;

    updateProjectById(projectId, (project) => {
      const snapshotSourceProject = contentOverride
        ? {
            ...project,
            ...contentOverride,
          }
        : project;

      createdSnapshot = createSnapshot(snapshotSourceProject, label, source);
      return attachSnapshot({
        ...project,
        updatedAt: new Date().toISOString(),
      }, createdSnapshot);
    });

    return createdSnapshot;
  };

  const restoreSnapshot = (projectId, snapshotId) => {
    let restored = false;

    updateProjectById(projectId, (project) => {
      const snapshot = project.snapshots.find((entry) => entry.id === snapshotId);
      if (!snapshot) {
        return project;
      }

      const backupSnapshot = createSnapshot(project, 'Before restore', 'restore-backup');
      restored = true;

      return applyProjectContent(
        attachSnapshot(project, backupSnapshot),
        snapshot.content,
      );
    });

    return restored;
  };

  return {
    projects: projectsState.projects,
    currentProject,
    currentProjectId: projectsState.currentProjectId,
    setCurrentProjectField,
    updateCurrentProject,
    createNewProject,
    switchProject,
    renameProject,
    duplicateProjectById,
    deleteProject,
    saveSnapshot,
    restoreSnapshot,
  };
}
