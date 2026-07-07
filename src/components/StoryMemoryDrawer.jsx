import { RefreshCw, X } from 'lucide-react';
import MemoryPanel from './MemoryPanel';

export default function StoryMemoryDrawer({
  isOpen,
  memory,
  isGenerating,
  isMemoryUpdating,
  onClose,
  onMemoryChange,
  onRebuildMemory,
}) {
  return (
    <aside className={`memory-drawer ${isOpen ? 'open' : ''}`}>
      <div className="drawer-header">
        <h3>Story Memory</h3>
        <button className="icon-btn" onClick={onClose} title="Close Panel">
          <X size={14} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <MemoryPanel
          memory={memory}
          onChange={onMemoryChange}
          isUpdating={isMemoryUpdating}
          disabled={isGenerating}
        />

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
          <div className="section-title">Actions</div>
          <button
            onClick={onRebuildMemory}
            disabled={isMemoryUpdating || isGenerating}
            style={{ width: '100%' }}
          >
            <RefreshCw
              size={14}
              style={isMemoryUpdating ? { animation: 'spin 1.5s linear infinite' } : undefined}
            />
            Rebuild memory from story
          </button>
        </div>
      </div>
    </aside>
  );
}
