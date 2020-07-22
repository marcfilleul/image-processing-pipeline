import { grey, red } from "chalk";
import { stdout } from "process";
import { startCli } from "./cli";
import { repositoryShort } from "./constants";
import { createBanner } from "./lib/banner";
import { CliException } from "./lib/exception";
import { load } from "./load/load";
import { BULLET, pad, prettifyError } from "./utils";

export async function init(concurrency: number): Promise<void> {
  try {
    stdout.write(createBanner());
    const { config } = await load(concurrency);

    await startCli(config);
  } catch (err) {
    stdout.write(err instanceof Array ? err.map(formatError).join("") : formatError(err));
    stdout.write("\n" + pad(grey("Learn more at " + repositoryShort)) + "\n\n");
    process.exitCode = 1;
  }
}

function formatError(err: Error): string {
  if (err instanceof CliException) {
    const { title, comment } = err;

    const heading = "\n" + red.bold(`${BULLET} ${title ? title : "CLI Exception"}`) + "\n\n";
    const body = comment ? pad(red(comment)) + "\n\n" : "";

    return pad(heading + body);
  }

  const error = red(err instanceof Error ? prettifyError(err) : "A non-Error like object was thrown") + "\n";
  const message = "This should not have happened.\nIf you feel that this was in error, consider opening a new issue\n";

  return pad(error + message);
}
