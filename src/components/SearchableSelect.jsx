import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Plus } from 'lucide-react';

export default function SearchableSelect({ options = [], value = '', onChange, placeholder = 'Select an option...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Find selected preset option
  const selectedOption = options.find((opt) => opt.id === value);
  const displayName = selectedOption ? selectedOption.name : (value ? `Custom: ${value}` : placeholder);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter options
  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if searchQuery is a valid custom value (not matching any existing options exactly)
  const isCustomOptionVisible =
    searchQuery.trim().length > 0 &&
    !options.some((opt) => opt.id.toLowerCase() === searchQuery.trim().toLowerCase());

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="searchable-select-container" ref={containerRef}>
      {/* Trigger button (looks like a dropdown select) */}
      <div className="select-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span className={selectedOption || value ? 'text-primary' : 'text-muted'}>
          {displayName}
        </span>
        <ChevronDown size={14} className="select-trigger-icon" />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="select-dropdown-menu">
          <div className="select-search-wrapper">
            <Search size={14} className="select-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="select-search-input"
              placeholder="Search or type custom ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="select-options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isActive = opt.id === value;
                return (
                  <div
                    key={opt.id}
                    className={`select-option ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelect(opt.id)}
                  >
                    <span className="option-name">{opt.name}</span>
                    <span className="option-id">{opt.id}</span>
                  </div>
                );
              })
            ) : (
              !isCustomOptionVisible && (
                <div className="select-no-results">No models found</div>
              )
            )}

            {/* Custom option prompt */}
            {isCustomOptionVisible && (
              <div
                className="select-option custom-option"
                onClick={() => handleSelect(searchQuery.trim())}
              >
                <Plus size={12} style={{ marginRight: '6px' }} />
                <span>Use custom model: </span>
                <span className="custom-value-highlight">{searchQuery.trim()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
