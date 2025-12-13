import { withPluginApi } from "discourse/lib/plugin-api";
import I18n from "I18n";

export default {
  name: "clarion-code-toolbar-button",

  initialize() {
    withPluginApi("0.8", (api) => {
      const locale = I18n.currentLocale();

      I18n.translations[locale] ||= {};
      I18n.translations[locale].js ||= {};
      I18n.translations[locale].js.composer ||= {};

      I18n.translations[locale].js.composer.clarion_code =
        "Insert Clarion code block";

      I18n.translations[locale].js.composer.clarion_code_placeholder =
        "Clarion code here";

      api.onToolbarCreate((toolbar) => {
        toolbar.addButton({
          id: "clarion-code",
          group: "insertions", // or "formatting"
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
    });
  }
};
