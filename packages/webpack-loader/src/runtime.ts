import { ManifestItem, mapManifest, Metadata, Pipeline } from "@ipp/common";
import { processPipeline } from "@ipp/core";
import { interpolateName } from "loader-utils";
import { join } from "path";
import { loader } from "webpack";
import { Options } from "./options";

export interface SimpleExport {
  width?: number;
  height?: number;
  src?: string;
  srcset: Record<string, string>;
}

export type ManifestExport = ManifestItem;

/**
 * The main processing function for the loader. Sends the source through `@ipp/core`
 * and emits the results to webpack. Returns a list of srcset entries or mapped metadata
 * depending on the options passed to the loader.
 *
 * @param ctx The `this` context of the webpack loader
 * @param options The loader options
 * @param source The `raw` image source for the loader to process
 */
export async function runtime(
  ctx: loader.LoaderContext,
  options: Options,
  source: Buffer
): Promise<SimpleExport | ManifestExport> {
  const fullBuild = ctx.mode === "production" || options.devBuild;

  const results = await processPipeline(
    source,
    fullBuild ? options.pipeline : ([{ pipe: "passthrough", save: true }] as Pipeline),
    { originalPath: ctx.resourcePath }
  );

  const resultsWithFiles = results.map((result) => {
    // Run the generate file through the webpack interpolateName() utility
    const filename = generateFilename(ctx, options, result.data);

    // Register the generated file with webpack
    ctx.emitFile(join(options.outputPath, filename), result.data, null);
    return {
      ...result,
      metadata: { ...result.metadata, path: filename },
      file: filename,
    };
  });

  if (typeof options.manifest !== "undefined") {
    // Manifest mode: allow custom metadata mapping
    return mapManifest(results, options.manifest);
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

    const width = results[0]?.metadata?.originalWidth as number;
    const height = results[0]?.metadata?.originalHeight as number;

    return { srcset: mimeMap, width, height };
  }
}

/** Generates the resulting filename using webpack's loader utilities */
function generateFilename(ctx: loader.LoaderContext, options: Options, source: Buffer) {
  return interpolateName(ctx, options.name, {
    context: options.context || ctx.rootContext,
    content: source,
    regExp: options.regExp,
  });
}

const MIME_MAP: Record<Metadata["format"], string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

/** A simple extension to MIME converter */
function formatToMime(format: Metadata["format"]): string {
  return MIME_MAP[format] || "application/octet-stream";
}
