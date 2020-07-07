import { Metadata, Pipeline, mapManifest } from "@ipp/common";
import { processPipeline } from "@ipp/core";
import { interpolateName, OptionObject } from "loader-utils";
import { loader } from "webpack";
import { Options } from "./options";

/**
 * The main processing function for the loader. Sends the source through `@ipp/core`
 * and emits the results to webpack.
 *
 * @param ctx The `this` context of the webpack loader
 * @param options The loader options
 * @param source The `raw` image source for the loader to process
 */
export async function runtime(ctx: loader.LoaderContext, options: Options, source: Buffer): Promise<string> {
  const results = await processPipeline(source, (options.pipeline as unknown) as Pipeline[]);

  const resultsWithFiles = results.map((result) => {
    // Run the generate file through the webpack interpolateName() utility
    const filename = generateFilename(ctx, (options as unknown) as OptionObject, result.data);

    // Register the generated file with webpack
    ctx.emitFile(filename, result.data, null);
    return {
      ...result,
      file: filename,
    };
  });

  if (typeof options.manifest !== "undefined") {
    // Manifest mode: allow custom metadata mapping
    return serialiseResult(mapManifest(results, options.manifest));
  } else {
    // Simple mode: build srcset strings
    const srcset: Record<string, [string, number][]> = {};

    for (const result of resultsWithFiles) {
      const mime = formatToMime(result.metadata.format);
      if (typeof srcset[mime] === "undefined") srcset[mime] = [];

      srcset[mime].push([result.file, result.metadata.width]);
    }

    const mimeMap: Record<string, string> = {};
    for (const [key, value] of Object.entries(srcset)) {
      mimeMap[key] = value.map(([f, w]) => `${f} ${w}w`).join(", ");
    }

    return serialiseResult(mimeMap);
  }
}

function generateFilename(ctx: loader.LoaderContext, options: OptionObject, source: Buffer) {
  return interpolateName(ctx, "[contenthash].[ext]", {
    context: options.context || ctx.rootContext,
    content: source,
    regExp: options.regExp,
  });
}

/** Serialise the result into a CommonJS module syntax */
function serialiseResult(obj: any): string {
  return `module.exports = ${JSON.stringify(obj)}`;
}

const MIME_MAP: Record<Metadata["format"], string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

function formatToMime(format: Metadata["format"]): string {
  return MIME_MAP[format] || "application/octet-stream";
}
