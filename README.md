# Discourse Clarion Code Button

A Discourse theme component that adds a toolbar button to the composer for inserting Clarion code blocks, with intelligent paste detection and memory features.

## Features

### 1. Manual Clarion Code Insertion

Adds a custom button (📝 with code icon) to the Discourse composer toolbar that inserts a fenced code block pre-configured for Clarion syntax:

````clarion
```clarion

```
````

The cursor is automatically positioned inside the code block, ready for you to paste or type Clarion code.

### 2. Automatic Clarion Detection on Paste

When you paste code into the composer, the component intelligently detects Clarion code and offers to wrap it:

- **Smart detection** using weighted keyword analysis:
  - Hard keywords (IF, LOOP, PROCEDURE, etc.) - weight: 4
  - Soft keywords (CLASS, CODE, FILE, QUEUE, etc.) - weight: 2
  - Data types (STRING, LONG, REAL, etc.) - weight: 2
  - Built-in functions (ADD, GET, OPEN, etc.) - weight: 1
  - Detection threshold: score ≥ 8

- **False positive prevention**:
  - Automatically rejects brace-based languages (JavaScript, C#, Java, etc.)
  - Filters out SQL/T-SQL patterns
  - Excludes Python code (colon-terminated blocks)
  - Strips string literals before analysis to avoid false matches

- **Context awareness**: Only triggers when pasting outside existing code blocks

### 3. Rememberable Preferences

The prompt now includes an option to remember your choice:
### Manual Insertion
1. Open the Discourse composer (new post or reply)
2. Click the **</>** code icon in the toolbar (tooltip: "Insert Clarion code block")
3. The component inserts a Clarion code fence with your cursor positioned inside
4. Type or paste your Clarion code

### Smart Paste Detection
1. Copy Clarion code from your editor or elsewhere
2. Paste into the composer (outside any existing code blocks)
3. If Clarion code is detected, a prompt appears
4. Choose your action:
   - **Wrap once**: Leave the input blank, click OK
   - **Always wrap**: Type `yes`, click OK
   - **Don't wrap once**: Click Cancel, then leave input blank
   - **Never wrap**: Click Cancel, type `yes` in follow-up prompt

### Managing Preferences
- Once you've saved a preference (always/never wrap), the option appears in the **Options (+)** menu
- Click "Reset Clarion paste preference" to clear your choice
- You'll be prompted again on the next paste
**Resetting preferences:**
- When a preference is stored, a "Reset Clarion paste preference" option appears in the composer toolbar's **Options (+)** popup menu
- Click it to clear your saved preference and return to being prompted on each paste

## Installation

1. Go to your Discourse admin panel
2. Navigate to **Customize → Themes**
3. Click **Install** and select **From a git repository**
4. Enter the repository URL:
   ```
   https://github.com/msarson/discourse-clarion-code-button
   ```
5. Click **Install**
6. Add the component to your active theme(s)

## Usage

When composing a post or reply:

### Manual insertion
1. Click the **</>** code icon in the toolbar (tooltip: "Insert Clarion code block")
2. The component inserts a Clarion code fence with your cursor positioned inside
3. Technical Details

### Detection Algorithm
1. Strips string literals to avoid false positives from quoted text
2. Applies language-specific veto filters (braces, SQL, Python)
3. Counts Clarion-specific keywords with weighted scoring
4. Requires minimum score of 8 to trigger detection

### Storage
- Preferences are stored in browser `localStorage` under key: `clarion-code-button.wrapPreference`
- Values: `"always"`, `"never"`, or absent (prompt each time)
- Per-browser, per-device setting

### Compatibility
- Discourse 2.8.0 or higher
- Works with any theme
- Uses modern Discourse composer APIs (0.8+)
- Desktop and mobile compatiblfrom your editor or elsewhere
2. Paste into the composer (outside any existing code blocks)
3. If Clarion code is detected, confirm the prompt to automatically wrap it
4. Continue editing your post

## Requirements

- Discourse 2.8.0 or higher
- Works with any theme

## License

MIT License - See LICENSE file

## Contributing

Issues and pull requests welcome at the repository URL.
