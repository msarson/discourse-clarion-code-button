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

function looksLikeBraceLanguage(text) {
  // If we see a brace pair spanning lines, it's not Clarion
  if (/\{[\s\S]*?\n[\s\S]*?\}/.test(text)) {
    return true;
  }

  // If a line ends with {, that's block syntax
  if (/^\s*.*\{\s*$/m.test(text)) {
    return true;
  }

  return false;
}
function looksLikeSql(text) {
  // Strong T-SQL / SQL Server signals
  if (/@[A-Za-z_][A-Za-z0-9_]*/.test(text)) return true;                 // @vars
  if (/\bSET\s+NOCOUNT\s+ON\b/i.test(text)) return true;                // SET NOCOUNT ON
  if (/\b(CREATE|ALTER)\s+PROC(EDURE)?\b/i.test(text)) return true;      // CREATE/ALTER PROC/PROCEDURE
  if (/(\[[^\]\r\n]+\]\s*\.\s*)+\[[^\]\r\n]+\]/.test(text)) return true; // [dbo].[Table] style
  if (/^\s*GO\s*$/im.test(text)) return true;                           // GO on its own line
  if (/--|\/\*/.test(text)) return true;                                // SQL comment styles

  // High-confidence SQL statement shapes (require two to avoid random text)
  const sqlShapeHits = [
    /\bSELECT\b[\s\S]{0,200}\bFROM\b/i.test(text),
    /\bINSERT\s+INTO\b/i.test(text),
    /\bUPDATE\b[\s\S]{0,120}\bSET\b/i.test(text),
    /\bDELETE\s+FROM\b/i.test(text),
    /\bJOIN\b/i.test(text),
    /\bWHERE\b/i.test(text),
    /\bGROUP\s+BY\b/i.test(text),
    /\bORDER\s+BY\b/i.test(text),
  ].filter(Boolean).length;

  return sqlShapeHits >= 2;
}

function detectClarionCode(text) {
  // Early veto: if it looks like a brace language, it's not Clarion
  if (looksLikeBraceLanguage(text) || looksLikeSql(text)) {
    return false;
  }

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
        "This looks like Clarion code. Wrap it in a code block?\n\n(Type 'yes' to remember this choice for future pastes, or leave blank for one-time only)";

      I18n.translations[locale].js.composer.clarion_code_detected_cancel =
        "Don't wrap in a code block?\n\n(Type 'yes' to remember this choice for future pastes, or leave blank for one-time only)";

      I18n.translations[locale].js.composer.clarion_reset_preference =
        "Reset Clarion paste preference";

      api.addComposerToolbarPopupMenuOption({
        id: "clarion-reset-preference",
        label: "js.composer.clarion_reset_preference",
        action() {
          localStorage.removeItem(STORAGE_KEY);
          console.info("Clarion paste preference reset");
        }
      });


      api.onToolbarCreate((toolbar) => {
        toolbar.addButton({
          id: "clarion-code",
          group: "insertions",
          icon: "code",
          title: "js.composer.clarion_code",

          perform(e) {
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

        const handlePaste = (event) => {
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
            let insertText = pastedText;

            if (pref === "always") {
              insertText = `\`\`\`clarion\n${pastedText}\n\`\`\``;
            } else if (pref === "never") {
              insertText = pastedText;
            } else {
              const response = prompt(I18n.t("js.composer.clarion_code_detected"));

              if (response !== null) {
                // User clicked OK
                insertText = `\`\`\`clarion\n${pastedText}\n\`\`\``;
                if (response.trim().toLowerCase() === "yes") {
                  localStorage.setItem(STORAGE_KEY, "always");
                }
              } else {
                // User clicked Cancel - ask if they want to remember "never wrap"
                const neverResponse = prompt(I18n.t("js.composer.clarion_code_detected_cancel"));
                if (neverResponse && neverResponse.trim().toLowerCase() === "yes") {
                  localStorage.setItem(STORAGE_KEY, "never");
                }
              }
            }

            document.execCommand("insertText", false, insertText);
          }
        };

        composerElement.addEventListener("paste", handlePaste);
      });
    });
  }
};