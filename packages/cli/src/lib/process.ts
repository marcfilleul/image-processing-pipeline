import { Exception, Pipeline, PipelineException, PipelineResult } from "@ipp/common";
import { executePipeline } from "@ipp/core";
import { promises } from "fs";
import { parse } from "path";
import { CliContext } from "../cli";
import { Status } from "../model/state";
import { unorderedParallelMap } from "./concurrency";
import { SearchResult } from "./search";

type Source = { root: string; file: string };
export type ProcessResult = Source & { result: PipelineResult };

const INTERVAL = 200;
const TASK_ID = "image_process";

export function processImages(
  ctx: CliContext,
  pipeline: Pipeline,
  results: SearchResult[],
  concurrency: number
): AsyncIterable<ProcessResult | Exception> {
  let started = false;
  const task = ctx.state.tasks.add(TASK_ID, Status.WAITING, "Process images");

  const source = (function* () {
    for (const result of results) {
      const files = typeof result.files !== "undefined" ? result.files : [""];

      for (const file of files) {
        // End the stream of files
        if (ctx.interrupt.rejected()) {
          task.update(Status.ERROR, "Processing interrupted");
          return;
        }

        yield { root: result.root, file };
      }
    }

    task.update(Status.COMPLETE, "Processed images");
  })();

  let completed = 0;
  let failed = 0;

  const processResults = unorderedParallelMap<ProcessResult | Exception, Source>(
    source,
    concurrency,
    async (item) => {
      if (started !== true) {
        task.update(Status.PENDING, "Processing images");
        started = true;
      }

      try {
        const buffer = await promises.readFile(item.root + item.file);
        const { name, ext } = parse(item.file);

        const result = await executePipeline(pipeline, buffer, {
          ext,
          path: item.file,
          name,
          sourceExt: ext,
          sourcePath: item.file,
        });

        ++completed;
        return { ...item, result };
      } catch (err) {
        ++failed;

        if (isExceptionType<PipelineException>(err, PipelineException)) return err;
        throw err;
      }
    }
  );

  const interval = setInterval(() => {
    ctx.state.update((state) => {
      state.stats.images.completed = completed;
      state.stats.images.failed = failed;
    });
  }, INTERVAL);

  return (async function* () {
    for await (const result of processResults) {
      yield result;
    }

    clearInterval(interval);
    ctx.state.update((state) => {
      state.stats.images.completed = completed;
      state.stats.images.failed = failed;
    });
  })();
}

/** A fuzzy instanceof that uses the unique exception name, survives serialisation */
function isExceptionType<T extends Exception>(x: unknown, exception: { name: string }): x is T {
  return (x as T).name === exception.name;
}
