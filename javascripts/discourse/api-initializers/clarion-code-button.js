import { withPluginApi } from "discourse/lib/plugin-api";
import I18n from "I18n";
import { detectClarionCode } from "discourse/lib/clarion-detection";

const STORAGE_KEY = "clarion-code-button.wrapPreference";

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
        "This looks like Clarion code. Wrap it in a code block?\n\nType 'always' to always wrap, 'never' to never wrap, or leave blank for one-time only.\nClick OK to wrap this time, Cancel to skip this time.";

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
          group: "extras",
          icon: "code",
          title: "js.composer.clarion_code",

          perform(e) {
            const selected = e.selected;
            const hasSelection = selected && selected.value && selected.value.length > 0;

            e.applySurround(
              hasSelection ? "```clarion" : "```clarion\n",
              hasSelection ? "```" : "\n```",
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
                // User clicked OK - wrap the code this time
                const answer = response.trim().toLowerCase();
                insertText = `\`\`\`clarion\n${pastedText}\n\`\`\``;

                if (answer === "always") {
                  localStorage.setItem(STORAGE_KEY, "always");
                } else if (answer === "never") {
                  localStorage.setItem(STORAGE_KEY, "never");
                }
              }
              // User clicked Cancel - don't wrap (insertText stays as pastedText)
            }

            document.execCommand("insertText", false, insertText);
          }
        };

        composerElement.addEventListener("paste", handlePaste);
      });
    });
  }
};