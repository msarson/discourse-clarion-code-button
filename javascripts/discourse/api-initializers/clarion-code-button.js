import { withPluginApi } from "discourse/lib/plugin-api";
import I18n from "I18n";
import { detectClarionCode } from "../lib/clarion-detection";

const STORAGE_KEY = "clarion-code-button.wrapPreference";

// Insert text at the captured selection point, then notify Ember of the change.
// Uses setRangeText (reliable after async dialog) rather than execCommand.
function doInsert(textarea, text, selStart, selEnd) {
  if (!textarea?.isConnected) return;
  textarea.focus();
  textarea.setRangeText(text, selStart, selEnd, "end");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
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
      I18n.translations[locale].js.composer.clarion_dialog_title =
        "Clarion code detected";
      I18n.translations[locale].js.composer.clarion_dialog_message =
        "This looks like Clarion code. Would you like to wrap it in a code block?";
      I18n.translations[locale].js.composer.clarion_wrap =
        "Wrap";
      I18n.translations[locale].js.composer.clarion_wrap_always =
        "Always wrap";
      I18n.translations[locale].js.composer.clarion_skip_never =
        "Never wrap";
      I18n.translations[locale].js.composer.clarion_skip =
        "Skip";
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
              { multiline: false, useBlockMode: true }
            );
          }
        });
      });

      // Add paste handler
      let pastePromptOpen = false;

      api.onAppEvent("composer:opened", () => {
        const composerElement = document.querySelector(".d-editor-input");
        if (!composerElement) return;

        // Prevent duplicate handlers
        if (composerElement.dataset.clarionPasteHandlerAttached) return;
        composerElement.dataset.clarionPasteHandlerAttached = "true";

        const handlePaste = (event) => {
          const pastedText = event.clipboardData.getData("text/plain");
          const trimmedText = pastedText ? pastedText.trim() : "";

          if (!trimmedText) return;

          const textarea = event.target;
          const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
          const fenceCount = (textBeforeCursor.match(/^```/gm) || []).length;

          // Inside a code block — leave native paste alone
          if (fenceCount % 2 === 1) return;

          if (!detectClarionCode(trimmedText)) return;

          const pref = localStorage.getItem(STORAGE_KEY);

          // "never" — let browser handle paste natively, no intervention
          if (pref === "never") return;

          // From here we intercept the paste
          event.preventDefault();

          // Capture insertion point before any async work
          const selStart = textarea.selectionStart;
          const selEnd = textarea.selectionEnd;

          if (pref === "always") {
            doInsert(textarea, `\`\`\`clarion\n${pastedText}\n\`\`\``, selStart, selEnd);
            return;
          }

          // Avoid stacking multiple dialogs from rapid pastes
          if (pastePromptOpen) return;
          pastePromptOpen = true;

          const dialog = pluginApi.container.lookup("service:dialog");
          if (!dialog) {
            // Fallback: no dialog service — just insert plain
            pastePromptOpen = false;
            doInsert(textarea, pastedText, selStart, selEnd);
            return;
          }

          const wrap = () => doInsert(textarea, `\`\`\`clarion\n${pastedText}\n\`\`\``, selStart, selEnd);
          const skip = () => doInsert(textarea, pastedText, selStart, selEnd);
          let handled = false;

          dialog.dialog({
            title: I18n.t("js.composer.clarion_dialog_title"),
            message: I18n.t("js.composer.clarion_dialog_message"),
            type: "confirm",
            // Escape / backdrop: paste already intercepted, insert plain text.
            // 'handled' prevents double-insert since handleButtonAction also
            // calls cancel() after each button, which would trigger didCancel.
            didCancel: () => { pastePromptOpen = false; if (!handled) skip(); },
            buttons: [
              {
                label: I18n.t("js.composer.clarion_wrap"),
                class: "btn-primary",
                action() { pastePromptOpen = false; handled = true; wrap(); },
              },
              {
                label: I18n.t("js.composer.clarion_wrap_always"),
                class: "btn-default",
                action() {
                  pastePromptOpen = false; handled = true;
                  localStorage.setItem(STORAGE_KEY, "always");
                  wrap();
                },
              },
              {
                label: I18n.t("js.composer.clarion_skip_never"),
                class: "btn-default",
                action() {
                  pastePromptOpen = false; handled = true;
                  localStorage.setItem(STORAGE_KEY, "never");
                  skip();
                },
              },
              {
                label: I18n.t("js.composer.clarion_skip"),
                class: "btn-default",
                action() { pastePromptOpen = false; handled = true; skip(); },
              },
            ],
          });
        };

        composerElement.addEventListener("paste", handlePaste);
      });
    });
  }
};