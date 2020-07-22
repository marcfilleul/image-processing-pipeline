import { render, RenderOptions } from "ink";
import React from "react";
import { UI } from "../ui";
import { Terminal } from "./Terminal";

const TerminalUi: UI = (state) => {
  const ui = render(<Terminal state={state} />, { exitOnCtrlC: false } as RenderOptions);

  return {
    stop: async () => {
      ui.unmount();
      await ui.waitUntilExit();
    },
  };
};

export default TerminalUi;
