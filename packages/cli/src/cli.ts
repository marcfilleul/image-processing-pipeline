import { createInterruptHandler, InterruptException, InterruptHandler } from "./lib/interrupt";
import { processImages } from "./lib/process";
import { saveImages } from "./lib/save_images";
import { searchForImages } from "./lib/search";
import { Config } from "./load/config";
import { createState, Stage, StateContext } from "./model/state";
import { UI, UiContext } from "./ui";
import TerminalUi from "./ui/terminal";

const DEFAULT_UI = TerminalUi;

export interface CliOptions {
  ui?: UI;
}

export interface CliContext {
  interrupt: InterruptHandler;
  ui: UiContext;
  state: StateContext;
}

export async function startCli(config: Config, options: CliOptions = {}): Promise<void> {
  const ctx = createContext(config.concurrency, options.ui);

  try {
    ctx.state.update((state) => (state.stage = Stage.PROCESSING));

    ctx.interrupt.rejecter.catch(() => {
      ctx.state.update((state) => state.stage === Stage.INTERRUPT);
    });

    const paths = config.input instanceof Array ? config.input : [config.input];
    const images = await searchForImages(ctx, paths);
    const results = processImages(ctx, config.pipeline, images, config.concurrency);
    await saveImages(ctx, config, results);

    ctx.state.update((state) => (state.stage = ctx.interrupt.rejected() ? Stage.INTERRUPT : Stage.DONE));
  } catch (err) {
    if (!(err instanceof InterruptException)) {
      ctx.state.update((state) => {
        state.stage = Stage.ERROR;
        state.message = `Error: ${err.message || "<no message>"}`;
      });
      throw err;
    }

    ctx.state.update((state) => {
      if (!ctx.interrupt.rejected()) state.stage = Stage.DONE;
    });
  } finally {
    ctx.state.complete();
    await ctx.ui.stop();
    ctx.interrupt.destroy();
  }
}

function createContext(concurrency: number, ui?: UI): CliContext {
  const interrupt = createInterruptHandler();
  const state = createState(concurrency);

  const off = false;
  let uiContext: UiContext;

  if (!off) {
    uiContext = (ui || DEFAULT_UI)(state.observable);
  } else {
    uiContext = {
      stop: async () => void 0,
    };
  }

  return { interrupt, ui: uiContext, state };
}
