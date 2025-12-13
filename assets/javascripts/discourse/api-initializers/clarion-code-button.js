import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "clarion-code-button",

  initialize() {
    withPluginApi("0.8.7", (api) => {
      api.addComposerToolbarPopupMenuOption({
        id: "clarion_code",
        group: "insertions",
        icon: "code",
        label: "js.composer.clarion_code",
        action(toolbarEvent) {
          toolbarEvent.applySurround(
            "```clarion\n",
            "\n```",
            "js.composer.clarion_code_placeholder"
          );
        }
      });
    });
  }
};
