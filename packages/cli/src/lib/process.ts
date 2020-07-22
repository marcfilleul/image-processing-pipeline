import { Exception, Pipeline, PipelineException, PipelineResult } from "@ipp/common";
import { executePipeline } from "@ipp/core";
import { promises } from "fs";
import { CliContext } from "../cli";
import { Status } from "../model/state";
import { unorderedParallelMap } from "./concurrency";
import { SearchResult } from "./search";
import { basename, parse } from "path";

type Source = { root: string; file: string };
export type ProcessResult = Source & { result: PipelineResult };

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

  return unorderedParallelMap<ProcessResult | Exception, Source>(source, concurrency, async (item) => {
    if (started !== true) {
      task.update(Status.PENDING, "Processing images");
      started = true;
    }

    try {
      const buffer = await promises.readFile(item.root + item.file);

      const { name, ext } = parse(item.file);

      const result = await executePipeline(pipeline, buffer, {
        path: item.file,
        name,
        ext,
      });

      ctx.state.update((state) => ++state.statistics.images.completed);
      return { ...item, result };
    } catch (err) {
      if (isExceptionType<PipelineException>(err, PipelineException)) {
        ctx.state.update((state) => ++state.statistics.images.failed);
        return err;
      }

      throw err;
    }
  });
}

/** A fuzzy instanceof that uses the unique exception name, survives serialisation */
function isExceptionType<T extends Exception>(x: unknown, exception: { name: string }): x is T {
  return (x as T).name === exception.name;
}
