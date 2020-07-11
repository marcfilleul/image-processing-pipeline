import {
  DataObject,
  Metadata,
  Pipe,
  Pipeline,
  PipelineBranch,
  PipelineException,
  PipelineFormats,
  PipelineResult,
  PrimitiveValue,
} from "@ipp/common";
import sharp from "sharp";
import { hash } from "./hash";
import { PIPES } from "./pipes";

/**
 * Takes an input buffer and pipeline schema, and runs the buffer recursively
 * through the pipeline, returning all output formats that were marked to be saved.
 *
 * Internally uses a heavily recursive and parallel iteration that will walk through
 * the pipeline schema, returning an array of all generated results in order of
 * definition.
 */
export async function executePipeline(
  pipeline: Pipeline,
  source: Buffer,
  initialMetadata?: Record<string, PrimitiveValue>
): Promise<PipelineResult> {
  const metadata = { ...(await generateMetadata(source)), ...initialMetadata } as Metadata;

  const dataObject: DataObject = { buffer: source, metadata };

  const formats = await processPipeline(pipeline, dataObject);
  const formatsWithHash = generateHashes(formats);

  return {
    source: dataObject,
    formats: formatsWithHash,
  };
}

/**
 * Runs the data object through a pipeline, yielding a collection of pipeline results */
async function processPipeline(pipeline: Pipeline, formats: DataObject | DataObject[]): Promise<PipelineFormats> {
  const groupedFormats: Promise<PipelineFormats>[] = [];

  for (const format of wrapInArray(formats)) {
    for (const branch of pipeline) {
      groupedFormats.push(processBranch(branch, format));
    }
  }

  // Execute all branch/format trees in parallel
  return (await Promise.all(groupedFormats)).flat();
}

/** Runs the data object through a pipeline branch, processing any remaining pipelines */
async function processBranch(branch: PipelineBranch, data: DataObject): Promise<PipelineFormats> {
  const groupedFormats: PipelineFormats = [];

  // Generate the pipe result for the head of the branch
  const { pipe, name } = await resolvePipe(branch.pipe);
  const pipeResults = await processPipe(pipe, data, name, branch.options);

  if (branch.save) {
    const pipeFormats = wrapInArray(pipeResults).map((data) => ({ data, saveKey: branch.save as PrimitiveValue }));
    groupedFormats.push(...pipeFormats);
  }

  // Pass it to a subsequent pipeline
  if (branch.then) {
    groupedFormats.push(...(await processPipeline(branch.then, pipeResults)));
  }

  return groupedFormats;
}

/** Runs the data object through a single pipe */
async function processPipe(
  pipe: Pipe,
  data: DataObject,
  name: string,
  options?: any
): Promise<DataObject | DataObject[]> {
  try {
    return (await pipe(data, options)) as DataObject | DataObject[]; // remove immutable status
  } catch (err) {
    throw new PipelineException(`[${name}] ${err.message}`);
  }
}

/** Calculates some basic initial metadata for the pipeline process, such as the format */
async function generateMetadata(input: Buffer): Promise<Metadata> {
  try {
    const { width, height, channels, format } = await sharp(input).metadata();
    if (!width || !height || !channels || !format) throw new Error("missing properties");
    const inputHash = hash(input);
    return {
      width,
      height,
      channels,
      format,
      hash: inputHash,
      originalWidth: width,
      originalHeight: height,
      originalFormat: format,
      originalHash: inputHash,
    };
  } catch (err) {
    throw new PipelineException(`Metadata error: ${err.message || err}`);
  }
}

/** Dynamically attempts to resolve the given pipe using the import() function */
async function resolvePipe(pipe: PipelineBranch["pipe"]): Promise<{ pipe: Pipe; name: string }> {
  try {
    if (typeof pipe === "string") return { pipe: PIPES[pipe], name: pipe };

    if (typeof pipe === "object" && pipe !== null && "resolve" in pipe) {
      const importedPipe = await import(pipe.resolve);
      if (pipe.module) return { pipe: importedPipe[pipe.module], name: `${pipe.resolve}.${pipe.module}` };
      return { pipe: importedPipe, name: pipe.resolve };
    }

    if (typeof pipe === "function") return { pipe, name: pipe.name || "[Function]" };

    throw new PipelineException("Unknown pipe resolution scheme");
  } catch (err) {
    if (err instanceof PipelineException) throw err;
    throw new PipelineException(`Could not resolve pipe: ${pipe}`);
  }
}

/** Computes hashes for each pipeline format */
function generateHashes(results: PipelineFormats): PipelineFormats {
  return results.map((f) => ({
    ...f,
    data: {
      ...f.data,
      metadata: {
        ...f.data.metadata,
        hash: hash(f.data.buffer),
      },
    },
  }));
}

/** Wraps an item in an array, or returns the item if it is an array
 *
 * @example
 * wrapInArray(obj) === obj instanceof Array ? obj : [obj]
 */
function wrapInArray<T>(obj: T): T extends any[] ? T : T[] {
  return ((obj instanceof Array ? obj : [obj]) as unknown) as T extends any[] ? T : [T];
}
