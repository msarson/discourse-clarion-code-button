# Discourse Clarion Code Button

A Discourse theme component that adds a toolbar button to the composer for inserting Clarion code blocks.

## What it does

Adds a custom button (📝 with code icon) to the Discourse composer toolbar that inserts a fenced code block pre-configured for Clarion syntax:

````clarion
```clarion

```
````

The cursor is automatically positioned inside the code block, ready for you to paste or type Clarion code.

### Automatic Clarion Detection

When you paste code into the composer, the plugin automatically detects Clarion code and offers to wrap it in a proper code fence:

- Detects Clarion-specific keywords, syntax patterns, and comment styles
- Shows a confirmation dialog: "This looks like Clarion code. Wrap it in a Clarion code block?"
- Click **OK** to wrap in ````clarion` fences, or **Cancel** to paste as-is
- Only triggers when pasting outside existing code blocks
- Uses modern Discourse composer APIs for reliable insertion across desktop and mobile

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
3. Type or paste your Clarion code

### Automatic detection
1. Copy Clarion code from your editor or elsewhere
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
