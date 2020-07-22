import { bold } from "chalk";
import leven from "leven";
import { env } from "process";
import yargs from "yargs";
import { repository, version } from "../constants";
import { CliException, CliExceptionCode } from "../lib/exception";

export interface Args {
  input?: string;
  output?: string;
  config?: string;
  silent?: boolean;
  default?: boolean;
  text?: boolean;
  debug?: boolean;
}

const options = {
  input: {
    type: "string",
    alias: "i",
    description: "The folder containing source images",
  },

  output: {
    type: "string",
    alias: "o",
    description: "The folder to output images to",
  },

  config: {
    type: "string",
    alias: "c",
    description: "The path to the IPP config file",
  },
} as const;

const usage = "Usage: ipp [--config=<pathToConfigFile>]";

export async function parseArgs(): Promise<Args> {
  const { argv } = yargs.options(options).usage(usage).version(version).epilogue(repository);
  return argv;
}

export function validateArgs(args: Args): void {
  const allowedOptions = Object.entries(options).reduce<string[]>((p, [key, schema]) => {
    p.push(key);
    if ("alias" in schema) p.push(schema.alias);
    return p;
  }, []);

  for (const key of Object.keys(args)) {
    if (key === "_" || key === "$0") continue;

    if (allowedOptions.indexOf(key) !== -1) continue;

    throw new CliException(
      `Unrecognised CLI flag "${key}"`,
      CliExceptionCode.ARG_VALIDATION,
      `Unrecognised CLI flag: "${key}"`,
      `Run ${bold("ipp --help")} to get a list of allowed parameters` + createDidYouMeanMessage(key, allowedOptions)
    );
  }
}

export const createDidYouMeanMessage = (unrecognised: string, allowedOptions: string[]): string => {
  const suggestion = allowedOptions.find((option) => {
    const steps: number = leven(option, unrecognised);
    return steps < 3;
  });

  return suggestion ? `\n\nDid you mean ${bold(suggestion)}?` : "";
};
