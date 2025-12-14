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

### 6. Manual Content Manipulation & Event Dispatch
When manipulating textarea content directly (without using Plugin API methods), you **must** dispatch an `input` event to notify Discourse:

```javascript
textarea.value = before + insertText + after;
textarea.setSelectionRange(newCursorPos, newCursorPos);

// Critical: Notify Discourse of content change
textarea.dispatchEvent(new Event("input", { bubbles: true }));
```

Without this dispatch, Discourse's internal state won't update and the changes may be lost.

### 7. Code Block Detection
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
2. **Forgetting to dispatch input events**: Manual textarea changes won't be recognized by Discourse
3. **Not preventing duplicate handlers**: Can cause multiple confirmations or unwanted behavior
4. **Minifier aliasing**: Variable names can be rewritten by minifiers; use stable references

## Testing Checklist

- [ ] Test paste detection with various code samples
- [ ] Verify confirmation dialog appears
- [ ] Confirm code blocks are properly inserted
- [ ] Test inside existing code blocks (should not trigger)
- [ ] Verify toolbar button works independently
- [ ] Test with empty/whitespace-only pastes
- [ ] Verify no duplicate handlers on composer reopen

## Version History

- **1.0.7**: Fixed API reference shadowing issue with stable `pluginApi` capture
- **1.0.6**: Added manual textarea manipulation with proper event dispatch
- **1.0.5**: Initial smart paste detection with keyword-based scoring
