import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { AVAILABLE_MODELS } from '../services/openrouter';
import SearchableSelect from './SearchableSelect';

export default function SettingsModal({ isOpen, onClose, config, onSave, modelsList = AVAILABLE_MODELS }) {
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [model, setModel] = useState(config.model || 'deepseek/deepseek-chat');
  const [temperature, setTemperature] = useState(config.temperature ?? 0.7);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(config.apiKey || '');
      setModel(config.model || 'deepseek/deepseek-chat');
      setTemperature(config.temperature ?? 0.7);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSave({ apiKey, model, temperature: parseFloat(temperature) });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>OpenRouter Configurations</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="apiKey">OpenRouter API Key</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="apiKey"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                Your key is stored locally in your browser and never sent to any server except OpenRouter.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="model">Model Preference</label>
              <SearchableSelect
                options={modelsList}
                value={model}
                onChange={setModel}
                placeholder="Select or search a model..."
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="temperature">Temperature: {temperature}</label>
              </div>
              <input
                id="temperature"
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                style={{ cursor: 'pointer', padding: 0 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                <span>Consistent (0.2)</span>
                <span>Balanced (0.7)</span>
                <span>Creative (1.2)</span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
