import { render, RenderOptions } from "ink";
import React from "react";
import { UI } from "../ui";
import { Terminal } from "./Terminal";

export const TerminalUi: UI = (ctx) => {
  const ui = render(<Terminal ctx={ctx} />, { exitOnCtrlC: false } as RenderOptions);

  return {
    stop: async () => {
      ui.unmount();
      await ui.waitUntilExit();
    },
  };
};
