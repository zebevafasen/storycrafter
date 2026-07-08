import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  FileText,
  FolderPlus,
  Pencil,
  Plus,
  MoreVertical,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import CharacterEditor from './CharacterEditor';
import TagInput from './TagInput';
import { manuscriptDocToPlainText } from '../utils/manuscriptDocument';
import {
  PRESET_CUSTOM_TAGS,
  PRESET_GENRES,
  PRESET_THEMES,
} from '../utils/storyPresets';
import {
  STORY_SCOPE_TYPES,
  getOrderedSceneEntries,
  getStructureStats,
} from '../utils/storyStructure';

function confirmDelete(storyStructure, nodeType, nodeId) {
  const stats = getStructureStats(storyStructure, nodeType, nodeId);
  const label = nodeType === STORY_SCOPE_TYPES.ACT
    ? 'act'
    : nodeType === STORY_SCOPE_TYPES.CHAPTER
    ? 'chapter'
    : 'scene';

  if (stats.hasProse) {
    return window.confirm(
      `Delete this ${label}? This will remove ${stats.sceneCount} scene${stats.sceneCount === 1 ? '' : 's'} and ${stats.wordCount} word${stats.wordCount === 1 ? '' : 's'} of prose.`,
    );
  }

  return window.confirm(`Delete this empty ${label}?`);
}

function getWordCount(text = '') {
  const trimmedText = text.trim();
  return trimmedText ? trimmedText.split(/\s+/).length : 0;
}

function EditableOutlineTitle({
  value,
  autoFocus,
  onSave,
  onCancel,
}) {
  const [draft, setDraft] = useState(value);

  return (
    <div className="outline-title-edit">
      <input
        type="text"
        value={draft}
        autoFocus={autoFocus}
        onChange={(event) => setDraft(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSave(draft);
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
        onBlur={() => onSave(draft)}
      />
      <button type="button" className="icon-btn outline-edit-action" title="Save title" onMouseDown={(event) => event.preventDefault()} onClick={() => onSave(draft)}>
        <Check size={13} />
      </button>
      <button type="button" className="icon-btn outline-edit-action" title="Cancel title edit" onMouseDown={(event) => event.preventDefault()} onClick={onCancel}>
        <X size={13} />
      </button>
    </div>
  );
}

function OutlineActionsMenu({
  isOpen,
  onToggle,
  children,
}) {
  return (
    <div className="outline-menu-shell">
      <button
        type="button"
        className="icon-btn outline-menu-trigger"
        title="Outline actions"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        <MoreVertical size={14} />
      </button>
      {isOpen && (
        <div className="outline-menu" onClick={(event) => event.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

function OutlineMenuButton({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      className={`outline-menu-item ${danger ? 'danger' : ''}`}
      onClick={onClick}
    >
      {Icon ? <Icon size={13} /> : null}
      <span>{label}</span>
    </button>
  );
}

function StoryOutline({
  storyStructure,
  activeSceneId,
  visibleScope,
  onViewScopeChange,
  onActiveSceneChange,
  onAddAct,
  onAddChapter,
  onAddScene,
  onRenameStructureNode,
  onReorderStructureNode,
  onMoveChapterToAct,
  onMoveSceneToChapter,
  onMoveStructureNode,
  onDeleteStructureNode,
}) {
  const [openMenuId, setOpenMenuId] = useState('');
  const [editingNode, setEditingNode] = useState(null);
  const [dragState, setDragState] = useState(null);
  const orderedEntries = getOrderedSceneEntries(storyStructure);
  const allChapters = storyStructure.acts.flatMap((act) => (
    act.chapterIds
      .map((chapterId) => storyStructure.chaptersById[chapterId])
      .filter(Boolean)
  ));

  const startEditing = (nodeType, nodeId, title) => {
    setOpenMenuId('');
    setEditingNode({ nodeType, nodeId, title });
  };

  const saveTitle = (nodeType, nodeId, title) => {
    onRenameStructureNode(nodeType, nodeId, title);
    setEditingNode(null);
  };

  const isEditing = (nodeType, nodeId) => (
    editingNode?.nodeType === nodeType && editingNode?.nodeId === nodeId
  );

  const renderNodeMain = ({
    nodeType,
    nodeId,
    title,
    icon,
    meta = '',
    onSelect,
  }) => {
    const editing = isEditing(nodeType, nodeId);

    if (editing) {
      return (
        <div className="outline-node-main editing">
          {icon}
          <EditableOutlineTitle
            value={editingNode.title}
            autoFocus
            onSave={(nextTitle) => saveTitle(nodeType, nodeId, nextTitle)}
            onCancel={() => setEditingNode(null)}
          />
        </div>
      );
    }

    return (
      <button
        type="button"
        className="outline-node-main"
        onClick={onSelect}
        onDoubleClick={(event) => {
          event.preventDefault();
          startEditing(nodeType, nodeId, title);
        }}
        title="Double-click to rename"
      >
        {icon}
        <span className="outline-node-title">{title}</span>
        {meta && <span className="outline-node-meta">{meta}</span>}
      </button>
    );
  };

  const deleteNode = (nodeType, nodeId) => {
    setOpenMenuId('');
    if (!confirmDelete(storyStructure, nodeType, nodeId)) {
      return;
    }

    onDeleteStructureNode(nodeType, nodeId);
  };

  const selectScope = (type, id = null) => {
    setOpenMenuId('');
    onViewScopeChange({ type, id });
    if (type === STORY_SCOPE_TYPES.SCENE && id) {
      onActiveSceneChange(id);
    }
  };

  const startDrag = (event, payload) => {
    setOpenMenuId('');
    setDragState(payload);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
  };

  const allowDrop = (event, nodeType) => {
    if (dragState?.nodeType !== nodeType) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const finishDrop = (event, target) => {
    event.preventDefault();
    const rawPayload = event.dataTransfer.getData('application/json');
    const payload = rawPayload ? JSON.parse(rawPayload) : dragState;
    setDragState(null);

    if (!payload || payload.nodeType !== target.nodeType || payload.nodeId === target.nodeId) {
      return;
    }

    onMoveStructureNode({
      nodeType: payload.nodeType,
      nodeId: payload.nodeId,
      targetParentId: target.targetParentId,
      targetIndex: target.targetIndex,
    });
  };

  return (
    <div className="story-outline">
      <div className="outline-header">
        <div className="section-title">Manuscript Outline</div>
        <button type="button" className="setup-inline-action" onClick={onAddAct}>
          <FolderPlus size={14} />
          Act
        </button>
      </div>

      <button
        type="button"
        className={`outline-scope-btn ${visibleScope.type === STORY_SCOPE_TYPES.PROJECT ? 'active' : ''}`}
        onClick={() => selectScope(STORY_SCOPE_TYPES.PROJECT)}
      >
        <BookOpen size={14} />
        Whole Story
      </button>

      <div className="outline-tree">
        {storyStructure.acts.map((act) => {
          const isActScope = visibleScope.type === STORY_SCOPE_TYPES.ACT && visibleScope.id === act.id;
          const actStats = getStructureStats(storyStructure, STORY_SCOPE_TYPES.ACT, act.id);
          const actMenuId = `${STORY_SCOPE_TYPES.ACT}-${act.id}`;

          return (
            <div key={act.id} className="outline-act">
              <div
                className={`outline-node outline-act-node ${isActScope ? 'scope-active' : ''} ${dragState?.nodeId === act.id ? 'dragging' : ''}`}
                draggable={!isEditing(STORY_SCOPE_TYPES.ACT, act.id)}
                onDragStart={(event) => startDrag(event, {
                  nodeType: STORY_SCOPE_TYPES.ACT,
                  nodeId: act.id,
                  sourceParentId: '',
                })}
                onDragEnd={() => setDragState(null)}
                onDragOver={(event) => allowDrop(event, STORY_SCOPE_TYPES.ACT)}
                onDrop={(event) => finishDrop(event, {
                  nodeType: STORY_SCOPE_TYPES.ACT,
                  nodeId: act.id,
                  targetParentId: '',
                  targetIndex: storyStructure.acts.findIndex((entry) => entry.id === act.id),
                })}
              >
                {renderNodeMain({
                  nodeType: STORY_SCOPE_TYPES.ACT,
                  nodeId: act.id,
                  title: act.title,
                  icon: <BookOpen size={14} />,
                  meta: `${actStats.sceneCount} scene${actStats.sceneCount === 1 ? '' : 's'} · ${actStats.wordCount}w`,
                  onSelect: () => selectScope(STORY_SCOPE_TYPES.ACT, act.id),
                })}
                <OutlineActionsMenu
                  isOpen={openMenuId === actMenuId}
                  onToggle={() => setOpenMenuId((currentId) => (currentId === actMenuId ? '' : actMenuId))}
                >
                  <OutlineMenuButton icon={Plus} label="Add chapter" onClick={() => { setOpenMenuId(''); onAddChapter(act.id); }} />
                  <OutlineMenuButton icon={Pencil} label="Rename" onClick={() => startEditing(STORY_SCOPE_TYPES.ACT, act.id, act.title)} />
                  <OutlineMenuButton icon={ArrowUp} label="Move up" onClick={() => { setOpenMenuId(''); onReorderStructureNode(STORY_SCOPE_TYPES.ACT, act.id, 'up'); }} />
                  <OutlineMenuButton icon={ArrowDown} label="Move down" onClick={() => { setOpenMenuId(''); onReorderStructureNode(STORY_SCOPE_TYPES.ACT, act.id, 'down'); }} />
                  <OutlineMenuButton icon={Trash2} label="Delete" danger onClick={() => deleteNode(STORY_SCOPE_TYPES.ACT, act.id)} />
                </OutlineActionsMenu>
              </div>
              {act.chapterIds.map((chapterId) => {
                const chapter = storyStructure.chaptersById[chapterId];
                if (!chapter) {
                  return null;
                }

                const isChapterScope = visibleScope.type === STORY_SCOPE_TYPES.CHAPTER && visibleScope.id === chapter.id;
                const chapterStats = getStructureStats(storyStructure, STORY_SCOPE_TYPES.CHAPTER, chapter.id);
                const chapterMenuId = `${STORY_SCOPE_TYPES.CHAPTER}-${chapter.id}`;

                return (
                  <div key={chapter.id} className="outline-chapter">
                    <div
                      className={`outline-node outline-chapter-node ${isChapterScope ? 'scope-active' : ''} ${dragState?.nodeId === chapter.id ? 'dragging' : ''}`}
                      draggable={!isEditing(STORY_SCOPE_TYPES.CHAPTER, chapter.id)}
                      onDragStart={(event) => startDrag(event, {
                        nodeType: STORY_SCOPE_TYPES.CHAPTER,
                        nodeId: chapter.id,
                        sourceParentId: chapter.actId,
                      })}
                      onDragEnd={() => setDragState(null)}
                      onDragOver={(event) => allowDrop(event, STORY_SCOPE_TYPES.CHAPTER)}
                      onDrop={(event) => finishDrop(event, {
                        nodeType: STORY_SCOPE_TYPES.CHAPTER,
                        nodeId: chapter.id,
                        targetParentId: act.id,
                        targetIndex: act.chapterIds.findIndex((entryId) => entryId === chapter.id),
                      })}
                    >
                      {renderNodeMain({
                        nodeType: STORY_SCOPE_TYPES.CHAPTER,
                        nodeId: chapter.id,
                        title: chapter.title,
                        icon: <FileText size={14} />,
                        meta: `${chapterStats.sceneCount} scene${chapterStats.sceneCount === 1 ? '' : 's'} · ${chapterStats.wordCount}w`,
                        onSelect: () => selectScope(STORY_SCOPE_TYPES.CHAPTER, chapter.id),
                      })}
                      <OutlineActionsMenu
                        isOpen={openMenuId === chapterMenuId}
                        onToggle={() => setOpenMenuId((currentId) => (currentId === chapterMenuId ? '' : chapterMenuId))}
                      >
                        <OutlineMenuButton icon={Plus} label="Add scene" onClick={() => { setOpenMenuId(''); onAddScene(chapter.id); }} />
                        <OutlineMenuButton icon={Pencil} label="Rename" onClick={() => startEditing(STORY_SCOPE_TYPES.CHAPTER, chapter.id, chapter.title)} />
                        <OutlineMenuButton icon={ArrowUp} label="Move up" onClick={() => { setOpenMenuId(''); onReorderStructureNode(STORY_SCOPE_TYPES.CHAPTER, chapter.id, 'up'); }} />
                        <OutlineMenuButton icon={ArrowDown} label="Move down" onClick={() => { setOpenMenuId(''); onReorderStructureNode(STORY_SCOPE_TYPES.CHAPTER, chapter.id, 'down'); }} />
                        {storyStructure.acts.length > 1 && (
                          <label className="outline-menu-select">
                            <span>Move to act</span>
                            <select
                              value={chapter.actId}
                              onChange={(event) => {
                                setOpenMenuId('');
                                onMoveChapterToAct(chapter.id, event.target.value);
                              }}
                            >
                              {storyStructure.acts.map((targetAct) => (
                                <option key={targetAct.id} value={targetAct.id}>{targetAct.title}</option>
                              ))}
                            </select>
                          </label>
                        )}
                        <OutlineMenuButton icon={Trash2} label="Delete" danger onClick={() => deleteNode(STORY_SCOPE_TYPES.CHAPTER, chapter.id)} />
                      </OutlineActionsMenu>
                    </div>
                    {chapter.sceneIds.map((sceneId) => {
                      const scene = storyStructure.scenesById[sceneId];
                      if (!scene) {
                        return null;
                      }

                      const isSceneScope = visibleScope.type === STORY_SCOPE_TYPES.SCENE && visibleScope.id === scene.id;
                      const isActive = activeSceneId === scene.id;
                      const sceneNumber = orderedEntries.findIndex((entry) => entry.scene.id === scene.id) + 1;
                      const sceneWordCount = getWordCount(manuscriptDocToPlainText(scene.manuscriptDoc));
                      const sceneMenuId = `${STORY_SCOPE_TYPES.SCENE}-${scene.id}`;

                      return (
                        <div key={scene.id} className={`outline-scene ${isActive ? 'active-scene' : ''}`}>
                          <div
                            className={`outline-node outline-scene-node ${isSceneScope ? 'scope-active' : ''} ${dragState?.nodeId === scene.id ? 'dragging' : ''}`}
                            draggable={!isEditing(STORY_SCOPE_TYPES.SCENE, scene.id)}
                            onDragStart={(event) => startDrag(event, {
                              nodeType: STORY_SCOPE_TYPES.SCENE,
                              nodeId: scene.id,
                              sourceParentId: scene.chapterId,
                            })}
                            onDragEnd={() => setDragState(null)}
                            onDragOver={(event) => allowDrop(event, STORY_SCOPE_TYPES.SCENE)}
                            onDrop={(event) => finishDrop(event, {
                              nodeType: STORY_SCOPE_TYPES.SCENE,
                              nodeId: scene.id,
                              targetParentId: chapter.id,
                              targetIndex: chapter.sceneIds.findIndex((entryId) => entryId === scene.id),
                            })}
                          >
                            {renderNodeMain({
                              nodeType: STORY_SCOPE_TYPES.SCENE,
                              nodeId: scene.id,
                              title: scene.title,
                              icon: <span className="outline-scene-number">{sceneNumber}</span>,
                              meta: `${sceneWordCount}w`,
                              onSelect: () => {
                                onActiveSceneChange(scene.id);
                                selectScope(STORY_SCOPE_TYPES.SCENE, scene.id);
                              },
                            })}
                            <OutlineActionsMenu
                              isOpen={openMenuId === sceneMenuId}
                              onToggle={() => setOpenMenuId((currentId) => (currentId === sceneMenuId ? '' : sceneMenuId))}
                            >
                              <OutlineMenuButton icon={Pencil} label="Rename" onClick={() => startEditing(STORY_SCOPE_TYPES.SCENE, scene.id, scene.title)} />
                              <OutlineMenuButton icon={ArrowUp} label="Move up" onClick={() => { setOpenMenuId(''); onReorderStructureNode(STORY_SCOPE_TYPES.SCENE, scene.id, 'up'); }} />
                              <OutlineMenuButton icon={ArrowDown} label="Move down" onClick={() => { setOpenMenuId(''); onReorderStructureNode(STORY_SCOPE_TYPES.SCENE, scene.id, 'down'); }} />
                              {allChapters.length > 1 && (
                                <label className="outline-menu-select">
                                  <span>Move to chapter</span>
                                  <select
                                    value={scene.chapterId}
                                    onChange={(event) => {
                                      setOpenMenuId('');
                                      onMoveSceneToChapter(scene.id, event.target.value);
                                    }}
                                  >
                                    {allChapters.map((targetChapter) => (
                                      <option key={targetChapter.id} value={targetChapter.id}>{targetChapter.title}</option>
                                    ))}
                                  </select>
                                </label>
                              )}
                              <OutlineMenuButton icon={Trash2} label="Delete" danger onClick={() => deleteNode(STORY_SCOPE_TYPES.SCENE, scene.id)} />
                            </OutlineActionsMenu>
                          </div>
                        </div>
                      );
                    })}
                    <div
                      className="outline-drop-zone"
                      onDragOver={(event) => allowDrop(event, STORY_SCOPE_TYPES.SCENE)}
                      onDrop={(event) => finishDrop(event, {
                        nodeType: STORY_SCOPE_TYPES.SCENE,
                        nodeId: '',
                        targetParentId: chapter.id,
                        targetIndex: chapter.sceneIds.length,
                      })}
                    />
                  </div>
                );
              })}
              <div
                className="outline-drop-zone"
                onDragOver={(event) => allowDrop(event, STORY_SCOPE_TYPES.CHAPTER)}
                onDrop={(event) => finishDrop(event, {
                  nodeType: STORY_SCOPE_TYPES.CHAPTER,
                  nodeId: '',
                  targetParentId: act.id,
                  targetIndex: act.chapterIds.length,
                })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StorySetupSidebar({
  isOpen,
  isGenerating,
  isPremiseGenerating,
  generatingCharacterId,
  genres,
  themes,
  customTags,
  characters,
  premise,
  onGenresChange,
  onThemesChange,
  onCustomTagsChange,
  onAddCharacter,
  onCharacterChange,
  onCharacterGenerateDescription,
  onCharacterRemove,
  onPremiseChange,
  onRandomizeGenres,
  onRandomizeThemes,
  onRandomizeCustomTags,
  onGeneratePremise,
  storyStructure,
  activeSceneId,
  visibleScope,
  onViewScopeChange,
  onActiveSceneChange,
  onAddAct,
  onAddChapter,
  onAddScene,
  onRenameStructureNode,
  onReorderStructureNode,
  onMoveChapterToAct,
  onMoveSceneToChapter,
  onMoveStructureNode,
  onDeleteStructureNode,
}) {
  const [activeTab, setActiveTab] = useState('outline');

  return (
    <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-tabs">
        <button
          type="button"
          className={activeTab === 'outline' ? 'active' : ''}
          onClick={() => setActiveTab('outline')}
        >
          Outline
        </button>
        <button
          type="button"
          className={activeTab === 'setup' ? 'active' : ''}
          onClick={() => setActiveTab('setup')}
        >
          Setup
        </button>
      </div>

      {activeTab === 'outline' ? (
        <StoryOutline
          storyStructure={storyStructure}
          activeSceneId={activeSceneId}
          visibleScope={visibleScope}
          onViewScopeChange={onViewScopeChange}
          onActiveSceneChange={onActiveSceneChange}
          onAddAct={onAddAct}
          onAddChapter={onAddChapter}
          onAddScene={onAddScene}
          onRenameStructureNode={onRenameStructureNode}
          onReorderStructureNode={onReorderStructureNode}
          onMoveChapterToAct={onMoveChapterToAct}
          onMoveSceneToChapter={onMoveSceneToChapter}
          onMoveStructureNode={onMoveStructureNode}
          onDeleteStructureNode={onDeleteStructureNode}
        />
      ) : (
        <>
          <div className="section-title">Story Setup</div>

          <TagInput
            label="Genres"
            presets={PRESET_GENRES}
            tags={genres}
            onChange={onGenresChange}
            onRandomize={onRandomizeGenres}
            disabled={isGenerating || isPremiseGenerating}
          />

          <TagInput
            label="Themes"
            presets={PRESET_THEMES}
            tags={themes}
            onChange={onThemesChange}
            onRandomize={onRandomizeThemes}
            disabled={isGenerating || isPremiseGenerating}
          />

          <TagInput
            label="Custom Tags"
            presets={PRESET_CUSTOM_TAGS}
            tags={customTags}
            onChange={onCustomTagsChange}
            onRandomize={onRandomizeCustomTags}
            disabled={isGenerating || isPremiseGenerating}
          />

          <div className="form-group" style={{ marginTop: '4px' }}>
            <div className="setup-field-header">
              <label htmlFor="premise">Description / Summary</label>
              <button
                type="button"
                className="setup-inline-action"
                onClick={onGeneratePremise}
                disabled={isGenerating || isPremiseGenerating}
                title="Generate a setup summary from the selected genres, themes, and tags"
              >
                <Sparkles size={14} style={isPremiseGenerating ? { animation: 'spin 1.5s linear infinite' } : undefined} />
                {isPremiseGenerating ? 'Generating...' : 'Draft from setup'}
              </button>
            </div>
            <textarea
              id="premise"
              value={premise}
              onChange={(event) => onPremiseChange(event.target.value)}
              placeholder="Introduce the premise, core conflict, or setting... or let StoryCrafter draft one from your setup."
              style={{ minHeight: '140px', resize: 'vertical', fontSize: '0.85rem' }}
              disabled={isGenerating || isPremiseGenerating}
            />
          </div>

          <div className="characters-section">
            <div className="setup-field-header">
              <div className="section-title" style={{ marginBottom: 0 }}>
                <span>Characters</span>
              </div>
              <button
                type="button"
                className="setup-inline-action"
                onClick={onAddCharacter}
                disabled={isGenerating || isPremiseGenerating}
                title="Add a character profile"
              >
                <UserPlus size={14} />
                Add Character
              </button>
            </div>

            {characters.length > 0 ? (
              <div className="characters-list">
                {characters.map((character, index) => (
                  <CharacterEditor
                    key={character.id}
                    character={character}
                    index={index}
                    disabled={isGenerating || isPremiseGenerating}
                    isGeneratingDescription={generatingCharacterId === character.id}
                    onChange={(value) => onCharacterChange(character.id, value)}
                    onGenerateDescription={() => onCharacterGenerateDescription(character.id)}
                    onRemove={() => onCharacterRemove(character.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="character-empty-state">
                No characters yet. Add one to keep names, traits, and notes in the AI context.
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
