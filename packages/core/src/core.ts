import {
  Metadata,
  Pipe,
  Pipeline,
  PipelineException,
  PipelineResult,
  PipelineSegment,
  PipeResult,
  PrimitiveValue,
} from "@ipp/common";
import sharp from "sharp";
import { PIPES } from "./pipes";

export async function processPipeline(
  input: Buffer,
  pipeline: Pipeline,
  metadata?: Record<string, PrimitiveValue>
): Promise<PipelineResult[]> {
  const initialMetadata = { ...metadata, ...(await readMetadata(input)) };

  const pipelineChunks = pipeline.map((chunk) => processSegment(input, chunk, initialMetadata));

  return (await Promise.all(pipelineChunks)).flat();
}

async function processSegment(input: Buffer, pipeline: PipelineSegment, metadata: Metadata): Promise<PipelineResult[]> {
  const { pipe, name } = await resolvePipe(pipeline.pipe);

  const result = await processPipe(pipe, input, metadata, name, pipeline.options);

  const nextPipes: Pipeline = Array.isArray(pipeline.then) ? pipeline.then : pipeline.then ? [pipeline.then] : [];
  const results: PipelineResult[] = [];

  for (const item of Array.isArray(result) ? result : [result]) {
    if (pipeline.save) {
      results.push({
        data: item.data,
        metadata: item.metadata,
        save: pipeline.save,
      });
    }

    const nextPipesResults = await Promise.all(nextPipes.map((next) => processSegment(item.data, next, item.metadata)));

    for (const nextItems of nextPipesResults) {
      results.push(...nextItems);
    }
  }

  return results;
}

async function readMetadata(input: Buffer): Promise<Metadata> {
  try {
    const { width, height, channels, format } = await sharp(input).metadata();
    if (!width || !height || !channels || !format) throw new Error("missing properties");
    return {
      width,
      height,
      channels,
      format,
      originalWidth: width,
      originalHeight: height,
      originalFormat: format,
    };
  } catch (err) {
    throw new PipelineException(`Metadata error: ${err.message || err}`);
  }
}

async function resolvePipe(pipe: PipelineSegment["pipe"]): Promise<{ pipe: Pipe; name: string }> {
  try {
    if (typeof pipe === "string") return { pipe: PIPES[pipe], name: pipe };

    if (typeof pipe === "object" && "resolve" in pipe) {
      const importedPipe = await import(pipe.resolve);
      if (pipe.module) return { pipe: importedPipe[pipe.module], name: `${pipe.resolve}.${pipe.module}` };
      return { pipe: importedPipe, name: pipe.resolve };
    }

    if (typeof pipe === "function") return { pipe, name: "[Function]" };

    throw "No resolution scheme for: ";
  } catch (err) {
    throw new PipelineException(
      `Could not resolve pipe: ${
        typeof pipe === "object" ? `${pipe.resolve}${pipe.module ? `.${pipe.module}` : ""}` : pipe
      }`
    );
  }
}

async function processPipe(
  pipe: Pipe,
  input: Buffer,
  metadata: Metadata,
  name: string,
  options?: any
): Promise<PipeResult | PipeResult[]> {
  try {
    const result = await pipe(input, metadata, options);
    return result;
  } catch (err) {
    throw new PipelineException(`[${name}] ${err.message}`);
  }
}
