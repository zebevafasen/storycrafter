import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Settings,
  Download,
  Copy,
  Plus,
  Trash2,
  FileText,
  Sparkles,
  RefreshCw,
  ChevronRight,
  PanelLeft,
  Brain,
  X
} from 'lucide-react';
import TagInput from './components/TagInput';
import MemoryPanel from './components/MemoryPanel';
import SettingsModal from './components/SettingsModal';
import { generateNextSegment, updateMemory, AVAILABLE_MODELS, fetchOpenRouterModels } from './services/openrouter';

const PRESET_GENRES = ['Fantasy', 'Sci-Fi', 'Mystery', 'Thriller', 'Romance', 'Horror', 'Adventure', 'Historical'];
const PRESET_THEMES = ['Coming of Age', 'Revenge', 'Redemption', 'Sacrifice', 'Identity', 'Fate', 'Betrayal', 'Survival'];
const PRESET_CUSTOM_TAGS = ['medieval', 'human-centric', 'industrial', 'female protag', 'magic-system', 'first-person', 'steampunk', 'cyberpunk', 'high-fantasy', 'grimdark'];

export default function App() {
  // --- Persistent State ---
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('storycrafter_config');
    return saved ? JSON.parse(saved) : { apiKey: '', model: 'deepseek/deepseek-chat', temperature: 0.7 };
  });

  const [storyText, setStoryText] = useState(() => {
    return localStorage.getItem('storycrafter_text') || '';
  });

  const [genres, setGenres] = useState(() => {
    const saved = localStorage.getItem('storycrafter_genres');
    return saved ? JSON.parse(saved) : [];
  });

  const [themes, setThemes] = useState(() => {
    const saved = localStorage.getItem('storycrafter_themes');
    return saved ? JSON.parse(saved) : [];
  });

  const [customTags, setCustomTags] = useState(() => {
    const saved = localStorage.getItem('storycrafter_tags');
    return saved ? JSON.parse(saved) : [];
  });

  const [premise, setPremise] = useState(() => {
    return localStorage.getItem('storycrafter_premise') || '';
  });

  const [memory, setMemory] = useState(() => {
    return localStorage.getItem('storycrafter_memory') || '';
  });

  // --- UI State ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [whatHappensNext, setWhatHappensNext] = useState('');
  const [nextMainEvent, setNextMainEvent] = useState('');
  
  // Limits (Default set to 3 paragraphs as requested)
  const [limitType, setLimitType] = useState('paragraphs'); // 'words' | 'paragraphs' | 'nolimit'
  const [limitValue, setLimitValue] = useState(3);

  // Status
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMemoryUpdating, setIsMemoryUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Dynamic Live Models List
  const [modelsList, setModelsList] = useState(AVAILABLE_MODELS);

  const textareaRef = useRef(null);

  // Fetch live OpenRouter models on mount
  useEffect(() => {
    let isMounted = true;
    const loadModels = async () => {
      const liveModels = await fetchOpenRouterModels();
      if (liveModels && liveModels.length > 0 && isMounted) {
        setModelsList(liveModels);
      }
    };
    loadModels();
    return () => { isMounted = false; };
  }, []);

  // --- Effects for Syncing LocalStorage ---
  useEffect(() => {
    localStorage.setItem('storycrafter_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('storycrafter_text', storyText);
  }, [storyText]);

  useEffect(() => {
    localStorage.setItem('storycrafter_genres', JSON.stringify(genres));
  }, [genres]);

  useEffect(() => {
    localStorage.setItem('storycrafter_themes', JSON.stringify(themes));
  }, [themes]);

  useEffect(() => {
    localStorage.setItem('storycrafter_tags', JSON.stringify(customTags));
  }, [customTags]);

  useEffect(() => {
    localStorage.setItem('storycrafter_premise', premise);
  }, [premise]);

  useEffect(() => {
    localStorage.setItem('storycrafter_memory', memory);
  }, [memory]);

  // Scroll textarea to bottom during generation
  useEffect(() => {
    if (isGenerating && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [storyText, isGenerating]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // --- Helper Functions ---
  const triggerToast = (msg) => {
    setToastMessage(msg);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    triggerToast('Settings updated');
  };

  // Generate Next Story Segment
  const handleGenerate = async () => {
    if (!config.apiKey) {
      triggerToast('Please configure your OpenRouter API Key in Settings first.');
      setIsSettingsOpen(true);
      return;
    }

    setIsGenerating(true);
    const originalText = storyText.trim();
    let fullGeneratedText = '';

    try {
      const finalLimitValue = limitType === 'nolimit' ? null : Number(limitValue);
      
      const newText = await generateNextSegment({
        apiKey: config.apiKey,
        model: config.model,
        temperature: config.temperature,
        genres,
        themes,
        tags: customTags,
        premise,
        memory,
        storyText: originalText,
        whatHappensNext,
        nextMainEvent,
        limitType,
        limitValue: finalLimitValue,
        onChunk: (textSoFar) => {
          fullGeneratedText = textSoFar;
          setStoryText(originalText + (originalText ? '\n\n' : '') + textSoFar);
        },
      });

      if (!newText) {
        throw new Error('Received empty response from the AI co-writer.');
      }

      // Ensure state matches the final trimmed string
      const finalCombinedText = originalText + (originalText ? '\n\n' : '') + newText.trim();
      setStoryText(finalCombinedText);
      
      // Clear micro-instruction but keep the macro event/goal
      setWhatHappensNext('');

      triggerToast('Story segment generated');

      // Trigger Background Memory Update
      triggerMemoryUpdate(newText.trim(), finalCombinedText);

    } catch (err) {
      console.error(err);
      triggerToast(`Generation failed: ${err.message}`);
      // Revert if nothing was successfully streamed
      if (!fullGeneratedText) {
        setStoryText(originalText);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Background Memory Update Loop
  const triggerMemoryUpdate = async (newTextAddition, fullStory) => {
    if (!config.apiKey) return;

    setIsMemoryUpdating(true);
    try {
      const updatedMem = await updateMemory({
        apiKey: config.apiKey,
        model: config.model,
        currentMemory: memory,
        premise,
        newSegmentText: newTextAddition,
      });
      if (updatedMem) {
        setMemory(updatedMem);
        triggerToast('Story Memory automatically updated');
      }
    } catch (err) {
      console.error('Memory background update failed:', err);
    } finally {
      setIsMemoryUpdating(false);
    }
  };

  // Manual Memory Update Request
  const handleManualMemorySync = async () => {
    if (!storyText.trim()) {
      triggerToast('Write some story first.');
      return;
    }
    setIsMemoryUpdating(true);
    try {
      const updatedMem = await updateMemory({
        apiKey: config.apiKey,
        model: config.model,
        currentMemory: '', // regenerate clean from scratch
        premise,
        newSegmentText: storyText,
      });
      if (updatedMem) {
        setMemory(updatedMem);
        triggerToast('Story Memory rebuilt');
      }
    } catch (err) {
      triggerToast(`Memory sync failed: ${err.message}`);
    } finally {
      setIsMemoryUpdating(false);
    }
  };

  const handleClearStory = () => {
    if (window.confirm('Are you sure you want to clear your current story? This action is irreversible.')) {
      setStoryText('');
      setMemory('');
      triggerToast('Story cleared');
    }
  };

  // Copy/Export
  const handleCopyToClipboard = () => {
    if (!storyText.trim()) {
      triggerToast('The story is empty.');
      return;
    }
    navigator.clipboard.writeText(storyText);
    triggerToast('Copied story to clipboard');
  };

  const handleExportText = (format) => {
    if (!storyText.trim()) {
      triggerToast('Nothing to export.');
      return;
    }

    let outputText = '';
    let filename = `story.${format === 'markdown' ? 'md' : 'txt'}`;

    if (format === 'markdown') {
      outputText = `# Story Setup\n\n`;
      if (genres.length) outputText += `**Genres:** ${genres.join(', ')}\n`;
      if (themes.length) outputText += `**Themes:** ${themes.join(', ')}\n`;
      if (customTags.length) outputText += `**Tags:** ${customTags.join(', ')}\n\n`;
      if (premise) outputText += `## Premise\n${premise}\n\n`;
      if (memory) outputText += `## Running Memory\n${memory}\n\n`;
      outputText += `## Story\n\n${storyText}`;
    } else {
      outputText = `Story Details\n`;
      outputText += `Genres: ${genres.join(', ')}\n`;
      outputText += `Themes: ${themes.join(', ')}\n`;
      outputText += `Tags: ${customTags.join(', ')}\n`;
      outputText += `Premise: ${premise}\n\n`;
      outputText += `Memory:\n${memory}\n\n`;
      outputText += `Story:\n\n${storyText}`;
    }

    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast(`Exported as ${format.toUpperCase()}`);
  };

  return (
    <div className="app-container">
      {/* HEADER NAVBAR */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            className={`icon-btn ${isLeftPanelOpen ? 'active' : ''}`}
            title={isLeftPanelOpen ? "Hide Story Setup" : "Show Story Setup"}
          >
            <PanelLeft size={16} />
          </button>
          
          <div className="logo">
            <BookOpen size={20} className="text-muted" />
            Story<span>Crafter</span>
          </div>

          <div className="header-status">
            <div className="status-item">
              <span className="status-label">Model:</span>
              <span className="status-value">
                {modelsList.find(m => m.id === config.model)?.name || config.model}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">API:</span>
              <span className={`status-dot ${config.apiKey ? 'active' : ''}`} />
              <span className="status-value">
                {config.apiKey ? 'Active' : 'Missing'}
              </span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            onClick={() => setIsMemoryOpen(!isMemoryOpen)}
            className={`icon-btn ${isMemoryOpen ? 'active' : ''}`}
            title="Toggle Story Memory"
            style={{ marginRight: '4px' }}
          >
            <Brain size={16} style={{ color: isMemoryOpen ? 'var(--accent-light)' : 'inherit' }} />
          </button>

          {storyText.trim() && (
            <>
              <button onClick={handleCopyToClipboard} className="icon-btn" title="Copy entire story to clipboard">
                <Copy size={16} />
              </button>
              <button onClick={() => handleExportText('txt')} className="icon-btn" title="Export as TXT">
                <FileText size={16} />
              </button>
              <button onClick={() => handleExportText('markdown')} className="icon-btn" title="Export as Markdown">
                <Download size={16} />
              </button>
              <button onClick={handleClearStory} className="icon-btn text-danger" title="Clear Story" style={{ color: 'var(--danger-light)' }} disabled={isGenerating}>
                <Trash2 size={16} />
              </button>
            </>
          )}
          <button onClick={handleOpenSettings} className="icon-btn" title="Settings">
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* LEFT SIDEBAR - Story Parameters (re-ordered as requested) */}
      <aside className={`sidebar ${isLeftPanelOpen ? '' : 'collapsed'}`}>
        <div className="section-title">Story Setup</div>
        
        <TagInput
          label="Genres"
          presets={PRESET_GENRES}
          tags={genres}
          onChange={setGenres}
          disabled={isGenerating}
        />

        <TagInput
          label="Themes"
          presets={PRESET_THEMES}
          tags={themes}
          onChange={setThemes}
          disabled={isGenerating}
        />

        <TagInput
          label="Custom Tags"
          presets={PRESET_CUSTOM_TAGS}
          tags={customTags}
          onChange={setCustomTags}
          disabled={isGenerating}
        />

        <div className="form-group" style={{ marginTop: '4px' }}>
          <label htmlFor="premise">Description / Summary</label>
          <textarea
            id="premise"
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            placeholder="Introduce the premise, core conflict, or setting..."
            style={{ minHeight: '140px', resize: 'vertical', fontSize: '0.85rem' }}
            disabled={isGenerating}
          />
        </div>
      </aside>

      {/* CENTER WORKSPACE - Borderless Single Canvas Editor */}
      <main className="center-workspace">
        <div className="story-canvas-container">
          <textarea
            ref={textareaRef}
            className="story-textarea"
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            placeholder="Start typing your story here... Or click 'Co-Write next' below to let the AI begin writing."
            readOnly={isGenerating}
          />
          
          {isGenerating && (
            <div className="canvas-status">
              <Sparkles size={12} style={{ animation: 'spin 2s linear infinite' }} />
              <span>AI is co-writing...</span>
            </div>
          )}
        </div>

        {/* RIGHT DRAWER - Story Memory (rebuilt as requested) */}
        <aside className={`memory-drawer ${isMemoryOpen ? 'open' : ''}`}>
          <div className="drawer-header">
            <h3>Story Memory</h3>
            <button className="icon-btn" onClick={() => setIsMemoryOpen(false)} title="Close Panel">
              <X size={14} />
            </button>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <MemoryPanel
              memory={memory}
              onChange={setMemory}
              isUpdating={isMemoryUpdating}
              disabled={isGenerating}
            />

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
              <div className="section-title">Actions</div>
              <button 
                onClick={handleManualMemorySync} 
                disabled={isMemoryUpdating || isGenerating} 
                style={{ width: '100%' }}
              >
                <RefreshCw size={14} className={isMemoryUpdating ? 'spin' : ''} />
                Rebuild memory from story
              </button>
            </div>
          </div>
        </aside>

        {/* BOTTOM PROMPT CONTROL BAR */}
        <section className="bottom-controls">
          <div className="control-inputs-row">
            <div className="prompt-box">
              <label htmlFor="whatNext">What should happen next? (Micro instructions)</label>
              <textarea
                id="whatNext"
                className="prompt-textarea"
                value={whatHappensNext}
                onChange={(e) => setWhatHappensNext(e.target.value)}
                placeholder="e.g. A stranger enters the tavern holding a mysterious letter..."
                disabled={isGenerating}
              />
            </div>
            <div className="prompt-box">
              <label htmlFor="mainGoal">Next main event / goal (Macro target)</label>
              <textarea
                id="mainGoal"
                className="prompt-textarea"
                value={nextMainEvent}
                onChange={(e) => setNextMainEvent(e.target.value)}
                placeholder="e.g. Find the lost key inside the old temple ruins."
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="control-actions-row">
            <div className="length-control-container">
              <div className="length-tabs">
                <button
                  type="button"
                  className={`length-tab-btn ${limitType === 'words' ? 'active' : ''}`}
                  onClick={() => { setLimitType('words'); setLimitValue(250); }}
                >
                  Words
                </button>
                <button
                  type="button"
                  className={`length-tab-btn ${limitType === 'paragraphs' ? 'active' : ''}`}
                  onClick={() => { setLimitType('paragraphs'); setLimitValue(3); }}
                >
                  Paragraphs
                </button>
                <button
                  type="button"
                  className={`length-tab-btn ${limitType === 'nolimit' ? 'active' : ''}`}
                  onClick={() => { setLimitType('nolimit'); setLimitValue(null); }}
                >
                  No Limit
                </button>
              </div>

              {limitType !== 'nolimit' && (
                <div className="length-slider-wrapper">
                  <input
                    type="range"
                    min={limitType === 'words' ? 50 : 1}
                    max={limitType === 'words' ? 1000 : 10}
                    step={limitType === 'words' ? 10 : 1}
                    value={limitValue || (limitType === 'words' ? 250 : 3)}
                    onChange={(e) => setLimitValue(Number(e.target.value))}
                    className="length-slider"
                  />
                  <div className="length-input-indicator">
                    <input
                      type="number"
                      value={limitValue || ''}
                      onChange={(e) => setLimitValue(e.target.value === '' ? '' : Number(e.target.value))}
                      className="length-number-input"
                    />
                    <span className="length-unit">
                      {limitType === 'words' ? 'words' : (limitValue === 1 ? 'paragraph' : 'paragraphs')}
                    </span>
                  </div>
                </div>
              )}

              {limitType === 'nolimit' && (
                <span className="length-info-text">
                  AI co-writer decides naturally (no constraints)
                </span>
              )}
            </div>

            <div className="generate-actions">
              <button
                className="primary"
                onClick={handleGenerate}
                disabled={isGenerating}
                style={{ minWidth: '130px' }}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={14} className="text-muted" style={{ animation: 'spin 1.5s linear infinite' }} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Co-Write next
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={handleSaveConfig}
        modelsList={modelsList}
      />

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="toast">
          <ChevronRight size={14} style={{ color: 'var(--accent)' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
