import React, { useMemo, useState } from 'react';
import {
  Clock3,
  Copy,
  FolderPlus,
  History,
  Pencil,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';

function formatTimestamp(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function ProjectsModal({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  onSwitchProject,
  onCreateProject,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject,
  onSaveSnapshot,
  onRestoreSnapshot,
}) {
  const [newProjectName, setNewProjectName] = useState('');

  const currentProject = useMemo(
    () => projects.find((project) => project.id === currentProjectId) || projects[0],
    [currentProjectId, projects],
  );

  if (!isOpen || !currentProject) {
    return null;
  }

  const handleCreateProject = (event) => {
    event.preventDefault();
    const trimmedName = newProjectName.trim();
    onCreateProject(trimmedName || 'Untitled Project');
    setNewProjectName('');
  };

  const handleRenameProject = (project) => {
    const nextName = window.prompt('Rename project', project.name);
    if (nextName === null) {
      return;
    }

    onRenameProject(project.id, nextName);
  };

  const handleDeleteProject = (project) => {
    const shouldDelete = window.confirm(`Delete "${project.name}"? This will also remove its snapshot history.`);
    if (!shouldDelete) {
      return;
    }

    onDeleteProject(project.id);
  };

  const handleSaveSnapshot = () => {
    const label = window.prompt('Snapshot label', `Snapshot ${new Date().toLocaleString()}`);
    if (label === null) {
      return;
    }

    onSaveSnapshot(label.trim() || 'Manual snapshot');
  };

  const handleRestoreSnapshot = (snapshotId) => {
    const shouldRestore = window.confirm('Restore this snapshot? A backup snapshot of the current draft will be created first.');
    if (!shouldRestore) {
      return;
    }

    onRestoreSnapshot(snapshotId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content projects-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Projects</h3>
            <p className="projects-modal-subtitle">Switch drafts, organize work, and restore earlier versions.</p>
          </div>
          <button className="icon-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="projects-layout">
          <section className="projects-panel">
            <form className="projects-create-form" onSubmit={handleCreateProject}>
              <label htmlFor="projectName">New project</label>
              <div className="projects-create-row">
                <input
                  id="projectName"
                  type="text"
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                  placeholder="Project name..."
                />
                <button type="submit" className="primary">
                  <FolderPlus size={14} />
                  Create
                </button>
              </div>
            </form>

            <div className="projects-list">
              {projects.map((project) => {
                const isActive = project.id === currentProjectId;
                return (
                  <article key={project.id} className={`project-card ${isActive ? 'active' : ''}`}>
                    <div className="project-card-main">
                      <div>
                        <h4>{project.name}</h4>
                        <p>Updated {formatTimestamp(project.updatedAt)}</p>
                      </div>
                      <button
                        type="button"
                        className={isActive ? 'primary' : ''}
                        onClick={() => onSwitchProject(project.id)}
                      >
                        {isActive ? 'Open now' : 'Open'}
                      </button>
                    </div>

                    <div className="project-meta-row">
                      <span>{project.storyText.trim() ? `${project.storyText.trim().split(/\s+/).length} words` : 'Empty draft'}</span>
                      <span>{project.snapshots.length} snapshots</span>
                    </div>

                    <div className="project-actions-row">
                      <button type="button" onClick={() => handleRenameProject(project)}>
                        <Pencil size={14} />
                        Rename
                      </button>
                      <button type="button" onClick={() => onDuplicateProject(project.id)}>
                        <Copy size={14} />
                        Duplicate
                      </button>
                      <button type="button" onClick={() => handleDeleteProject(project)} disabled={projects.length === 1}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="history-panel">
            <div className="history-panel-header">
              <div>
                <div className="section-title">
                  <span>
                    <History size={14} />
                    Version History
                  </span>
                </div>
                <h4>{currentProject.name}</h4>
                <p>Autosaves happen continuously. Snapshots capture named restore points.</p>
              </div>
              <button type="button" className="primary" onClick={handleSaveSnapshot}>
                <Save size={14} />
                Save snapshot
              </button>
            </div>

            <div className="history-summary">
              <div className="history-summary-item">
                <Clock3 size={14} />
                <span>Last updated {formatTimestamp(currentProject.updatedAt)}</span>
              </div>
              <div className="history-summary-item">
                <History size={14} />
                <span>{currentProject.snapshots.length} saved snapshots</span>
              </div>
            </div>

            <div className="history-list">
              {currentProject.snapshots.length > 0 ? (
                currentProject.snapshots.map((snapshot) => (
                  <article key={snapshot.id} className="snapshot-card">
                    <div>
                      <h5>{snapshot.label}</h5>
                      <p>{formatTimestamp(snapshot.createdAt)}</p>
                    </div>
                    <div className="snapshot-meta">
                      <span className="snapshot-source">{snapshot.source}</span>
                      <button type="button" onClick={() => handleRestoreSnapshot(snapshot.id)}>
                        <RotateCcw size={14} />
                        Restore
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state history-empty-state">
                  No snapshots yet. Save one before a major change, or rely on automatic restore backups after restores.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
