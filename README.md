# Discourse Clarion Code Button

A Discourse theme component that adds a toolbar button to the composer for inserting Clarion code blocks, with intelligent paste detection and remembered preferences.

## Features

### 1. Manual Clarion Code Insertion

Adds a **</>** button to the Discourse composer toolbar. Clicking it inserts a fenced Clarion code block:

````clarion
```clarion

```
````

The cursor is automatically positioned inside the block, ready for you to type or paste.

### 2. Automatic Clarion Detection on Paste

When you paste into the composer, the component detects Clarion code using **structural signals** rather than keyword scoring, keeping false positives low:

| Signal | Example |
|--------|---------|
| `!` comment (not `!=` or `![`) | `x = 1  ! set value` |
| `CODE` alone on a line | `CODE` |
| Sized string type | `STRING(30)`, `CSTRING(10)` |
| Field declaration (`Name TYPE`) | `MyField  LONG` |
| `END` alone on a line | `END` |
| `LOOP` at start of line | `LOOP x = 1 TO 10` |
| Clarion template variable | `#For(%Symbol)` |
| Clarion template keyword | `#EndFor`, `#Loop`, `#Delete` |

**False positive prevention** eliminates other languages first:
- Brace-based languages (JavaScript, C#, Java, etc.)
- SQL / T-SQL (detects `@vars`, `SELECT…FROM`, `--` comments, etc.)
- Python (colon-terminated block headers)
- Pascal/Delphi (`end;` / `end.` — bare `END` is Clarion-only)

Detection only triggers when pasting **outside** an existing code block.

### 3. Remembered Preferences

After the prompt you can choose to remember your answer:

- **Always wrap** — future pastes are wrapped silently
- **Never wrap** — future pastes are ignored
- **Prompt each time** (default)

A **"Reset Clarion paste preference"** option in the composer's **Options (+)** menu clears the stored choice.

## Installation

1. Go to **Admin → Customize → Themes**
2. Click **Install** → **From a git repository**
3. Enter:
   ```
   https://github.com/msarson/discourse-clarion-code-button
   ```
4. Add the component to your active theme(s)

## Usage

### Manual insertion
1. Open the composer (new post or reply)
2. Click the **</>** icon (tooltip: *Insert Clarion code block*)
3. Type or paste your Clarion code inside the fence

### Smart paste
1. Copy Clarion code from your editor
2. Paste into the composer (outside any existing code block)
3. If Clarion code is detected, a dialog appears with four options:
   - **Wrap** — wraps this paste, asks again next time
   - **Always wrap** — wraps and remembers for all future pastes
   - **Never wrap** — skips and remembers (native paste from now on)
   - **Skip** — skips this paste, asks again next time
   - Pressing **Escape** or clicking outside the dialog acts as Skip

## Technical Details

### Detection algorithm
1. Strip string literals to prevent quoted-content false matches
2. Apply veto filters (brace languages, SQL, Python)
3. Test structural signals in priority order — first match wins

### Preference storage
- `localStorage` key: `clarion-code-button.wrapPreference`
- Values: `"always"` | `"never"` | absent (prompt each time)
- Per-browser, per-device

### Compatibility
- Discourse 2.8.0 or higher
- Works with any theme
- Uses Discourse composer Plugin API 0.8+

## License

MIT — see [LICENSE](LICENSE)

## Contributing

Issues and pull requests welcome at the repository URL.

