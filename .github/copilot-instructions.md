# Copilot Instructions

## What This Is

A **Discourse theme component** (not a plugin) that adds a Clarion language toolbar button and smart paste detection to the Discourse post composer. Installed via Discourse's admin panel by pointing at the git repo URL.

## Architecture

There is no build system. Discourse serves the files directly from the repo structure:

- `javascripts/discourse/api-initializers/clarion-code-button.js` — all logic; the single source of truth
- `common/common.scss` — modal/overlay CSS classes (defined for a custom modal approach; current implementation uses the native `prompt()` dialog instead)
- `about.json` — component metadata (name, version, minimum Discourse version)
- `config/` — reserved for Discourse settings YAML if added in future

## Key Conventions

### Discourse Plugin API
- Always use `withPluginApi("0.8", (api) => { const pluginApi = api; ... })` and reference `pluginApi` (not `api`) inside nested callbacks. The `api` reference can be shadowed/aliased by minifiers or closures — this is a known gotcha documented in `developer_notes.md`.
- Register I18n translations **dynamically at runtime** (no separate locale files):
  ```js
  const locale = I18n.currentLocale();
  I18n.translations[locale] ||= {};
  I18n.translations[locale].js ||= {};
  I18n.translations[locale].js.composer ||= {};
  I18n.translations[locale].js.composer.my_key = "My string";
  ```
- Use `api.onToolbarCreate` to add toolbar buttons (group: `"extras"`).
- Use `api.addComposerToolbarPopupMenuOption` to add entries to the Options (+) menu.
- Use `api.onAppEvent("composer:opened", ...)` to attach composer-lifecycle handlers.

### Preventing Duplicate Event Handlers
Guard all `addEventListener` calls with a `dataset` flag on the element:
```js
if (composerElement.dataset.clarionPasteHandlerAttached) return;
composerElement.dataset.clarionPasteHandlerAttached = "true";
```

### Programmatic Text Insertion
Use `document.execCommand("insertText", false, text)` — **not** direct `.value` assignment. This is intentional: it preserves the browser undo/redo stack. Manual textarea manipulation breaks Ctrl+Z. `execCommand` is deprecated but has no replacement for this use case.

### Clarion Detection Algorithm
`detectClarionCode(text)` in the main JS file:
1. Strip string literals first (`stripStrings`) to avoid false positives from quoted text
2. Veto checks: brace-based languages, SQL/T-SQL, Python (all return `false` immediately)
3. Weighted keyword scoring — hard keywords ×4, soft keywords ×2, data types ×2, built-in functions ×1
4. Threshold: score **≥ 8** triggers detection

### Preference Storage
- `localStorage` key: `clarion-code-button.wrapPreference`
- Values: `"always"` | `"never"` | (absent = prompt each time)

## Testing

No automated test suite. Use the manual checklist from `developer_notes.md`:
- Paste detection with various Clarion code samples
- Paste inside an existing code block (must **not** trigger)
- Toolbar button inserts `\`\`\`clarion\n...\n\`\`\`` fence
- `always`/`never` preference persistence and reset via Options menu
- No duplicate handlers when composer is closed and reopened
