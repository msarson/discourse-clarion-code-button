# Discourse Clarion Code Button

A Discourse theme component that adds a toolbar button to the composer for inserting Clarion code blocks.

## What it does

Adds a custom button (📝 with code icon) to the Discourse composer toolbar that inserts a fenced code block pre-configured for Clarion syntax:

````clarion
```clarion

```
````

The cursor is automatically positioned inside the code block, ready for you to paste or type Clarion code.

## Installation

1. Go to your Discourse admin panel
2. Navigate to **Customize → Themes**
3. Click **Install** and select **From a git repository**
4. Enter the repository URL:
   ```
   https://github.com/clarionhub/discourse-clarion-code-button
   ```
5. Click **Install**
6. Add the component to your active theme(s)

## Usage

When composing a post or reply:

1. Click the **</>** code icon in the toolbar (tooltip: "Insert Clarion code block")
2. The component inserts a Clarion code fence with your cursor positioned inside
3. Type or paste your Clarion code
4. Continue editing your post

## Requirements

- Discourse 2.8.0 or higher
- Works with any theme

## License

MIT License - See LICENSE file

## Contributing

Issues and pull requests welcome at the repository URL.
