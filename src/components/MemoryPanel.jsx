import React, { useState, useEffect } from 'react';
import { Edit2, Check, Sparkles } from 'lucide-react';

export default function MemoryPanel({ memory, onChange, isUpdating, disabled = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempMemory, setTempMemory] = useState(memory);

  useEffect(() => {
    if (disabled) {
      setIsEditing(false);
    }
  }, [disabled]);

  const handleStartEdit = () => {
    if (disabled) return;
    setTempMemory(memory);
    setIsEditing(true);
  };

  const handleSave = () => {
    onChange(tempMemory);
    setIsEditing(false);
  };

  // Helper to parse bullet points for pretty rendering
  const renderFormattedMemory = () => {
    if (!memory.trim()) {
      return (
        <div className="empty-state" style={{ padding: '20px 0', fontSize: '0.8rem' }}>
          No memories captured yet. The AI will populate this as the story develops, or you can write your own.
        </div>
      );
    }

    const lines = memory
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    return (
      <ul className="memory-list">
        {lines.map((line, idx) => {
          // Clean bullet prefixes
          const cleanedLine = line.replace(/^[-*•]\s*/, '');
          return (
            <li key={idx} className="memory-item">
              <span>•</span>
              <div>{cleanedLine}</div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className={`sidebar-section ${disabled ? 'disabled' : ''}`} style={{ display: 'flex', flex: '1', flexDirection: 'column', minHeight: 0 }}>
      <div className="section-title">
        <span>Story Memory</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isUpdating && <Sparkles size={12} className="text-muted" style={{ animation: 'spin 2s linear infinite' }} />}
          {isEditing ? (
            <button className="icon-btn" onClick={handleSave} title="Save changes" disabled={disabled}>
              <Check size={14} />
            </button>
          ) : (
            <button className="icon-btn" onClick={handleStartEdit} title="Edit memory" disabled={disabled}>
              <Edit2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: '1', overflowY: 'auto', minHeight: 0, marginTop: '8px' }}>
        {isEditing ? (
          <textarea
            className="memory-textarea"
            value={tempMemory}
            onChange={(e) => setTempMemory(e.target.value)}
            placeholder="Write key facts about characters, locations, or past events here..."
            style={{ width: '100%', height: '90%', resize: 'none' }}
          />
        ) : (
          <div style={{ padding: '4px' }}>{renderFormattedMemory()}</div>
        )}
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '8px' }}>
        * Updates automatically in the background after each generation.
      </div>
    </div>
  );
}
