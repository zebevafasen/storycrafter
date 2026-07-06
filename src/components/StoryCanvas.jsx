import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

export default function StoryCanvas({
  storyText,
  isGenerating,
  onStoryTextChange,
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isGenerating && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [isGenerating, storyText]);

  return (
    <div className="story-canvas-container">
      <textarea
        ref={textareaRef}
        className="story-textarea"
        value={storyText}
        onChange={(event) => onStoryTextChange(event.target.value)}
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
  );
}
