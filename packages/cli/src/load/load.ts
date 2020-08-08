import { Args, parseArgs, validateArgs } from "./args";
import { Config, getConfig } from "./config";

/** Parses CLI flags and loads the configuration */
export async function load(concurrency: number): Promise<{ args: Args; config: Config }> {
  const args = await parseArgs();
  validateArgs(args);

  const initialConfig: Partial<Config> = {
    concurrency,
  };

  if (args.input) initialConfig.input = args.input;
  if (args.output) initialConfig.output = args.output;

  const config = await getConfig(initialConfig, args.config);

  return { args, config };
}
