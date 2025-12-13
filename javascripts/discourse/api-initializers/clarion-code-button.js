import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.8.0", (api) => {
  api.onToolbarCreate((toolbar) => {
    toolbar.addButton({
      id: "clarion-code-button",
      group: "insertions",
      icon: "code",
      label: "clarion_code_button.title",
      shortcut: "",
      perform: (e) => {
        const text = "```clarion\n\n```";
        e.addText(text);
        e.selected.value = "";
        
        // Position cursor inside the code block (after newline, before closing backticks)
        const cursorOffset = -4; // 3 backticks + 1 newline
        e.toolbar.context.setSelection(
          e.selected.start + text.length + cursorOffset,
          e.selected.start + text.length + cursorOffset
        );
      },
    });
  });
});
