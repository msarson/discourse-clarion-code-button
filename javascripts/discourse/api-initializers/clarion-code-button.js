import { withPluginApi } from "discourse/lib/plugin-api";
import I18n from "I18n";

const STORAGE_KEY = "clarion-code-button.wrapPreference";

function getClarionKeywords() {
  // Extract keywords from the highlighter definition patterns
  const hardKeywords = "ACCEPT|AND|BREAK|BY|CASE|CHOOSE|CYCLE|DO|ELSE|ELSIF|END|EXECUTE|EXIT|FUNCTION|GOTO|IF|LOOP|MEMBER|NEW|NOT|OF|OR|OROF|PARENT|PROCEDURE|PROGRAM|RETURN|ROUTINE|SELF|THEN|TIMES|TO|UNTIL|WHILE";
  const softKeywords = "APPLICATION|CLASS|CODE|DATA|DETAIL|ENUM|FILE|FOOTER|FORM|GROUP|HEADER|INLINE|ITEM|JOIN|MAP|MENU|MENUBAR|MODULE|OLECONTROL|OPTION|QUEUE|RECORD|REPORT|ROW|SHEET|TAB|TABLE|TOOLBAR|VIEW|WINDOW|PROPERTY|INDEXER";
  const types = "ANY|ASTRING|BOOL|BYTE|CSTRING|DATE|DECIMAL|DOUBLE|FLOAT4|LONG|PSTRING|REAL|SHORT|SIGNED|STRING|TIME|ULONG|UNSIGNED|USHORT|FILE|QUEUE|GROUP|ARRAY";
  const functions = "ADD|DISPOSE|ADDRESS|GET|PUT|OPEN|CLOSE|LOCK|UNLOCK|MESSAGE|CLEAR|FREE|SET|SEND|POST|FILEERROR|FILEERRORCODE|RANDOM|DAY|YEAR|MONTH|INSTRING|MATCH|LEN|UPPER|LOWER|LEFT|RIGHT|SUB|TODAY|FORMAT|INT|ABS";

  return [hardKeywords, softKeywords, types, functions];
}

function detectClarionCode(text) {
  const [hardKeywords, softKeywords, types, functions] = getClarionKeywords();

  // Count occurrences of keywords in each group
  const countMatches = (keywordGroup) => {
    const regex = new RegExp(`\\b(${keywordGroup})\\b`, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  };

  const hardCount = countMatches(hardKeywords);
  const softCount = countMatches(softKeywords);
  const typeCount = countMatches(types);
  const functionCount = countMatches(functions);

  // Apply weights: hard=4, soft=2, types=2, functions=1
  const score = (hardCount * 4) + (softCount * 2) + (typeCount * 2) + (functionCount * 1);

  // Threshold tuned for short fragments and full blocks
  return score >= 8;
}

function showClarionPasteDialog() {
  return new Promise((resolve) => {
    const dialog = document.createElement("div");
    dialog.className = "clarion-paste-dialog";
    dialog.innerHTML = `
      <div class="clarion-paste-overlay"></div>
      <div class="clarion-paste-modal">
        <h3>Clarion Code Detected</h3>
        <p>This looks like Clarion code. Would you like to wrap it in a code block?</p>
        <div class="clarion-paste-buttons">
          <button class="btn btn-primary clarion-paste-yes">Yes, Wrap It</button>
          <button class="btn clarion-paste-no">No, Paste As-Is</button>
        </div>
        <div class="clarion-paste-remember">
          <label>
            <input type="checkbox" class="clarion-paste-checkbox" />
            Remember my choice
          </label>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const handleChoice = (shouldWrap) => {
      const remember = dialog.querySelector(".clarion-paste-checkbox").checked;
      document.body.removeChild(dialog);
      resolve({ shouldWrap, remember });
    };

    dialog.querySelector(".clarion-paste-yes").addEventListener("click", () => handleChoice(true));
    dialog.querySelector(".clarion-paste-no").addEventListener("click", () => handleChoice(false));
  });
}

export default {
  name: "clarion-code-toolbar-button",

  initialize() {
    withPluginApi("0.8", (api) => {
      const pluginApi = api;
      const locale = I18n.currentLocale();

      I18n.translations[locale] ||= {};
      I18n.translations[locale].js ||= {};
      I18n.translations[locale].js.composer ||= {};

      I18n.translations[locale].js.composer.clarion_code =
        "Insert Clarion code block";

      I18n.translations[locale].js.composer.clarion_code_placeholder =
        "Clarion code here";

      I18n.translations[locale].js.composer.clarion_code_detected =
        "This looks like Clarion code. Wrap it in a Clarion code block?";

      api.onToolbarCreate((toolbar) => {
        toolbar.addButton({
          id: "clarion-code",
          group: "insertions",
          icon: "code",
          title: "js.composer.clarion_code",

          perform(e) {
            // Check if Shift key is held - if so, reset the preference
            if (window.event && window.event.shiftKey) {
              localStorage.removeItem(STORAGE_KEY);
              // Show a brief confirmation
              const btn = document.querySelector('[data-id="clarion-code"]');
              if (btn) {
                const originalTitle = btn.getAttribute('title');
                btn.setAttribute('title', 'Paste preference reset!');
                setTimeout(() => btn.setAttribute('title', originalTitle), 2000);
              }
              return;
            }

            e.applySurround(
              "```clarion\n",
              "\n```",
              "clarion_code_placeholder",
              {
                multiline: false,
                useBlockMode: true
              }
            );
          }
        });
      });

      // Add paste handler
      api.onAppEvent("composer:opened", () => {
        const composerElement = document.querySelector(".d-editor-input");
        if (!composerElement) {
          return;
        }

        // Prevent duplicate handlers
        if (composerElement.dataset.clarionPasteHandlerAttached) {
          return;
        }
        composerElement.dataset.clarionPasteHandlerAttached = "true";

        const handlePaste = async (event) => {
          const pastedText = event.clipboardData.getData("text/plain");
          const trimmedText = pastedText ? pastedText.trim() : "";

          // Ignore empty or whitespace-only pastes
          if (!trimmedText) return;

          // Check if cursor is inside a fenced code block
          const textarea = event.target;
          const text = textarea.value;
          const cursorPos = textarea.selectionStart;
          const textBeforeCursor = text.substring(0, cursorPos);

          // Count backtick fence markers before cursor
          const fenceMatches = textBeforeCursor.match(/^```/gm);
          const fenceCount = fenceMatches ? fenceMatches.length : 0;

          // If odd number of fences, we're inside a code block
          if (fenceCount % 2 === 1) return;

          if (detectClarionCode(trimmedText)) {
            event.preventDefault();

            const pref = localStorage.getItem(STORAGE_KEY);
            const shiftPressed = event.shiftKey;
            let insertText = pastedText;

            // If Shift is held, always show dialog regardless of preference
            if (pref === "always" && !shiftPressed) {
              insertText = `\`\`\`clarion\n${pastedText}\n\`\`\``;
            } else if (pref === "never" && !shiftPressed) {
              insertText = pastedText;
            } else {
              const { shouldWrap, remember } = await showClarionPasteDialog();

              if (shouldWrap) {
                insertText = `\`\`\`clarion\n${pastedText}\n\`\`\``;
                if (remember) {
                  localStorage.setItem(STORAGE_KEY, "always");
                }
              } else {
                if (remember) {
                  localStorage.setItem(STORAGE_KEY, "never");
                }
              }
            }

            // Manually insert text since we're outside the trusted event context
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const beforeText = textarea.value.substring(0, start);
            const afterText = textarea.value.substring(end);

            textarea.value = beforeText + insertText + afterText;
            textarea.selectionStart = textarea.selectionEnd = start + insertText.length;

            // Trigger input event to ensure Discourse updates
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
          }

        };

        composerElement.addEventListener("paste", handlePaste);
      });
    });
  }
};
