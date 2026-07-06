# StoryCrafter

StoryCrafter is a browser-based AI co-writing workspace for drafting fiction with OpenRouter models. It gives writers a central manuscript editor, lightweight story setup controls, targeted continuation prompts, and an automatically maintained story memory panel.

The app is built with React and Vite. It runs entirely in the browser and stores story state in `localStorage`.

## Features

- Central long-form story editor
- OpenRouter-powered AI continuation generation
- Streaming story output while the model writes
- Genre, theme, custom tag, and premise controls
- Micro instructions for the next beat
- Macro goal field for longer-term plot direction
- Word, paragraph, or unconstrained generation limits
- Automatic story memory updates after each generated segment
- Editable memory panel for characters, locations, facts, and active goals
- Searchable model picker with live OpenRouter model loading
- Multi-project workspace with named drafts
- Snapshot and restore history for each project
- Copy, TXT export, and Markdown export

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run the linter:

```bash
npm run lint
```

## OpenRouter Setup

StoryCrafter calls OpenRouter directly from the browser. To generate story text:

1. Open the app.
2. Click the settings button.
3. Paste an OpenRouter API key.
4. Pick a model and temperature.
5. Save settings.

The API key is saved in browser `localStorage` and sent only to OpenRouter when generation or memory updates are requested.

## How It Works

The main workspace is split into three writing areas:

- **Story Setup:** genres, themes, custom tags, and a premise or summary.
- **Story Canvas:** the current manuscript text.
- **Prompt Controls:** short instructions for the next generated segment and a larger plot target.

When the user clicks **Co-Write next**, StoryCrafter sends the setup, recent story text, story memory, and prompt controls to the selected OpenRouter model. The generated text streams into the manuscript editor. After generation finishes, the app asks the model to refresh the story memory in the background.

## Project Structure

```text
src/
  App.jsx                    Main application shell and state wiring
  main.jsx                   React entry point
  index.css                  Application styling
  hooks/
    usePersistentState.js    Reusable localStorage-backed state hook
    useProjectManager.js     Project switching and snapshot management
    useStoryGenerator.js     Generation and memory update workflow
  services/openrouter.js     OpenRouter API and prompt logic
  utils/
    projectState.js          Project state factories, migration, and restore helpers
    storyExport.js           Export content builders and file download helper
  components/
    AppHeader.jsx            Header actions and status display
    BottomControls.jsx       Prompt and generation controls
    MemoryPanel.jsx          Editable story memory drawer content
    ProjectsModal.jsx        Project manager and version history UI
    SearchableSelect.jsx     Model picker with custom model support
    SettingsModal.jsx        OpenRouter key, model, and temperature settings
    StoryCanvas.jsx          Main manuscript editor surface
    StoryMemoryDrawer.jsx    Slide-out memory panel wrapper
    StorySetupSidebar.jsx    Story setup controls
    TagInput.jsx             Tag entry and preset selector
```

## Persistence

StoryCrafter currently persists these values in browser `localStorage`:

- OpenRouter configuration
- A multi-project workspace state object
- Per-project story text, tags, prompts, memory, and generation settings
- Snapshot history for each project

There is no backend database yet, so data is local to the browser profile where the app is used.

## Notes For Development

- The app currently has no server-side secret handling. API keys are stored client-side.
- The model list is fetched from OpenRouter on load, with a built-in fallback list.
- The production base path is configured as `/storycrafter/` in `vite.config.js`.
