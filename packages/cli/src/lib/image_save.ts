/**
 * Image Processing Pipeline - Copyright (c) Marcus Cemes
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Exception, mapMetadata, Metadata, PipelineFormats } from "@ipp/common";
import { promises } from "fs";
import produce from "immer";
import { basename, dirname, normalize } from "path";
import { CliContext } from "../cli";
import { DEFAULT_LIBUV_THREADPOOL } from "../constants";
import { Config } from "../init/config";
import { Status, TaskContext } from "../model/state";
import { unorderedParallelMap } from "./concurrency";
import { CliException, CliExceptionCode } from "./exception";
import { ProcessResult } from "./image_process";

const TASK_ID = "save_images";

const EXPRESSION_BRACES = "[]";
const EXPRESSION_MATCHER = /\[([a-zA-Z0-9:._-]+)\]/g;

export function saveImages(
  ctx: CliContext,
  config: Config,
  images: AsyncIterable<ProcessResult | Exception>
): AsyncIterable<ProcessResult | Exception> {
  let started = false;
  const task = ctx.state.tasks.add(TASK_ID, Status.WAITING, "Save images");

  const startTime = Date.now();

  const output = normalize(config.output + "/");
  const saved = unorderedParallelMap(images, DEFAULT_LIBUV_THREADPOOL, async (result) => {
    if (started !== true) {
      task.update(Status.PENDING, "Saving images");
      started = true;
    }

    if (isProcessResult(result)) {
      const updatedFormats: PipelineFormats = [];

      for (const format of result.result.formats) {
        const relativeDir = config.flat ? "" : dirname(result.file) + "/";
        const cleanRelativeDir = relativeDir[0] === "." ? relativeDir.substr(2) : relativeDir;

        // Generate the filename from the save key
        const name =
          typeof format.saveKey === "string"
            ? interpolateName(
                produce(format.data.metadata, ({ current }) => {
                  current.ext = formatToExt(format.data.metadata.current.format);
                  current.dir = cleanRelativeDir;
                }),
                format.saveKey
              )
            : basename(result.file);

        const relativePath = cleanRelativeDir + name;
        const writePath = output + relativePath;
        await promises.mkdir(dirname(writePath), { recursive: true });

        try {
          const stat = await promises.stat(writePath);
          if (stat.mtimeMs > startTime) {
            return new CliException(
              "Filename collision",
              CliExceptionCode.SAVE,
              `Filename collision for "${relativePath}"`,
              "An image output filename was written to since the start of execution and probably indicates an filename collision."
            );
          }
        } catch {
          /* */
        }

        await promises.writeFile(writePath, format.data.buffer);

        // Update the metadata of formats for the manifest
        updatedFormats.push(
          produce(
            format,
            ({
              data: {
                metadata: { current },
              },
            }) => {
              current.path = relativePath;
            }
          )
        );
      }

      // Return the process result with updated path metadata
      return produce(result, (draft) => {
        draft.result.formats = updatedFormats;
      });
    }

    return result;
  });

  return completion(task, saved);
}

async function* completion(task: TaskContext, results: AsyncIterable<ProcessResult | Exception>) {
  for await (const item of results) {
    yield item;
  }

  task.update(Status.COMPLETE, "Images saved");
}

function interpolateName(metadata: Metadata, name: string): string {
  const expressions: Record<string, string> = {};

  // Extract all template expressions into a object
  let match: RegExpExecArray | null;
  while ((match = EXPRESSION_MATCHER.exec(name)) !== null) {
    expressions[match[1]] = match[1];
  }

  const mappedExpressions = mapMetadata(metadata, expressions);

  // Replace each expression with its mapped value
  let newName = name;
  const [l, r] = EXPRESSION_BRACES;
  for (const [key, value] of Object.entries(mappedExpressions)) {
    newName = newName.replace(new RegExp(`\\${l}${key}\\${r}`, "g"), String(value));
  }

  return newName;
}

const EXTENSION_MAP: Record<string, string> = {
  jpeg: ".jpg",
  png: ".png",
  webp: ".webp",
  svg: ".svg",
  tiff: ".tiff",
  gif: ".gif",
};

function formatToExt(format: string): string {
  return EXTENSION_MAP[format] || "";
}

function isProcessResult(x: unknown): x is ProcessResult {
  for (const prop of ["file", "root", "result"]) {
    if (!(prop in (x as ProcessResult))) {
      return false;
    }
  }

  return true;
}