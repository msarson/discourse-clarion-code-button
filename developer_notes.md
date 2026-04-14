# Developer Notes: Discourse Plugin API Techniques

## Overview
This theme component demonstrates several key techniques for interacting with the Discourse Plugin API in a stable and reliable way.

## Key Techniques

### 1. Stable API Reference Capture
**Problem**: The Discourse Plugin API reference can be shadowed or rewritten inside nested callbacks, causing methods like `getCurrentComposer()` to become undefined.

**Solution**: Immediately capture the API reference in a stable variable at the top level of the `withPluginApi` callback:

```javascript
withPluginApi("0.8", (api) => {
  const pluginApi = api;  // Capture stable reference
  
  // Use pluginApi instead of api in nested callbacks
  api.onAppEvent("composer:opened", () => {
    // ... nested code ...
    const composer = pluginApi.getCurrentComposer();  // ✓ Safe
  });
});
```

This prevents variable shadowing and ensures the Plugin API object is always accessible, even in deeply nested event handlers.

### 2. Dynamic I18n Translation Registration
Dynamically register translations at runtime to avoid requiring separate locale files:

```javascript
const locale = I18n.currentLocale();
I18n.translations[locale] ||= {};
I18n.translations[locale].js ||= {};
I18n.translations[locale].js.composer ||= {};

I18n.translations[locale].js.composer.clarion_code = "Insert Clarion code block";
```

Access translations with: `I18n.t("js.composer.clarion_code")`

### 3. Toolbar Button Integration
Add custom buttons to the composer toolbar:

```javascript
api.onToolbarCreate((toolbar) => {
  toolbar.addButton({
    id: "clarion-code",
    group: "insertions",
    icon: "code",
    title: "js.composer.clarion_code",
    perform(e) {
      e.applySurround("```clarion\n", "\n```", "clarion_code_placeholder", {
        multiline: false,
        useBlockMode: true
      });
    }
  });
});
```

### 4. Composer Event Handling
React to composer lifecycle events:

```javascript
api.onAppEvent("composer:opened", () => {
  const composerElement = document.querySelector(".d-editor-input");
  if (!composerElement) return;
  
  // Attach event handlers
});
```

### 5. Preventing Duplicate Event Handlers
Use dataset attributes to track handler attachment:

```javascript
if (composerElement.dataset.clarionPasteHandlerAttached) {
  return;  // Already attached
}
composerElement.dataset.clarionPasteHandlerAttached = "true";
```

### 6. Async Text Insertion After a Dialog
When inserting text asynchronously (after a Discourse dialog closes), `document.execCommand` is unreliable because focus and selection may have shifted. Instead, capture the selection before opening the dialog and use `setRangeText`:

```javascript
// Before opening dialog — capture insertion point
const selStart = textarea.selectionStart;
const selEnd = textarea.selectionEnd;

// Inside button action callback (async, after dialog closes)
function doInsert(textarea, text, selStart, selEnd) {
  if (!textarea?.isConnected) return;
  textarea.focus();
  textarea.setRangeText(text, selStart, selEnd, "end");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}
```

Dispatching an `input` event ensures Ember's two-way binding picks up the change.

### 7. Using the Discourse Dialog Service
Access via `api.container.lookup("service:dialog")` and call `dialog.dialog(params)`:

```javascript
const dialog = api.container.lookup("service:dialog");
let handled = false;

dialog.dialog({
  type: "confirm",           // REQUIRED — without this, only the backdrop renders
  title: "My title",
  message: "My message",
  didCancel: () => { if (!handled) fallback(); },  // Escape / backdrop
  buttons: [
    {
      label: "Do it",
      class: "btn-primary",
      action() { handled = true; doSomething(); },
    },
    // more buttons...
  ],
});
```

**Gotchas:**
- `type` is required — `dialog-holder.gjs` gates all content on `{{#if this.dialog.type}}`
- `handleButtonAction` calls `this.dialog.cancel()` after each button action, which triggers `didCancel`. Use a `handled` flag to prevent double-execution in `didCancel`.
- Add a null guard (`if (!dialog) { fallback(); return; }`) for forward-compatibility with older Discourse versions.

### 8. Code Block Detection
Detect if the cursor is inside a fenced code block to avoid nested formatting:

```javascript
const textBeforeCursor = text.substring(0, cursorPos);
const fenceMatches = textBeforeCursor.match(/^```/gm);
const fenceCount = fenceMatches ? fenceMatches.length : 0;

// Odd number of fences = inside a code block
if (fenceCount % 2 === 1) return;
```

## Common Pitfalls

1. **Not capturing stable API reference**: Leads to "getCurrentComposer is not a function" errors
2. **Using `execCommand` after async work**: Unreliable once focus has shifted; use `setRangeText` with pre-captured selection instead
3. **Not preventing duplicate handlers**: Can cause multiple confirmations or unwanted behaviour
4. **Minifier aliasing**: Variable names can be rewritten by minifiers; use stable references
5. **Missing `type` in dialog.dialog()**: Backdrop shows but dialog content never renders
6. **`didCancel` fires after button clicks**: `handleButtonAction` calls `cancel()` after each button, triggering `didCancel`; guard with a `handled` flag

## Testing Checklist

- [ ] Test paste detection with various Clarion code samples
- [ ] Verify Discourse dialog appears (not browser prompt)
- [ ] Test all 4 dialog buttons (Wrap / Always wrap / Never wrap / Skip)
- [ ] Verify Escape / backdrop click inserts plain text (Skip behaviour)
- [ ] Confirm "Always wrap" silently wraps on next paste without dialog
- [ ] Confirm "Never wrap" lets next paste through natively without dialog
- [ ] Verify "Reset Clarion paste preference" in Options menu clears saved choice
- [ ] Test paste inside existing code blocks (should not trigger)
- [ ] Verify toolbar button works independently
- [ ] Test with empty/whitespace-only pastes
- [ ] Verify no duplicate handlers on composer reopen

## Version History

- **1.3.1**: Fixed dialog not rendering (`type: "confirm"` required) and double-insert bug (`handled` flag for `didCancel`)
- **1.3.0**: Replaced browser `prompt()` with Discourse native dialog service; 4-button UX (Wrap / Always wrap / Never wrap / Skip); switched to `setRangeText` for reliable async insertion
- **1.2.1**: Fixed module import path (`discourse/lib/` → relative `../lib/`)
- **1.2.0**: Redesigned detection using structural signals instead of keyword scoring; extracted detection to testable lib file; added Vitest test suite (37 tests); added Clarion template language detection (`#For`, `#Loop`, `LOOP`)
- **1.1.9** and earlier: Keyword scoring detection, browser `prompt()` dialog
