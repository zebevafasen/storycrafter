import React from 'react';
import {
  BookOpen,
  Brain,
  Copy,
  Download,
  FileText,
  FolderOpen,
  PanelLeft,
  Settings,
  Trash2,
} from 'lucide-react';

export default function AppHeader({
  isLeftPanelOpen,
  isMemoryOpen,
  hasApiKey,
  currentProjectName,
  selectedModelName,
  hasStoryText,
  isGenerating,
  onToggleLeftPanel,
  onToggleMemory,
  onOpenProjects,
  onCopyStory,
  onExportText,
  onExportMarkdown,
  onClearStory,
  onOpenSettings,
}) {
  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onToggleLeftPanel}
          className={`icon-btn ${isLeftPanelOpen ? 'active' : ''}`}
          title={isLeftPanelOpen ? 'Hide Story Setup' : 'Show Story Setup'}
        >
          <PanelLeft size={16} />
        </button>

        <div className="logo">
          <BookOpen size={20} className="text-muted" />
          Story<span>Crafter</span>
        </div>

        <div className="header-status">
          <div className="status-item">
            <span className="status-label">Project:</span>
            <span className="status-value">{currentProjectName}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Model:</span>
            <span className="status-value">{selectedModelName}</span>
          </div>
          <div className="status-item">
            <span className="status-label">API:</span>
            <span className={`status-dot ${hasApiKey ? 'active' : ''}`} />
            <span className="status-value">{hasApiKey ? 'Active' : 'Missing'}</span>
          </div>
        </div>
      </div>

      <div className="header-actions">
        <button onClick={onOpenProjects} className="icon-btn" title="Projects and history">
          <FolderOpen size={16} />
        </button>
        <button
          onClick={onToggleMemory}
          className={`icon-btn ${isMemoryOpen ? 'active' : ''}`}
          title="Toggle Story Memory"
          style={{ marginRight: '4px' }}
        >
          <Brain size={16} style={{ color: isMemoryOpen ? 'var(--accent-light)' : 'inherit' }} />
        </button>

        {hasStoryText && (
          <>
            <button onClick={onCopyStory} className="icon-btn" title="Copy entire story to clipboard">
              <Copy size={16} />
            </button>
            <button onClick={onExportText} className="icon-btn" title="Export as TXT">
              <FileText size={16} />
            </button>
            <button onClick={onExportMarkdown} className="icon-btn" title="Export as Markdown">
              <Download size={16} />
            </button>
            <button
              onClick={onClearStory}
              className="icon-btn text-danger"
              title="Clear Story"
              style={{ color: 'var(--danger-light)' }}
              disabled={isGenerating}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}

        <button onClick={onOpenSettings} className="icon-btn" title="Settings">
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
