import { Exception, mapTemplate, Metadata } from "@ipp/common";
import { promises } from "fs";
import { basename, dirname, normalize } from "path";
import { CliContext } from "../cli";
import { Config } from "../load/config";
import { Status } from "../model/state";
import { unorderedParallelMap } from "./concurrency";
import { ProcessResult } from "./process";

const LIBUV_THREADS = 4;
const TASK_ID = "save_images";

const EXPRESSION_MATCHER = /{{([a-zA-Z0-9_-]+)}}/g;

export async function saveImages(
  ctx: CliContext,
  config: Config,
  images: AsyncIterable<ProcessResult | Exception>
): Promise<void> {
  let started = false;
  const task = ctx.state.tasks.add(TASK_ID, Status.WAITING, "Save images");

  const output = normalize(config.output + "/");
  const saved = unorderedParallelMap(images, LIBUV_THREADS, async (result) => {
    if (started !== true) {
      task.update(Status.PENDING, "Saving images");
      started = true;
    }

    if (!("name" in result)) {
      for (const format of result.result.formats) {
        const name =
          typeof format.saveKey === "string"
            ? interpolateName(
                {
                  ...format.data.metadata,
                  ext: formatToExt(format.data.metadata.format),
                },
                format.saveKey
              )
            : basename(result.file);

        const writePath = output + (config.flat ? "" : dirname(result.file) + "/") + name;
        await promises.mkdir(dirname(writePath), { recursive: true });
        await promises.writeFile(writePath, format.data.buffer);
      }
      return result.file;
    }

    return result;
  });

  // Consume empty return values
  for await (const _ of saved);

  task.update(Status.COMPLETE, "Images saved");
}

function interpolateName(metadata: Metadata, name: string): string {
  const expressions = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = EXPRESSION_MATCHER.exec(name)) !== null) {
    expressions.add(match[1]);
  }

  let newName = name;

  for (const expression of expressions) {
    const mappedTemplate = mapTemplate(metadata, expression);

    if (typeof mappedTemplate !== "undefined") {
      newName = newName.replace(new RegExp(`{{${expression}}}`, "g"), String(mappedTemplate));
    }
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
