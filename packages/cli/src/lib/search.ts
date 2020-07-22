import Denque from "denque";
import { promises } from "fs";
import { parse, posix } from "path";
import { CliContext } from "../cli";
import { Status } from "../model/state";
import { sleep } from "../utils";
import { CliException, CliExceptionCode } from "./exception";
import { InterruptHandler, InterruptException } from "./interrupt";

const TASK_ID = "image_search";

const SUPPORTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "tiff", "gif", "svg"];

export interface SearchResult {
  root: string;
  files?: string[];
}

export async function searchForImages(ctx: CliContext, paths: string[]): Promise<SearchResult[]> {
  const task = ctx.state.tasks.add(TASK_ID, Status.PENDING, "Searching for images");

  let count = 0;
  const increment = () => {
    ++count;
  };

  let interval: NodeJS.Timeout | null = null;
  try {
    interval = setInterval(() => task.update(void 0, `Found ${count} images`), 200);

    const results = await Promise.all(paths.map((path) => searchPath(path, ctx.interrupt, increment)));
    task.update(Status.COMPLETE, `Found ${count} images`);
    clearInterval(interval);
    interval = null;

    ctx.state.update((state) => (state.statistics.images.total = count));
    return results;
  } catch (err) {
    task.update(Status.ERROR, "Search for images");
    throw err;
  } finally {
    // Executes synchronously before the event loop is freed for the interval callback
    if (interval !== null) clearInterval(interval);
  }
}

async function searchPath(path: string, interrupt: InterruptHandler, increment: () => void): Promise<SearchResult> {
  try {
    const stat = await promises.stat(path);

    if (stat.isFile()) {
      return {
        root: path,
      };
    }

    if (stat.isDirectory()) {
      const normalisedPath = posix.normalize(path + "/");
      const extMap = new Set<string>(SUPPORTED_EXTENSIONS.map((x) => `.${x}`));

      const files = [] as string[];
      const queue = new Denque<string>();

      queue.push("");

      // Walks nested structures using a loop and a queue on the heap
      // Recursion might cause a stack overflow
      while (queue.length > 0) {
        if (interrupt.rejected()) await interrupt.rejecter;

        const nestedDir = queue.shift();

        const openedDir = await promises.opendir(normalisedPath + nestedDir);

        // Asynchronously iterating over the open directory
        // will automatically close the descriptor, even on error
        for await (const entry of openedDir) {
          if (entry.isFile()) {
            if (extMap.has(parse(entry.name).ext)) {
              files.push(nestedDir + entry.name);
              increment();
            }
          } else if (entry.isDirectory()) {
            queue.push(nestedDir + entry.name + posix.sep);
          }
        }
      }

      return {
        root: normalisedPath,
        files,
      };
    }
  } catch (err) {
    if (err instanceof InterruptException) throw err;

    throw new CliException(
      "Search error: " + err.message || "<unknown message>",
      CliExceptionCode.SEARCH,
      "Image search failed",
      "The following message was thrown:\n" + err.message
    ).extend(err);
  }

  throw new CliException(
    "Invalid path: " + path,
    CliExceptionCode.SEARCH,
    "Invalid input path",
    "The given path was not a file or a directory:\n" + path
  );
}
