import { withPluginApi } from "discourse/lib/plugin-api";
import I18n from "I18n";

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

export default {
  name: "clarion-code-toolbar-button",

  initialize() {
    console.log("[Clarion] Initializer running");

    withPluginApi("0.8", (api) => {
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
        console.log("[Clarion] composer:opened event fired");

        const composerElement = document.querySelector(".d-editor-input");
        if (!composerElement) {
          console.log("[Clarion] Composer element not found");
          return;
        }

        // Prevent duplicate handlers
        if (composerElement.dataset.clarionPasteHandlerAttached) {
          console.log("[Clarion] Paste handler already attached");
          return;
        }
        composerElement.dataset.clarionPasteHandlerAttached = "true";
        console.log("[Clarion] Paste handler attached successfully");

        const handlePaste = (event) => {
          console.log("[Clarion] Paste event detected");

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
            console.log("[Clarion] Clarion code detected!");

            const composer = api.getCurrentComposer();
            if (!composer) return;

            event.preventDefault();

            if (confirm(I18n.t("js.composer.clarion_code_detected"))) {
              const wrappedText = `\`\`\`clarion\n${pastedText}\n\`\`\``;
              composer.replaceSelection(wrappedText);
            } else {
              composer.replaceSelection(pastedText);
            }
          }
        };

        composerElement.addEventListener("paste", handlePaste);
      });
    });
  }
};
